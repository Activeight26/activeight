// scripts/import-wakeboard.js
// Pulls Swedish wake parks from OpenStreetMap (Overpass) into the
// venues table as a lead list.
//
// Ownership rules (why this is NOT a blind upsert):
//   - NEW osm_id → insert a full lead row (status='draft', hidden from
//     the public until curated).
//   - EXISTING osm_id → update ONLY raw_osm_tags, the machine-owned
//     archive column. Everything else on an existing row (name, status,
//     links, profile, location fixes) is hand-curated and must never be
//     overwritten by a re-import.
//
// Links are handled SEPARATELY from the venue insert, and the rule is
// "does this venue have a links row?" — not "did I just create it?".
//
// Why: the old version only wrote links immediately after a successful
// venue insert. If that second write failed (network blip, process
// killed), the venue existed with no links, and every later run took the
// "already exists → refresh tags only" path and never retried. The
// venue was permanently missing its website — now the single most
// valuable field in the schema, since it carries everything the schema
// deliberately doesn't store (hours, prices, season, rentals).
//
// Now: any venue with no links row gets one, on any run. A curated links
// row is never touched. This is what makes "safe to re-run" actually true.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Overpass query: wakeboarding + water_ski nodes and ways inside Sweden.
const overpassQuery = `
  [out:json][timeout:60];
  area["ISO3166-1"="SE"][admin_level="2"]->.se;
  (
    node["sport"="water_ski"](area.se);
    way["sport"="water_ski"](area.se);
    node["sport"="wakeboarding"](area.se);
    way["sport"="wakeboarding"](area.se);
  );
  out center;
`;

// Try mirrors first; the primary overpass-api.de is currently rejecting
// programmatic requests with 406. Falls through the list until one works.
const ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

async function fetchOverpass() {
  for (const url of ENDPOINTS) {
    try {
      console.log(`Trying ${url} ...`);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Activeight/0.1 (venue import script; contact: danteworkflow@gmail.com)',
        },
        body: 'data=' + encodeURIComponent(overpassQuery),
      });

      if (!res.ok) {
        console.warn(`  ${url} returned ${res.status} ${res.statusText} — trying next.`);
        continue;
      }
      console.log(`  Success from ${url}`);
      return await res.json();
    } catch (err) {
      console.warn(`  ${url} failed: ${err.message} — trying next.`);
    }
  }
  throw new Error('All Overpass endpoints failed.');
}

/* OSM tags → the link fields this product actually uses.
 *
 * Only `website`. Phone and email are deliberately NOT imported: this is
 * a discovery layer, not a contact directory, and the venue's own site
 * carries them. A field that isn't shown is a field that rots unseen.
 *
 * Returns null when there's nothing worth writing, so we don't create
 * empty links rows that render an empty "Links" section. */
function linksFromTags(tags) {
  const website = tags.website || tags['contact:website'] || null;
  if (!website) return null;
  return { website };
}

async function run() {
  console.log('Querying Overpass for Swedish wake parks...');

  const data = await fetchOverpass();
  const elements = data.elements || [];
  console.log(`Overpass returned ${elements.length} element(s).`);

  // One round trip: which osm_ids do we already have?
  const { data: existing, error: existingError } = await supabase
    .from('venues')
    .select('id, osm_id')
    .not('osm_id', 'is', null);
  if (existingError) throw new Error(`Could not read existing venues: ${existingError.message}`);
  const existingByOsmId = new Map(existing.map((v) => [v.osm_id, v.id]));

  // One round trip: which venues already have a links row? Anything NOT
  // in this set is a candidate for backfill, no matter how old it is.
  const { data: linkRows, error: linksReadError } = await supabase
    .from('venue_links')
    .select('venue_id');
  if (linksReadError) throw new Error(`Could not read venue_links: ${linksReadError.message}`);
  const venuesWithLinks = new Set(linkRows.map((r) => r.venue_id));

  let inserted = 0;
  let refreshed = 0;
  let linksWritten = 0;
  let linksFailed = 0;
  let skipped = 0;

  /* Write a links row ONLY if the venue has none. An existing row is
   * curated — hand-checked, possibly pointing at a sport subpage rather
   * than a homepage — and is never overwritten by OSM. */
  async function backfillLinks(venueId, name, tags) {
    if (venuesWithLinks.has(venueId)) return;

    const links = linksFromTags(tags);
    if (!links) return;

    const { error } = await supabase
      .from('venue_links')
      .insert({ venue_id: venueId, ...links });

    if (error) {
      linksFailed++;
      console.error(`  Failed to write links for "${name}":`, error.message);
      console.error(`    → will be retried on the next run (venue has no links row).`);
      return;
    }

    venuesWithLinks.add(venueId);
    linksWritten++;
    console.log(`  Wrote links: ${name} → ${links.website}`);
  }

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const tags = el.tags || {};

    if (lat == null || lng == null) { skipped++; continue; }
    const name = tags.name;
    if (!name) { skipped++; continue; }

    const osmId = `${el.type}/${el.id}`;
    const existingId = existingByOsmId.get(osmId);

    if (existingId) {
      // Curated row: refresh the machine-owned archive only.
      const { error } = await supabase
        .from('venues')
        .update({ raw_osm_tags: tags })
        .eq('id', existingId);
      if (error) {
        console.error(`  Failed to refresh tags for "${name}":`, error.message);
      } else {
        refreshed++;
        console.log(`  Refreshed tags: ${name}`);
      }

      // Backfill links if this venue somehow has none — this is what
      // makes a failed links write on an earlier run self-healing.
      await backfillLinks(existingId, name, tags);
      continue;
    }

    // New lead: full insert, hidden as draft until curated.
    const { data: created, error } = await supabase
      .from('venues')
      .insert({
        name,
        location: `POINT(${lng} ${lat})`,
        sport: 'wakeboard',
        country: 'SE',
        source: 'osm',
        status: 'draft',
        osm_id: osmId,
        raw_osm_tags: tags,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Failed to insert "${name}":`, error.message);
      continue;
    }

    inserted++;
    console.log(`  Inserted draft: ${name}`);

    // Same call as the existing-venue path. If it fails here, the venue
    // still has no links row, so the next run picks it up.
    await backfillLinks(created.id, name, tags);
  }

  console.log(
    `\nDone. Inserted ${inserted} new draft(s), refreshed tags on ${refreshed}, ` +
    `wrote links for ${linksWritten}, skipped ${skipped} (no name/coords).`
  );
  if (linksFailed > 0) {
    console.log(`${linksFailed} links write(s) failed — re-run the script to retry them.`);
  }
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});