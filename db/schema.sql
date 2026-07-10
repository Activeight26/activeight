-- ============================================================
-- ACTIVEIGHT — CANONICAL SCHEMA
-- The end state after db/migrations/001–004. This file is the
-- reference for what the database looks like; the migrations are
-- the runnable path from the old schema. A fresh database can be
-- built from this file alone (venues data comes from the OSM
-- import + curation, see scripts/import-wakeboard.js).
--
-- Model in one breath: venues is the universal core; per-sport
-- detail lives in <sport>_profiles tables (one row per venue,
-- CHECK-validated); links / facilities / images are child tables;
-- sports is the lookup that owns category+label; status is pure
-- visibility (draft | published | closed | out_of_scope) and
-- verification_source is who vouched (null = shown as
-- "Not verified"). Public reads status='published' only.
-- ============================================================

create extension if not exists moddatetime with schema extensions;

-- ---------- SPORTS lookup ----------
-- Category lives here once, not per venue row. Adding a sport =
-- one insert here + a <sport>_profiles table + a CASE branch in
-- nearby_venues + a JS config. No venue-table DDL.
create table public.sports (
  sport      text primary key,          -- 'wakeboard'
  category   text not null,             -- 'water' | 'land' | ...
  label      text not null,             -- 'Wakeboarding'
  created_at timestamptz not null default now()
);

insert into public.sports (sport, category, label)
values ('wakeboard', 'water', 'Wakeboarding');

-- ---------- VENUES — universal core ----------
create table public.venues (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text unique,               -- /venue/:slug (required once published)
  sport               text references public.sports(sport),  -- filter dial #1
  country             text,                      -- filter dial #2
  region              text,
  municipality        text,
  city                text,
  location            geography(Point, 4326),    -- spatial source of truth
  lng                 double precision generated always as (st_x(location::geometry)) stored,
  lat                 double precision generated always as (st_y(location::geometry)) stored,
  address             text,
  short_description   text,
  long_description    text,
  -- visibility (NOT verification):
  status              text not null default 'draft'
    check (status in ('draft', 'published', 'closed', 'out_of_scope')),
  -- who vouched (null renders as "Not verified", still visible):
  verification_source text
    check (verification_source is null
           or verification_source in ('activeight', 'community', 'organization')),
  last_verified       date,
  source              text,                      -- 'osm' | 'manual'
  osm_id              text unique,               -- import upsert key — keep
  raw_osm_tags        jsonb,                     -- machine-owned import archive; never displayed
  extra_data          jsonb not null default '{}'::jsonb, -- hand-owned sandbox; read by UI
  notes_private       text,                      -- internal curation; NOT granted to anon
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Published venues must be routable.
alter table public.venues
  add constraint venues_published_needs_slug
    check (status <> 'published' or slug is not null);

-- The spatial index that makes "nearest" fast.
create index venues_location_idx on public.venues using gist(location);

-- ---------- VENUE_LINKS — one row per venue ----------
create table public.venue_links (
  venue_id        uuid primary key references public.venues(id) on delete cascade,
  website         text,
  booking_url     text,
  instagram       text,
  facebook        text,
  youtube         text,
  tiktok          text,
  google_maps_url text,
  email           text,
  phone           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- VENUE_FACILITIES — one row per venue ----------
-- Nullable on purpose: null = unknown, false = confirmed absent.
create table public.venue_facilities (
  venue_id              uuid primary key references public.venues(id) on delete cascade,
  parking               boolean,
  toilet                boolean,
  shower                boolean,
  changing_room         boolean,
  restaurant            boolean,
  cafe                  boolean,
  shop                  boolean,
  rental                boolean,
  lessons               boolean,
  camping               boolean,
  accommodation         boolean,
  wheelchair_accessible boolean,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------- VENUE_IMAGES — many per venue ----------
create table public.venue_images (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid not null references public.venues(id) on delete cascade,
  image_url     text not null,
  is_cover      boolean not null default false,
  display_order int not null default 0,
  caption       text,
  created_at    timestamptz not null default now()
);

create index venue_images_venue_idx on public.venue_images(venue_id);
create unique index venue_images_cover_uidx on public.venue_images(venue_id) where is_cover;

-- ---------- WAKEBOARD_PROFILES — sport profile #1 ----------
-- rental/lessons/shop live in venue_facilities, not here.
create table public.wakeboard_profiles (
  venue_id          uuid primary key references public.venues(id) on delete cascade,
  cable_type        text[]
    check (cable_type <@ array['full_size', 'system_2_0']),
  cable_count       int check (cable_count > 0),
  cable_length_m    int check (cable_length_m > 0),
  obstacle_count    int check (obstacle_count >= 0),
  obstacle_types    text[]
    check (obstacle_types <@ array['kicker', 'rail', 'box', 'pipe', 'pyramid', 'rooftop', 'slider', 'flatbar']),
  participant_level text[]
    check (participant_level <@ array['beginner', 'intermediate', 'advanced']),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- PENDING_EDITS — public edit suggestions ----------
-- Untouched by the rework; seed of a future admin edit queue.
create table public.pending_edits (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid references public.venues(id) on delete cascade,
  field           text,
  suggested_value text,
  submitted_by    text,
  note            text,
  status          text default 'pending',   -- pending | accepted | rejected
  created_at      timestamptz not null default now()
);

create index pending_edits_venue_idx on public.pending_edits(venue_id);

-- ---------- updated_at triggers ----------
create trigger set_updated_at before update on public.venues
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.venue_links
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.venue_facilities
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.wakeboard_profiles
  for each row execute function extensions.moddatetime(updated_at);

-- ---------- RLS ----------
alter table public.venues             enable row level security;
alter table public.sports             enable row level security;
alter table public.venue_links        enable row level security;
alter table public.venue_facilities   enable row level security;
alter table public.venue_images       enable row level security;
alter table public.wakeboard_profiles enable row level security;
alter table public.pending_edits      enable row level security;

create policy "public reads published venues"
  on public.venues for select
  using (status = 'published');

create policy "public reads sports"
  on public.sports for select
  using (true);

-- Children gate on the parent's visibility so hidden venues'
-- links/images/etc. can't be pulled via the REST API directly.
create policy "public reads links of published venues"
  on public.venue_links for select
  using (exists (select 1 from public.venues v
                 where v.id = venue_id and v.status = 'published'));

create policy "public reads facilities of published venues"
  on public.venue_facilities for select
  using (exists (select 1 from public.venues v
                 where v.id = venue_id and v.status = 'published'));

create policy "public reads images of published venues"
  on public.venue_images for select
  using (exists (select 1 from public.venues v
                 where v.id = venue_id and v.status = 'published'));

create policy "public reads wakeboard profiles of published venues"
  on public.wakeboard_profiles for select
  using (exists (select 1 from public.venues v
                 where v.id = venue_id and v.status = 'published'));

create policy "public can suggest edits"
  on public.pending_edits for insert
  with check (true);

-- ---------- GRANTS ----------
-- venues: COLUMN-level select for anon. RLS restricts rows, not
-- columns — a table-level grant would expose notes_private,
-- raw_osm_tags and osm_id, so those are simply not in the list.
grant select (
  id, name, slug, sport, country, region, municipality, city,
  location, lng, lat, address, short_description, long_description,
  status, verification_source, last_verified, source, extra_data,
  created_at, updated_at
) on public.venues to anon;

grant select on table public.sports             to anon;
grant select on table public.venue_links        to anon;
grant select on table public.venue_facilities   to anon;
grant select on table public.venue_images       to anon;
grant select on table public.wakeboard_profiles to anon;
grant insert on table public.pending_edits      to anon;

grant select, insert, update, delete on table public.venues             to authenticated, service_role;
grant select, insert, update, delete on table public.sports             to authenticated, service_role;
grant select, insert, update, delete on table public.venue_links        to authenticated, service_role;
grant select, insert, update, delete on table public.venue_facilities   to authenticated, service_role;
grant select, insert, update, delete on table public.venue_images       to authenticated, service_role;
grant select, insert, update, delete on table public.wakeboard_profiles to authenticated, service_role;
grant select, insert, update, delete on table public.pending_edits      to authenticated, service_role;

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
