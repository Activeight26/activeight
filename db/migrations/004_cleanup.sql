-- ============================================================
-- 004 — CUT OVER & CLEAN UP (Phase 5)
-- Run ONLY after the app is green end-to-end on the new read
-- path (new RPC, venue pages, list + map). Drops the legacy
-- columns whose data moved in 002. Column-level grants on the
-- dropped columns disappear with them.
--
-- Kept deliberately: osm_id (the import upserts on it), source,
-- notes_private (internal curation; protected by column grants),
-- location + GIST index, pending_edits (untouched, seed of the
-- future admin edit queue).
-- ============================================================

alter table public.venues
  drop column sport_data,     -- → wakeboard_profiles / extra_data
  drop column website,        -- → venue_links
  drop column instagram,      -- → venue_links
  drop column facebook,       -- → venue_links
  drop column email,          -- → venue_links
  drop column phone,          -- → venue_links
  drop column verified_by,    -- → verification_source (identity history is a future venue_verifications table)
  drop column season_open,    -- LKPG's value stashed in extra_data by 002
  drop column season_close;

-- Published venues must be routable: every published row needs a slug.
-- (Not a NOT NULL on the column — drafts may not have one yet.)
alter table public.venues
  add constraint venues_published_needs_slug
    check (status <> 'published' or slug is not null);

-- Make PostgREST pick up the dropped columns immediately.
notify pgrst, 'reload schema';
