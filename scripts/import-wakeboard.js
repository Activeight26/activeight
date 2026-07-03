// scripts/import-wakeboard.js
// Pulls Swedish wake parks from OpenStreetMap (Overpass) and writes them
// into the venues table as status='unverified' — a lead list, never live data.
// Safe to re-run: upserts on osm_id, so re-runs update rather than duplicate.

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

  let inserted = 0;
  let skipped = 0;

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const tags = el.tags || {};

    if (lat == null || lng == null) { skipped++; continue; }
    const name = tags.name;
    if (!name) { skipped++; continue; }

    const row = {
      name,
      location: `POINT(${lng} ${lat})`,
      sport: 'wakeboard',
      country: 'SE',
      source: 'osm',
      status: 'unverified',
      sport_data: {},
      osm_id: `${el.type}/${el.id}`,
      website: tags.website || tags['contact:website'] || null,
      phone: tags.phone || tags['contact:phone'] || null,
    };

    const { error } = await supabase
      .from('venues')
      .upsert(row, { onConflict: 'osm_id' });

    if (error) {
      console.error(`  Failed to upsert "${name}":`, error.message);
    } else {
      inserted++;
      console.log(`  Upserted: ${name}`);
    }
  }

  console.log(`\nDone. Upserted ${inserted}, skipped ${skipped} (no name/coords).`);
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});