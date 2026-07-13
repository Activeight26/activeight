# Activeight — Architecture & Operation Reference

This document describes **how Activeight works after the database & architecture
rework of July 2026**. It is the source of truth for the current design. If code
and this document disagree, treat it as a bug in one of them and reconcile.

---

## 1. What the product is

Activeight is a **location-first sports venue discovery app**.

- **Launch scope:** wakeboarding, Sweden, distance-sorted list + map.
- **It is a discovery layer, not a transaction layer.** Every consequential
  action (booking, checking live opening hours, contacting a venue) happens on
  the venue's *own* website/socials via an **outbound link**. Activeight never
  takes a booking or payment.
- This single fact justifies several design choices: unverified venues are still
  shown (a slightly-stale listing is low-risk when the real decision happens off
  our site), and the outbound `venue_links` are treated as first-class data.

**Design goals of the rework:** support **~25 sports over time + filters**,
replace per-sport card components with **one config-driven renderer**, and move
from expand-in-place cards to **dedicated, shareable venue pages**. The trade
made knowingly: adding a sport now costs a small migration (a profile table + a
config file) in exchange for clean, validated, filterable data and zero new
components.

---

## 2. Tech stack

- **Frontend:** React 19, Vite 8, react-router (library mode), Framer Motion,
  Lucide React icons, MapTiler SDK.
- **Backend:** Supabase (Postgres + PostGIS). No custom server — the app talks
  to Postgres via Supabase's auto-generated REST/RPC (PostgREST) using the anon
  key. Row-Level Security is the security boundary.
- **Hosting:** Vercel. `vercel.json` rewrites all paths to `index.html` so
  client-side routes (e.g. `/venue/:slug`) survive a hard refresh / deep link.
- **Env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_MAPTILER_KEY` (browser); `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (the OSM
  import script only).

---

## 3. The one-paragraph mental model

`venues` is the universal core (one row per place). Per-sport detail lives in
**separate `<sport>_profiles` tables** (one row per venue, CHECK-validated), not
in a JSONB blob. Outbound links, facilities, and images are their own child
tables. A `sports` lookup table owns each sport's category and label. A venue's
**visibility** (`status`) and **who vouched for it** (`verification_source`) are
two *independent* axes. The public can read only `status='published'` rows. The
frontend fetches a light **teaser** for the list/map (one PostGIS RPC) and a full
**nested object** for the venue page (Supabase nested select). One universal
renderer draws every sport, driven by a per-sport **config file**.

---

## 4. Database schema (current, end state)

> Migrations live in `db/migrations/` (`001`–`004`), applied in order in the
> Supabase SQL editor. `db/schema.sql` is the canonical from-scratch schema and
> matches this section. Migration `004` drops the legacy columns listed in §4.9;
> nothing in the app reads them either way, so the app behaves identically
> whether or not `004` has run yet.

### 4.1 `sports` — lookup table
| column | type | notes |
|---|---|---|
| `sport` | text **PK** | e.g. `wakeboard` |
| `category` | text not null | `water` \| `land` \| … — **owns the accent color** |
| `label` | text not null | display name, e.g. `Wakeboarding` |
| `created_at` | timestamptz | |

Category lives here **once per sport**, never per venue row — that prevents drift
and typos across thousands of venues.

### 4.2 `venues` — universal core
| column | type | notes |
|---|---|---|
| `id` | uuid **PK** | |
| `name` | text not null | |
| `slug` | text **unique** | used in `/venue/:slug`. **Required once published** (CHECK). |
| `sport` | text **FK → sports.sport** | filter dial #1; typo-protected by the FK |
| `country` | text | filter dial #2 (`SE`) |
| `region`, `municipality`, `city` | text | place hierarchy |
| `location` | geography(Point,4326) | **spatial source of truth** (GIST index, `ST_Distance`) |
| `lng`, `lat` | double precision | **generated stored** from `location` (`st_x`/`st_y`). Read by the RPC and the venue page; never written directly. |
| `address` | text | |
| `short_description`, `long_description` | text | |
| `status` | text not null default `draft` | **visibility only**; CHECK ∈ {`draft`,`published`,`closed`,`out_of_scope`} |
| `verification_source` | text | **who vouched**; CHECK null ∨ ∈ {`activeight`,`community`,`organization`} |
| `last_verified` | date | drives the year on the badge |
| `source` | text | `osm` \| `manual` |
| `osm_id` | text **unique** | import upsert key — **keep** |
| `raw_osm_tags` | jsonb | machine-owned archive; **never displayed** |
| `extra_data` | jsonb not null `{}` | human-owned sandbox; **read by UI** |
| `notes_private` | text | internal curation; **NOT granted to anon** |
| `created_at`, `updated_at` | timestamptz | `updated_at` maintained by trigger |

### 4.3 `venue_links` — one row per venue (PK = `venue_id`)
`website, booking_url, instagram, facebook, youtube, tiktok, google_maps_url,
email, phone`. All outbound. This is the app's "transaction layer."

### 4.4 `venue_facilities` — one row per venue (PK = `venue_id`)
One **nullable boolean** per facility: `parking, toilet, shower, changing_room,
restaurant, cafe, shop, rental, lessons, camping, accommodation,
wheelchair_accessible`.
**Three-state semantics — this is important:** `null` = unknown, `false` =
confirmed absent, `true` = present. The UI only shows facilities that are
`true`.

### 4.5 `venue_images` — many rows per venue
`id, venue_id, image_url, is_cover, display_order, caption`. A **partial unique
index** enforces at most one `is_cover = true` per venue. The cover is used as
the teaser/hero image; the rest form the page gallery.

### 4.6 `wakeboard_profiles` — sport profile #1 (PK = `venue_id`)
The pattern every future sport follows. Fields are **CHECK-validated** — this is
the whole point of leaving JSONB:
| column | type | validation |
|---|---|---|
| `cable_type` | text[] | subset of {`full_size`,`system_2_0`} |
| `cable_count` | int | > 0 |
| `cable_length_m` | int | > 0 |
| `obstacle_count` | int | ≥ 0 |
| `obstacle_types` | text[] | subset of {`kicker`,`rail`,`box`,`pipe`,`pyramid`,`rooftop`,`slider`,`flatbar`} |
| `participant_level` | text[] | subset of {`beginner`,`intermediate`,`advanced`} |

**Rental/lessons/shop are NOT here** — they live in `venue_facilities`. One
fact, one home.

### 4.7 `pending_edits` — untouched by the rework
Public-suggested edits queue. Seed of a future admin edit flow.

### 4.8 Row-Level Security (the security boundary)
- `venues`: public reads **`status = 'published'` only**. (Old rule was
  `status = 'live'`.)
- `sports`: public read all (reference data).
- `venue_links` / `venue_facilities` / `venue_images` / `wakeboard_profiles`:
  public reads a row **only if its parent venue is published** (an `EXISTS`
  join). A bare "read all" would leak children of hidden venues via the REST API.
- `pending_edits`: public **insert** only.

### 4.9 Grants — and the notes_private fix
`venues` uses **column-level** `SELECT` for anon (not table-level). RLS filters
*rows*, not *columns*; under the old table-level grant, `notes_private` was
publicly readable. The anon grant lists only public columns — `notes_private`,
`osm_id`, and `raw_osm_tags` are excluded and now return "permission denied."
**Consequence for code:** any anon `SELECT` on `venues` **must name columns
explicitly**; `select('*')` fails. `fetchVenue` already does this.

Migration `004` drops these now-unused legacy columns from `venues`:
`sport_data`, `website`, `instagram`, `facebook`, `email`, `phone`,
`verified_by`, `season_open`, `season_close`.

---

## 5. The verification & visibility model

Two **independent** axes — do not conflate them (the old schema's bug):

- **`status` = is it visible?** `published` shows; `draft`, `closed`,
  `out_of_scope` are hidden by RLS.
- **`verification_source` = who vouched?** `null` \| `activeight` \| `community`
  \| `organization`.

Rules:
- A `published` venue shows **whether or not it is verified**.
- The badge is driven **entirely by `verification_source`** and **always
  renders**. `null` → a **"Not verified"** badge (a real state, not a missing
  one). The other values render their own label + the `last_verified` year.
- `verification_source` is **not derived or auto-maintained**. It is set by hand
  (or a future admin flow). During the migration, the 4 previously-`live` venues
  were stamped `activeight` by an explicit one-time `UPDATE … WHERE status =
  'live'`, because in the old model `live` meant "we verified it."
- New venues imported from OSM land as `status='draft'`,
  `verification_source=null` — hidden until a human curates and publishes them.

---

## 6. Data flow

Two fetch paths, split by **whether distance is needed**:

### 6.1 Teaser (list + map pins) → one RPC
`useNearbyVenues({ sport, country })` (`src/lib/useNearbyVenues.js`) gets a GPS
fix and calls the **`nearby_venues`** RPC, which does everything in the DB:
filter to `published` + sport + country, compute `ST_Distance`, order by distance
(by name when GPS is denied). No JS stitching or sorting.

**RPC signature:** `nearby_venues(p_lat, p_lng, p_sport, p_country)`.
**Returns (the teaser contract):**
`id, slug, name, city, sport, category, verification_source, last_verified,
lng, lat, dist_m, cover_image_url, profile`.

`profile` is **jsonb** — the venue's whole sport-profile row as one object (via a
`CASE` on `sport`). It is deliberately **not** sport-specific top-level columns,
so the contract never changes as sports are added. On GPS denial the RPC still
returns venues (name-sorted, `dist_m` null).

### 6.2 Full venue page → JS assembly by slug
`fetchVenue(slug)` (`src/lib/fetchVenue.js`) — no distance, single venue. One
nested Supabase select pulls `venues` + `venue_links` + `venue_facilities` +
`venue_images`; a second query pulls the sport profile (table name comes from the
sport's config). Returns a **nested** object, or `null` if the slug doesn't exist
/ isn't published (RLS):

```js
{
  // universal venue columns — flat
  id, name, slug, sport, country, region, municipality, city, address,
  short_description, long_description, status, verification_source,
  last_verified, extra_data, lng, lat,
  // related — each its own key
  links:      { website, booking_url, instagram, … } | null,
  facilities: { parking: true, rental: true, … }     | null,
  images:     [ { image_url, is_cover, display_order, caption }, … ],
  profile:    { cable_type: […], cable_count: 2, … } | null,
}
```

Nested (not flat) so sport fields can never collide with venue columns, and the
object mirrors its tables. **Config field `key`s resolve against
`venue.profile[key]`.**

`dist_m` is **not** on the page object — it's computed only in the RPC. The
teaser passes it to the page via **router navigation state**; on a cold deep-link
there is no distance and the distance readout is simply omitted.

---

## 7. Config-driven rendering (the UI extensibility)

There is **one universal renderer**, not one component per sport. A sport
contributes a **config file**, never a component.

### 7.1 Registry — `src/sports/registry.js`
- `CATEGORY_ACCENTS` — the single source of color truth: `water → #38BFFF`,
  `land → #2E7D32`. A sport names a *category*, never a color.
- `SPORTS` — maps each sport key to `{ ...its config, active }`.
- Resolvers (views call these, never touch `SPORTS` directly): `configFor(sport)`,
  `labelFor(sport)`, `accentFor(sport)` (category → hex), `activeSports()`.

### 7.2 Sport config — `src/sports/<sport>/config.js`
Example shape (`wakeboard/config.js`):
```js
export default {
  sport: "wakeboard",
  label: "Wakeboarding",
  category: "water",                  // accent comes from CATEGORY_ACCENTS
  profileTable: "wakeboard_profiles", // tells fetchVenue which table to join
  fields: [
    { key: "cable_type", label: "Cable type", type: "chips", important: true,
      valueLabels: { full_size: "Full-size", system_2_0: "System 2.0" } },
    { key: "cable_count", label: "Cables", type: "text" },
    { key: "cable_length_m", label: "Cable length", type: "text", unit: "m" },
    // …
  ],
  teaserFields: ["cable_type"],       // which fields show on the teaser chip row
  extras: [],                         // optional sport-specific custom components
};
```
Field descriptor keys: `key` (matches a profile column), `label`, `type`
(`chips` | `text` | `bool`), optional `unit`, `important`, and `valueLabels`
(raw DB value → display string; unmapped values pass through raw).

### 7.3 Rendering rules
- **Field types:** `chips` (multi-value array), `text` (single, optional `unit`),
  `bool` (→ "Available" / "Not available"). Formatting lives in
  `formatFieldValues` (`src/lib/format.js`).
- **Empty-field behavior** (`ProfileFields.jsx`): `important: true` + empty →
  show a dashed **"Unknown"** chip (an honest gap); not important + empty → the
  row is **hidden** entirely.
- **The sport chip** (e.g. "Wakeboarding") is rendered separately from
  `venue.sport` + the config label — it is not a profile field.
- **Accent** comes from `accentFor(venue.sport)` → category → hex.
- **`extras`** is the escape hatch: sport-specific custom UI (e.g. a wind
  compass) is a component listed in the config and rendered by `VenuePage` after
  the field rows — so the page stays **sport-blind** (no `if (sport === …)` in
  any page/view).

### 7.4 Universal-vs-config boundary
- **Universal (same for every sport, rendered directly):** name, city, distance,
  cover/gallery, links, facilities, verification badge.
- **Config-driven (differs per sport):** the sport field list.

---

## 8. Routing & navigation

react-router in `src/main.jsx` (`<BrowserRouter>`). Routes in `src/App.jsx`:
| path | component | what |
|---|---|---|
| `/` | `ListView` | distance-sorted teasers |
| `/map` | `MapView` | pins; tapped pin → teaser overlay |
| `/venue/:slug` | `VenuePage` | full dedicated page |

- The header's **List | Map** segmented control reflects the current path and
  navigates on tap (it is navigation, not local tab state).
- Tapping a teaser (from list **or** a map-pin overlay) navigates to
  `/venue/:slug`, passing `dist_m` in navigation state.
- Back from a venue page returns to the surface you came from; a cold deep-link
  falls back to `/`.
- `/venue/:slug` URLs are **shareable and refresh-safe** (that's why `slug`
  exists and why `vercel.json` rewrites to `index.html`).

---

## 9. File map

```
db/
  schema.sql                     canonical from-scratch schema (matches this doc)
  migrations/001…004_*.sql       the applied migration path (run in order)
scripts/
  import-wakeboard.js            OSM → venues import (see §10)
src/
  main.jsx                       BrowserRouter root
  App.jsx                        routes + app shell
  Header.jsx                     brand + List|Map nav (route-driven)
  lib/
    supabase.js                  anon client
    useNearbyVenues.js           teaser fetch hook (calls nearby_venues RPC)
    fetchVenue.js                venue-page fetch (nested select by slug)
    format.js                    formatDistance, formatFieldValues
  sports/
    registry.js                  CATEGORY_ACCENTS, SPORTS, resolvers
    wakeboard/config.js          wakeboard display config
  views/
    ListView.jsx                 list of teasers
    MapView.jsx                  map of pins + teaser overlay
  pages/
    VenuePage.jsx                universal venue page
  components/
    VenueTeaserCard.jsx          universal teaser (list + map overlay)
    ProfileFields.jsx            config-driven sport field rows
    VerificationBadge.jsx        always-on trust badge
    ContactLinks.jsx             outbound links row
    FacilityList.jsx             facility chips
    Chip.jsx                     the atomic value token
```

`WakeParkCard.jsx` **no longer exists** — it was replaced by the universal
renderer. Do not reintroduce per-sport card components.

---

## 10. The OSM import script

`scripts/import-wakeboard.js` pulls Swedish wake parks from OpenStreetMap
(Overpass). **Ownership rules — it is deliberately not a blind upsert:**
- **New `osm_id`** → insert a full lead row as **`status='draft'`** (hidden) plus
  a `venue_links` row from the OSM tags, and store the tags in `raw_osm_tags`.
- **Existing `osm_id`** → update **only `raw_osm_tags`**. Name, status, links,
  profile, and any hand-fixed location are curated and must **never** be
  overwritten by a re-import.

This is safe to re-run any time. (The pre-rework version was destructive — a
re-run would have blanked curated venues; that bug is fixed.)

---

## 11. Invariants — do not break these

1. **Column-level grant on `venues`:** anon `SELECT` must list columns
   explicitly. `select('*')` on `venues` fails for anon.
2. **Published ⇒ slug:** a `published` venue must have a `slug` (DB CHECK). Slugs
   are the venue's URL identity.
3. **`profile` jsonb keys must equal config field `key`s.** Adding a profile
   column that the UI should show means adding a matching config field.
4. **Two JSONB columns, distinct owners:** `raw_osm_tags` is machine-owned and
   **never displayed**; `extra_data` is human-owned and read by the UI. Keep them
   separate so a re-import can never clobber hand-entered data.
5. **Category is per-sport, never per-venue.** It comes from `sports.category` /
   `CATEGORY_ACCENTS`.
6. **`verification_source` is set by hand**, not derived. Do not add logic that
   auto-computes it from other fields.
7. **`dist_m` exists only via the RPC.** The venue page gets it from router
   state, not from a fetch.
8. **Facilities are three-state** (`null`/`false`/`true`). Never treat `null` as
   `false` in storage logic; the UI shows only `true`.
9. **Pages/views stay sport-blind.** Sport-specific UI goes through the config
   (`fields` / `extras`), never an `if (sport === …)` branch in a component.

---

## 12. How to add a new sport

Roughly a 4-step change, no new components:
1. **DB:** `insert into sports (sport, category, label)`; create
   `<sport>_profiles` (PK `venue_id`, CHECK-validated columns); add a `CASE`
   branch for it in the `nearby_venues` RPC so the teaser `profile` is populated.
2. **Config:** add `src/sports/<sport>/config.js` (fields + teaserFields +
   optional extras).
3. **Registry:** add the sport to `SPORTS` in `src/sports/registry.js`
   (`active: true`). Add its category to `CATEGORY_ACCENTS` if new.
4. **Data:** import/curate venues for that sport and publish them.

---

## 13. Current data state (as of the rework)

7 venues total:
- **4 published + `verification_source='activeight'`:** Västerås, LKPG, Värnamo,
  Lagunen wake parks — full profiles, links, facilities migrated.
- **3 `out_of_scope` (hidden):** Älvkarleby, Råå, Gamla Boo water-ski clubs (boat-
  towed, not cable parks).
- **No `venue_images` yet** → covers/heroes fall back to none. This is expected,
  not a bug.
- LKPG's season ("June–September") is stored in `extra_data` (its old
  `season_*` columns are dropped by `004`).

---

## 14. Deferred (intentionally not built yet)

- **Admin panel + Supabase Auth:** an internal view of `draft`/unverified venues
  with an edit-and-publish flow. Needs a second set of admin RLS policies. The
  `draft` status and `pending_edits` table already exist to receive it.
- **`venue_verifications` table:** many-per-venue verification history
  (venue_id, source, verifier, timestamp, note) — will replace the single
  `verification_source` snapshot with a proper log.
- **Opening hours / seasons:** skipped this pass. When needed, either columns on
  `venues` or a `venue_hours` table; empty hours are handled by config (hidden),
  not by a table's existence.
- **Filters:** the normalized, validated schema exists precisely to make
  sport-field and facility filtering possible; the filter UI itself is future
  work.

---

## Verification status

Verification pass (2026-07-10): confirmed via the anon key against the live app —

- RLS row-gating: anon reads only `status='published'`; `out_of_scope` venues hidden.

- Child-table leak test: a hidden venue's `venue_links` unreachable by direct `venue_id`.

- Column-level grant: `select('*')` and `notes_private` denied (42501); granted columns flow.

- Teaser RPC `nearby_venues`: distance sort with coords, name-sort + null `dist_m` on GPS-deny, `profile` keys match `wakeboard/config.js`.

- **Deferred to first Vercel deploy:** deep-link refresh on `/venue/:slug` (vercel.json rewrite), cold-load distance absence, not-found on hidden/nonexistent slug.
