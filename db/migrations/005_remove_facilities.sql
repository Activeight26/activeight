-- ============================================================
-- 005 — REMOVE FACILITIES & UNMAINTAINABLE PROFILE FIELDS
--
-- Drops venue_facilities entirely, and obstacle_types /
-- obstacle_count / cable_length_m from wakeboard_profiles.
--
-- WHY (this is the point of the migration, not the DDL):
--
-- The audit question for every field is "can I keep this true
-- over time?" — because a stale fact is worse than an absent one
-- when verification IS the product.
--
-- Facilities failed on maintenance cost. Twelve nullable booleans
-- per venue, per sport, is a load that can't be carried honestly
-- by one person. The evidence: across four published venues, ten
-- of twelve columns were null and the two that were filled
-- (rental, lessons) were true almost everywhere — saturated, and
-- therefore carrying no signal on a scan surface. The venue's own
-- website answers these questions and is always current. Routing
-- there is the honest move; it's what a discovery layer is for.
--
-- obstacle_types failed on decay. Parks add and sell features
-- between seasons without announcing it. Keeping the array true
-- would mean per-season research or org contact per venue — or
-- leaning on community edits, which dissolves the meaning of the
-- verified badge. Neither is acceptable, so the field goes.
--
-- obstacle_count and cable_length_m were never populated on any
-- venue. obstacle_count decays with obstacle_types; cable_length_m
-- is a number no rider decides on.
--
-- KEPT: cable_type (uniform across today's four venues, but the
-- single most discriminating field the moment a full-size cable
-- park is added — n=4 is not a population), cable_count, and
-- participant_level.
--
-- Requires 001–004. Run once.
-- ============================================================

begin;

-- ============================================================
-- 1 · RPC — recreate without `facilities`.
--     Return-type changes require DROP first (see 003).
-- ============================================================
drop function if exists public.nearby_venues(
  double precision, double precision, text, text
);

create function public.nearby_venues(
  p_lat     double precision default null,
  p_lng     double precision default null,
  p_sport   text default null,
  p_country text default null
)
returns table (
  id                  uuid,
  slug                text,
  name                text,
  city                text,
  sport               text,
  category            text,
  verification_source text,
  last_verified       date,
  lng                 double precision,
  lat                 double precision,
  dist_m              double precision,
  cover_image_url     text,
  profile             jsonb
)
language sql
stable
as $$
  select
    v.id,
    v.slug,
    v.name,
    v.city,
    v.sport,
    s.category,
    v.verification_source,
    v.last_verified,
    v.lng,
    v.lat,
    case when p_lat is not null and p_lng is not null
         then st_distance(v.location,
                          st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
    end as dist_m,
    (select i.image_url from public.venue_images i
      where i.venue_id = v.id and i.is_cover
      limit 1) as cover_image_url,
    /* Sport profile as a whole-row JSON object, matching the shape
     * fetchVenue() produces for the venue page. Both surfaces speak
     * ONE contract — `profile?.cable_count` — so the same access
     * pattern works in the teaser card and on the slug page.
     *
     * to_jsonb(wp) does not name columns, so adding or removing a
     * profile column flows through to both surfaces without editing
     * this function. A new sport is one more `when` branch. */
    case v.sport
      when 'wakeboard' then
        (select to_jsonb(wp) - 'venue_id' - 'created_at' - 'updated_at'
           from public.wakeboard_profiles wp
          where wp.venue_id = v.id)
    end as profile
  from public.venues v
  join public.sports s on s.sport = v.sport
  where v.status = 'published'
    and (p_sport   is null or v.sport   = p_sport)
    and (p_country is null or v.country = p_country)
  order by dist_m asc nulls last, v.name asc;
$$;

-- Dropping a function drops its grants. Restore exactly what 003
-- granted, plus the Postgres default (execute to public) that
-- comes with any new function.
grant execute on function public.nearby_venues(
  double precision, double precision, text, text
) to anon, authenticated;

-- ============================================================
-- 2 · Drop venue_facilities.
--     CASCADE takes its RLS policy, grants, trigger and FK with it.
-- ============================================================
drop table if exists public.venue_facilities cascade;

-- ============================================================
-- 3 · Trim wakeboard_profiles.
--     The CHECK constraints on the dropped columns go with them.
-- ============================================================
alter table public.wakeboard_profiles
  drop column if exists cable_length_m,
  drop column if exists obstacle_count,
  drop column if exists obstacle_types;

commit;

-- PostgREST caches the schema — without this, the dropped table and
-- the changed RPC signature won't be reflected, which looks exactly
-- like a broken query.
notify pgrst, 'reload schema';