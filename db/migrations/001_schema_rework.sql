-- ============================================================
-- 001 — SCHEMA REWORK (Phase 1)
-- Normalized schema: sports lookup, venue child tables, new
-- venues columns, published/closed+verification model, RLS.
-- Run in the Supabase SQL editor. Idempotence: not guaranteed —
-- run once, on the pre-rework database.
-- ============================================================

-- ---------- extensions ----------
create extension if not exists moddatetime with schema extensions;

-- ============================================================
-- 1 · SPORTS lookup — one row per sport. Category lives HERE,
--     not per venue row (a venue's category is a function of its
--     sport; storing it per venue invites drift).
-- ============================================================
create table public.sports (
  sport      text primary key,          -- 'wakeboard'
  category   text not null,             -- 'water' | 'land' | ...
  label      text not null,             -- 'Wakeboarding'
  created_at timestamptz not null default now()
);

insert into public.sports (sport, category, label)
values ('wakeboard', 'water', 'Wakeboarding');

-- ============================================================
-- 2 · VENUES — new columns
-- ============================================================
alter table public.venues
  add column slug                text unique,
  add column municipality        text,
  add column address             text,
  add column short_description   text,
  add column long_description    text,
  add column verification_source text,               -- null | activeight | community | organization
  add column raw_osm_tags        jsonb,               -- machine-owned import archive; never displayed
  add column extra_data          jsonb not null default '{}'::jsonb, -- hand-owned sandbox; read by UI
  add column updated_at          timestamptz not null default now();

-- Coordinates as plain numbers, derived from the geography point.
-- The RPC and the venue page read these; `location` stays the
-- spatial source of truth (GIST index, ST_Distance).
alter table public.venues
  add column lng double precision generated always as (st_x(location::geometry)) stored,
  add column lat double precision generated always as (st_y(location::geometry)) stored;

-- venues.sport must be a known sport (typo protection).
alter table public.venues
  add constraint venues_sport_fkey foreign key (sport) references public.sports(sport);

-- ---------- status model flip ----------
-- Old: unverified | live | closed | out_of_scope, where 'live'
-- conflated "verified" with "visible". New: status = visibility
-- only (draft | published | closed | out_of_scope), and
-- verification_source = who vouched (independent axis).

-- Drop whatever status CHECK constraint exists (it was added via
-- the SQL editor, not schema.sql, so the name is unknown).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.venues'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.venues drop constraint %I', c.conname);
  end loop;
end $$;

-- Migrate existing values: the 4 'live' venues were verified by us.
update public.venues set verification_source = 'activeight' where status = 'live';
update public.venues set status = 'published' where status = 'live';
update public.venues set status = 'draft'     where status = 'unverified';
-- 'closed' and 'out_of_scope' keep their meaning and stay hidden.

alter table public.venues alter column status set default 'draft';

alter table public.venues
  add constraint venues_status_check
    check (status in ('draft', 'published', 'closed', 'out_of_scope')),
  add constraint venues_verification_source_check
    check (verification_source is null
           or verification_source in ('activeight', 'community', 'organization'));

-- ============================================================
-- 3 · VENUE_LINKS — one row per venue; every outbound contact.
--     (This app is a discovery layer: links carry the real
--     decisions, so they get a clean, validated home.)
-- ============================================================
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

-- ============================================================
-- 4 · VENUE_FACILITIES — one row per venue, one nullable boolean
--     per facility. Deliberately nullable:
--       null = unknown · false = confirmed absent · true = present
--     (rows or text[] can't express unknown-vs-no).
-- ============================================================
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

-- ============================================================
-- 5 · VENUE_IMAGES — many per venue. The cover is the row with
--     is_cover; a partial unique index enforces at most one.
-- ============================================================
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

-- ============================================================
-- 6 · WAKEBOARD_PROFILES — first sport profile. venue_id is the
--     PK (one profile per venue). CHECK constraints on the enum
--     arrays are the point of leaving JSONB: values can't rot.
--     Note: rental/lessons/shop live in venue_facilities, NOT
--     here — one fact, one home.
-- ============================================================
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

-- ============================================================
-- 7 · updated_at triggers
-- ============================================================
create trigger set_updated_at before update on public.venues
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.venue_links
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.venue_facilities
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.wakeboard_profiles
  for each row execute function extensions.moddatetime(updated_at);

-- ============================================================
-- 8 · RLS
-- ============================================================
alter table public.sports             enable row level security;
alter table public.venue_links        enable row level security;
alter table public.venue_facilities   enable row level security;
alter table public.venue_images       enable row level security;
alter table public.wakeboard_profiles enable row level security;

-- venues: visibility flips from "only verified" to "everything
-- except hidden statuses". Unverified venues show, wearing the
-- "Not verified" badge (verification_source is null).
drop policy "public reads live venues" on public.venues;
create policy "public reads published venues"
  on public.venues for select
  using (status = 'published');

-- sports lookup is public reference data.
create policy "public reads sports"
  on public.sports for select
  using (true);

-- Child tables: gate on the parent venue's visibility. A bare
-- using(true) would leak links/images of hidden venues to anyone
-- probing the REST API directly.
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

-- ============================================================
-- 9 · GRANTS
-- ============================================================
-- venues: switch anon from table-level to COLUMN-level select.
-- RLS restricts rows, not columns — under the old table-level
-- grant, notes_private was publicly readable. The column list
-- below is what the public app may see; notes_private, osm_id,
-- raw_osm_tags and verified_by are excluded.
-- (Legacy columns — sport_data, contacts, seasons — stay granted
-- until migration 004 drops them, so the old read path keeps
-- working between phases.)
revoke select on table public.venues from anon;
grant select (
  id, name, slug, sport, country, region, municipality, city,
  location, lng, lat, address, short_description, long_description,
  status, verification_source, last_verified, source, extra_data,
  created_at, updated_at,
  -- legacy, dropped in 004:
  website, instagram, facebook, email, phone, sport_data,
  season_open, season_close
) on public.venues to anon;

grant select on table public.sports             to anon;
grant select on table public.venue_links        to anon;
grant select on table public.venue_facilities   to anon;
grant select on table public.venue_images       to anon;
grant select on table public.wakeboard_profiles to anon;

grant select, insert, update, delete on table public.sports             to authenticated, service_role;
grant select, insert, update, delete on table public.venue_links        to authenticated, service_role;
grant select, insert, update, delete on table public.venue_facilities   to authenticated, service_role;
grant select, insert, update, delete on table public.venue_images       to authenticated, service_role;
grant select, insert, update, delete on table public.wakeboard_profiles to authenticated, service_role;

-- Make PostgREST pick up the new tables/columns/FKs immediately.
notify pgrst, 'reload schema';
