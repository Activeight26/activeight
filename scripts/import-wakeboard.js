// scripts/import-wakeboard.js
// Pulls Swedish wake parks from OpenStreetMap (Overpass) into the
// venues table as a lead list.
//
// Ownership rules (why this is NOT a blind upsert):
//   - NEW osm_id → insert a full lead row (status='draft', hidden from
//     the public until curated) + a venue_links row from the OSM tags.
//   - EXISTING osm_id → update ONLY raw_osm_tags, the machine-owned
//     archive column. Everything else on an existing row (name, status,
//     links, profile, location fixes) is hand-curated and must never be
//     overwritten by a re-import.
// Safe to re-run any time.

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

  let inserted = 0;
  let refreshed = 0;
  let skipped = 0;

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

    const website = tags.website || tags['contact:website'] || null;
    const phone = tags.phone || tags['contact:phone'] || null;
    if (website || phone) {
      const { error: linksError } = await supabase
        .from('venue_links')
        .insert({ venue_id: created.id, website, phone });
      if (linksError) {
        console.error(`  Inserted "${name}" but failed to write links:`, linksError.message);
      }
    }

    inserted++;
    console.log(`  Inserted draft: ${name}`);
  }

  console.log(`\nDone. Inserted ${inserted} new draft(s), refreshed tags on ${refreshed}, skipped ${skipped} (no name/coords).`);
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
