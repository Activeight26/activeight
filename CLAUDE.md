# Activeight — Working Reference

**Read this first. It is not a description of the code — it is the set of
decisions, constraints and traps you cannot infer by reading the code.**

Facts (columns, field descriptors, props, routes) are deliberately NOT restated
here. Restating them is how this file goes stale — the previous version claimed
`venue_facilities` was current after it had been deleted. **Read the source for
facts. Read this for *why*, and for what will bite you.**

**If this file and the code disagree, the code is right and this file is a bug.
Say so, and fix this file in the same change.**

---

## 1 · What the product is

A **location-first sports venue discovery app**. Wakeboarding in Sweden today;
built to add sports and countries without a rewrite.

**It is a discovery layer, not a transaction layer.** Every consequential action —
booking, checking today's hours, contacting a venue — happens on the venue's *own*
site via an outbound link. Activeight never takes a booking or a payment.

This single fact justifies most of what follows. It's why outbound links are
first-class data, why operational facts (hours, prices, seasons, rentals) are
deliberately NOT stored, and why an unverified venue can still be publicly
visible.

**The product's entire value is trustworthiness.** A stale fact is worse than an
absent one. Every venue is hand-confirmed against at least two live sources before
it is published.

---

## 2 · The field test — apply this to every schema decision

Before any field is added, it must pass **both**:

1. **Could it vary across venues in a way that changes a rider's decision?**
2. **Can it be kept true over time, cheaply, by one person?**

Fields that fail #2 do not get added, however interesting they are.

**What this has already cost, and why:**

- **`venue_facilities` (deleted, migration 005).** Twelve nullable booleans per
  venue, per sport, is an unmaintainable load for a solo founder. The evidence:
  across four published venues, ten of twelve columns were null, and the two that
  were filled (`rental`, `lessons`) were true almost everywhere — saturated,
  carrying no signal on a scan surface. The venue's website answers these and is
  always current.
- **`obstacle_types` (deleted, 005).** Parks add and sell features between seasons
  without announcing it. Keeping it true would mean per-season research or org
  contact per venue — or leaning on community edits, which dissolves the meaning
  of the verified badge.
- **`obstacle_count`, `cable_length_m` (deleted, 005).** Never populated. Nothing
  decides on them.
- **Seasons and opening hours (never added).** The highest-decay data there is,
  and it decays *silently*: a confident wrong answer that ruins someone's
  Saturday. The website answers this.
- **`phone` / `email` (no longer imported).** Out of scope. This is not a contact
  directory. The `venue_links` columns still exist but nothing writes or reads
  them.

**Do not propose re-adding any of these.** They were removed knowingly, after
looking at the real data. If a field seems missing, argue it against the two tests
above.

---

## 3 · Sample-size discipline

There are **four published venues**. That is not a population.

A field being uniform or null across those four says **nothing** about whether the
field is worth having. It usually reflects the data-entry backlog, not the field.

Concretely: `cable_type` is `system_2_0` on all four today. It is still one of the
most important fields in the schema, because the moment a full-size cable park is
added it becomes the single biggest discriminator. Same for `booking_url` — null
on all four, and the highest-intent click on the whole site once filled.

**Never cut a column because it's currently empty. Only cut it because it can't be
kept true, or because it's out of scope.**

---

## 4 · Named principles — do not violate

**Silent omission.** Missing fields are omitted. No dashes, no "N/A", no
"Unknown", no substituting a lower-ranked value. A blank space is honest; a
placeholder is noise competing with real signal. This protects the
scan-and-brain-filter loop the whole card design rests on. `ProfileFields` and
`formatFieldValues` enforce it — an empty field produces no row at all.

> The one surviving exception: `formatDistance` returns an en dash when GPS is
> denied. Knowingly kept — with no GPS, *every* card lacks distance, so it reads
> as a mode rather than a data gap. Revisit if it ever looks like a missing value.

**Cards-above-the-fold is the real constraint.** The metric that matters is
*visible cards*, not total list length. Every pixel of header chrome is expensive.

**The slug page is a complement, not a demotion.** `/venue/:slug` is a genuine
second-tier depth surface for someone leaning toward a venue — not a deep-link
fallback. Booking and website links live there, not on the card.

**Sport knowledge lives ONLY in `src/sports/<sport>/`.** Adding a sport should
touch: the new sport folder, one registry line, one `CASE` branch in the RPC.
Nothing else. The moment a view, hook, or card names a wakeboard field, the
extensibility is gone. No `if (sport === …)` in any page, view, or component.

**Verification and visibility are separate axes.** `status` controls who can see
it. `verification_source` controls what the badge says. A published venue can be
unverified — it wears the "Not verified" badge, which is a real state, not a
missing one. `verification_source` is set by hand and is never auto-derived.

**One rule, both surfaces.** The teaser (RPC) and the venue page (`fetchVenue`)
must never disagree about the same venue. They already diverged once on cover
images — the RPC required `is_cover`, the page fell back to the first image, so a
venue could show a photo on its page and a placeholder on its card. Fixed in 006.
When adding anything both surfaces read, make them read it identically.

---

## 5 · Traps — things that will silently break

**Column-level grants on `venues`.** Anon has SELECT on a *column list*, not the
table. `select('*')` returns 403. Every anon query on `venues` must name columns
explicitly. This is intentional — it's what keeps `notes_private`, `osm_id` and
`raw_osm_tags` private — and it is not obvious from reading the client code.

**RLS must be verified through the anon key, never the SQL editor.** The editor
bypasses RLS and will happily show you rows the public cannot see. It will lie to
you. Every RLS claim in this repo was checked with a live anon key, and any new
one must be too.

**Child tables need their own RLS policies.** Every `venue_*` table gates on
`exists (select 1 from venues where id = venue_id and status = 'published')`. A
bare `using(true)` would leak the links and images of hidden venues to anyone
hitting the REST API directly. New child table → new policy, every time.

**Changing an RPC's return type requires DROP, not CREATE OR REPLACE.** Postgres
refuses to replace a function whose `returns table (…)` signature changed. And
dropping a function drops its grants — restore them in the same transaction, or
the app 403s.

**PostgREST caches the schema.** After any DDL, `notify pgrst, 'reload schema';` —
otherwise a correct query returns nothing and looks exactly like a broken one.

**Filename case.** macOS is case-insensitive; Vercel's Linux build is not. An
import that resolves locally can break the deploy. Match case exactly, and use
`git mv` for case-only renames — a plain `mv` won't register with git on macOS.

**`VITE_` prefix discipline.** Only publishable/anon keys get `VITE_`. A
service/secret key with that prefix ships to the browser and bypasses RLS
entirely. The import script's `SUPABASE_SECRET_KEY` must never be `VITE_`-prefixed.

---

## 6 · The two JSONB columns have different owners

- **`raw_osm_tags`** — machine-owned import archive. Written by the import script.
  **Never displayed.** A re-import overwrites it freely.
- **`extra_data`** — human-owned. Read by the UI. A re-import must never touch it.

Keeping them separate is what makes the import safe to re-run without clobbering
curated data.

> ⚠️ `extra_data` is a **staging area for fields being considered for promotion to
> real columns** — not a place facts live permanently. It currently holds
> `{"season": "June–September"}` on LKPG, which fails the field test in §2 and
> should be removed. Nothing else goes in without a plan to promote or delete it,
> or it becomes the schema's blind spot.

---

## 7 · The OSM import is a lead list, not a data source

`scripts/import-wakeboard.js` pulls Swedish wake parks from Overpass.

- **New `osm_id`** → insert as `status='draft'` (hidden). Nothing is ever visible
  on an import alone.
- **Existing `osm_id`** → update `raw_osm_tags` only. Name, status, links, profile
  and any hand-fixed location are curated and must **never** be overwritten by a
  re-import. (Värnamo's website points at a sport subpage, not the domain — that's
  a deliberate curation OSM must not clobber.)
- **Links are keyed on "does this venue have a links row?"**, not "did I just
  create it?" Any venue without one gets a backfill attempt on any run. This is
  what makes re-running actually safe: a failed links write self-heals next time,
  rather than leaving a venue permanently without its `website` — the field now
  carrying everything the schema deliberately doesn't store.

OSM data was tested at world scale and was not shippable: missing parks, dead
venues listed as open, stale everything. It is a to-do list of places to go verify.
Nothing goes live without a human confirming it against at least two live sources.

---

## 8 · Working method

- **Decisions in chat, before any file is touched.** Architecture and design get
  settled in conversation; execution is mechanical afterward.
- **Full file rewrites, not diffs or patches.** Ghost code and lost control of the
  codebase are the failure mode being avoided.
- **One checkpoint at a time**, with the reasoning, not just the change. Flag
  weaknesses proactively.
- **Code before schema.** Fix everything that *reads* a column before dropping it,
  or the app 500s between steps.
- **Verify against real files and real keys.** Two files assumed complete turned
  out to be placeholders. Checking beats assuming.
- **Honest uncertainty over confident wrong answers.** "I'm not sure why this is
  here" is a far better output than a plausible incorrect diagnosis. Say when you
  don't know.
- **Secrets audit before every push:** `git status --short`,
  `git check-ignore -v .env`, `git grep -i "eyJ"`, `git grep "VITE_MAPTILER_KEY"`,
  `git ls-files | grep -iE "\.env|key|secret"`.

---

## 9 · Migrations are notes, not infrastructure

`db/migrations/` is **not a replayable chain** and never will be — `002` seeds a
table that `005` deletes. Do not try to make it replayable; do not rebuild the
database from it.

What it *is*: the annotated record of why the schema is shaped the way it is,
written for the next AI session that reads this repo cold with no memory. **A
migration's comment block is worth more than its DDL.**

Every schema change gets a migration file — not for reproducibility, but so the
next session doesn't helpfully undo it.

> `db/schema.sql` currently contains only the RPC, not a full schema, despite
> older comments calling it canonical. Rebuilding it as a real dump
> (`supabase db dump --schema public`) is deferred until the architecture settles.

---

## 10 · State & horizon

**Now:** 4 published wake parks (Västerås, LKPG, Värnamo, Lagunen). 3 boat-tow
clubs marked `out_of_scope`. No images yet — placeholders are showing, which is
expected. Pre-deploy.

**Next, and it is not code:** cover photos and `short_description` for all four.
After the field cuts, these are the only things distinguishing one card from
another — the profile fields are near-uniform (all four are System 2.0; three of
four span Beginner–Advanced). Descriptions are where personal riding knowledge
lands, and character ("small, mellow, the one to learn at") doesn't decay the way
inventory does.

**Then:** Vercel deploy — needs MapTiler key rotation + domain restriction,
`vercel.json` rewrite for deep-link refresh, and RLS re-verified against the anon
key on production HTTPS.

**Known, unfixed, tabled:**
- `MapView` centers on `venues[0]`, not the user, despite a comment saying
  otherwise. Unclear whether the comment or the code is wrong.
- No catch-all route — a mistyped URL renders a blank browse surface.
- `MapView` (MapTiler + Framer Motion) is eagerly bundled on every route,
  including `/` and `/venue/:slug`. Should be lazy-loaded at the route boundary.
- List ↔ Map switching unmounts the hook and re-acquires GPS + re-runs the RPC.
- The header hamburger opens "Menu — coming soon."

**Expansion order:** more Swedish wake parks → Skatepark → Pump Track → Kitesurf →
Surf. Only then Scandinavia → Europe. **Sports within a country are filled out
before the next country opens. Coverage is the depth axis, not field count.**

**Deliberately deferred:** auth, admin panel, community editing, filters, opening
hours, `venue_verifications` history table. Community editing in particular is not
a "later feature to design around" — it directly conflicts with the verified badge
and needs a trust model that doesn't exist yet.

---

## 11 · Do not, unprompted

- Re-add facilities, obstacle types, seasons, or opening hours (§2).
- Add a per-sport card component. There is one universal config-driven renderer;
  `WakeParkCard.jsx` was deleted for this reason. Do not bring it back.
- Fill a missing value with a dash, "N/A", "Unknown", or a substitute (§4).
- Cut a column because it's currently empty (§3).
- Use `select('*')` on `venues` (§5).
- Add a `type: "bool"` field that renders "Not available" on false. Asserting an
  absence you never verified is the exact failure this product exists to avoid. A
  boolean field renders when true and omits otherwise.
- Suggest TypeScript, tests, or error boundaries as general improvements. If
  something specific is broken, name the specific thing.