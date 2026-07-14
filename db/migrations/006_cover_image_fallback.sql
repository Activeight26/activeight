-- ============================================================
-- 006 — COVER IMAGE FALLBACK IN THE TEASER RPC
--
-- Fixes a contract mismatch between the two surfaces.
--
-- Before: the RPC returned an image only where is_cover = true.
-- A venue with photos but no cover flag showed a REAL PHOTO on its
-- venue page (fetchVenue falls back to images[0]) and a PLACEHOLDER
-- on its card. Same venue, two answers.
--
-- After: the RPC prefers the cover, then falls back to the first
-- image by display_order — matching what VenuePage already does.
-- One rule, both surfaces.
--
-- Why a fallback rather than enforcing the flag: images are entered
-- by hand, at speed, and a forgotten is_cover would silently blank a
-- card. Discipline you have to remember is a bug waiting to happen.
--
-- Requires 005. Run once.
-- ============================================================

begin;

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
    /* Prefer the cover, else the first image by display_order.
     * `is_cover desc` puts true before false; the partial unique index
     * guarantees at most one true, so the ordering is unambiguous.
     * This mirrors fetchVenue()'s fallback exactly — the teaser and the
     * venue page must never disagree about whether a venue has a photo. */
    (select i.image_url
       from public.venue_images i
      where i.venue_id = v.id
      order by i.is_cover desc, i.display_order asc
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

-- Dropping a function drops its grants.
grant execute on function public.nearby_venues(
  double precision, double precision, text, text
) to anon, authenticated;

commit;

notify pgrst, 'reload schema';