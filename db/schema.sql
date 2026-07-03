-- VENUES
-- universal info
create table venues (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  location      geography(Point, 4326),   -- lat/lng
  city          text,
  region        text,
  country       text,                     -- filter dial #2
  sport         text,                     -- filter dial #1
  -- universal contact (every sport, every card)
  website       text,
  instagram     text,
  facebook      text,
  email         text,
  phone         text,
  -- sport-specific detail — NEVER a column
  sport_data    jsonb default '{}'::jsonb,
  -- verification-first lifecycle
  status        text default 'unverified',  -- unverified | live | closed
  last_verified date,
  verified_by   text,
  source        text,                     -- 'osm' | 'manual'
  season_open   text,
  season_close  text,
  osm_id        text unique,
  notes_private text,
  created_at    timestamptz default now()
);

-- the spatial index that makes "nearest" queries fast
create index venues_location_idx on venues using gist(location);

-- PENDING_EDITS
create table pending_edits (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid references venues(id) on delete cascade,
  field         text,                     -- which field the edit targets
  suggested_value text,                   -- the proposed new value
  submitted_by  text,                     -- optional: who suggested it
  note          text,                     -- optional free-text context
  status        text default 'pending',   -- pending | accepted | rejected
  created_at    timestamptz default now()
);

create index pending_edits_venue_idx on pending_edits(venue_id);

-- RLS RULES
-- turn on RLS for both tables
alter table venues enable row level security;
alter table pending_edits enable row level security;

-- public may READ only live venues
create policy "public reads live venues"
  on venues for select
  using (status = 'live');

-- public may SUBMIT an edit suggestion, but not read the edit queue
create policy "public can suggest edits"
  on pending_edits for insert
  with check (true);

-- GRANT
-- Grant API access to the venues table
-- anon (public visitors) may read; RLS still restricts them to status='live'
grant select on table public.venues to anon;
grant select, insert, update, delete on table public.venues to authenticated;

-- Grant API access to pending_edits
-- anon may INSERT edit suggestions only; authenticated (you, later) can manage
grant insert on table public.pending_edits to anon;
grant select, insert, update, delete on table public.pending_edits to authenticated;