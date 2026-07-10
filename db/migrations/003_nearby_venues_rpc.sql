-- ============================================================
-- 003 — READ LAYER (Phase 3): nearby_venues RPC, teaser shape
--
-- One call does everything distance-shaped in the DB: filter to
-- published + sport + country, ST_Distance, order by distance
-- (name when no GPS). Returns the teaser contract:
--
--   id, slug, name, city, sport, category, verification_source,
--   last_verified, lng, lat, dist_m, cover_image_url, profile
--
-- `profile` is the venue's whole sport-profile row as jsonb —
-- deliberately NOT sport-specific top-level columns, so the
-- contract never changes as sports are added. JS resolves the
-- config's teaserFields against it. Adding a sport = adding one
-- branch to the CASE below (part of the same migration that
-- creates the sport's profile table).
--
-- security invoker (default): runs as anon, so RLS applies on
-- venues and every child table — the WHERE status='published'
-- is defense in depth, not the only gate.
-- Requires 001 + 002. Safe to re-run.
-- ============================================================

-- Return type changes, so the old function can't be replaced in place.
drop function if exists public.nearby_venues(double precision, double precision, text, text);

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

grant execute on function public.nearby_venues(double precision, double precision, text, text)
  to anon, authenticated;

-- Make PostgREST pick up the new function signature immediately.
notify pgrst, 'reload schema';
