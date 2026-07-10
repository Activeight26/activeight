-- ============================================================
-- 002 — DATA MIGRATION (Phase 2)
-- Moves the 7 existing venues into the new shape. Mechanical
-- where the data already exists (sport_data → profiles,
-- contact columns → venue_links); curated values (slug, region,
-- municipality) are keyed on osm_id, which is stable.
-- Requires 001. Run once.
-- ============================================================

-- ---------- curated per-venue fields ----------
update public.venues set
  slug = c.slug, region = c.region, municipality = c.municipality
from (values
  ('node/6751551638', 'vasteras-wake-park',          'Västmanland',     'Västerås'),
  ('way/1489094877',  'lkpg-wake-park',              'Östergötland',    'Linköping'),
  ('way/971428373',   'varnamo-wake-park',           'Jönköping',       'Värnamo'),
  ('way/1423369968',  'lagunen-wake-park',           'Västra Götaland', 'Härryda'),
  ('node/2423252326', 'alvkarleby-vattenskidklubb',  'Uppsala',         'Älvkarleby'),
  ('way/370167443',   'raa-vattenskidklubb',         'Skåne',           'Helsingborg'),
  ('way/116789124',   'gamla-boo-vattenskidklubb',   'Stockholm',       'Nacka')
) as c(osm_id, slug, region, municipality)
where venues.osm_id = c.osm_id;

-- LKPG is the only venue with season data; the season columns are
-- dropped in 004, so stash it in the hand-owned sandbox until a
-- real hours/season feature exists.
update public.venues
set extra_data = extra_data || '{"season": "June–September"}'::jsonb
where osm_id = 'way/1489094877';

-- ---------- sport_data → wakeboard_profiles ----------
-- Old keys → new columns: cable_type stays; park_count (number of
-- cables) → cable_count; features → obstacle_types; rider_level →
-- participant_level. rental_equipment / lessons_available belong
-- to venue_facilities (below), not the profile.
-- Only the 4 published parks carry real sport data; the 3
-- out-of-scope water-ski clubs have empty sport_data and get no
-- profile row.
insert into public.wakeboard_profiles
  (venue_id, cable_type, cable_count, obstacle_types, participant_level)
select
  id,
  case when jsonb_typeof(sport_data->'cable_type') = 'array'
       then array(select jsonb_array_elements_text(sport_data->'cable_type')) end,
  (sport_data->>'park_count')::int,
  case when jsonb_typeof(sport_data->'features') = 'array'
       then array(select jsonb_array_elements_text(sport_data->'features')) end,
  case when jsonb_typeof(sport_data->'rider_level') = 'array'
       then array(select jsonb_array_elements_text(sport_data->'rider_level')) end
from public.venues
where sport = 'wakeboard' and status = 'published';

-- ---------- sport_data booleans → venue_facilities ----------
insert into public.venue_facilities (venue_id, rental, lessons)
select
  id,
  (sport_data->>'rental_equipment')::boolean,  -- null stays null (= unknown)
  (sport_data->>'lessons_available')::boolean
from public.venues
where status = 'published';

-- ---------- contact columns → venue_links ----------
insert into public.venue_links (venue_id, website, instagram, facebook, email, phone)
select id, website, instagram, facebook, email, phone
from public.venues
where coalesce(website, instagram, facebook, email, phone) is not null;

-- ---------- venue_images ----------
-- No images exist yet. Template for later (cover shows in teasers
-- and as the page hero once added):
-- insert into public.venue_images (venue_id, image_url, is_cover, display_order, caption)
-- select id, 'https://…', true, 0, null from public.venues where slug = 'vasteras-wake-park';

-- ---------- sanity checks (read-only, eyeball the output) ----------
select v.slug, v.status, v.verification_source, v.region, v.municipality,
       p.cable_type, p.cable_count, p.obstacle_types, p.participant_level,
       f.rental, f.lessons, l.website, l.instagram
from public.venues v
left join public.wakeboard_profiles p on p.venue_id = v.id
left join public.venue_facilities  f on f.venue_id = v.id
left join public.venue_links       l on l.venue_id = v.id
order by v.status, v.name;
