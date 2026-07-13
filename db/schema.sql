-- ---------- NEARBY_VENUES RPC ----------
-- The teaser read path. See db/migrations/003_nearby_venues_rpc.sql
-- for the commented version; body is identical.
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
  facilities          jsonb,
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
    -- Facilities as a whole-row JSON object, matching the shape
    -- fetchVenue() produces for the venue page. Both surfaces speak one
    -- contract — facilities?.rental === true — so the teaser card and
    -- FacilityList use the same access pattern. Three-state booleans are
    -- preserved as-is (true = present, false = confirmed absent,
    -- null = unknown); the RPC never collapses null into false.
    (select to_jsonb(f) - 'venue_id' - 'created_at' - 'updated_at'
       from public.venue_facilities f
      where f.venue_id = v.id) as facilities,
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