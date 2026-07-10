import { supabase } from "./supabase";
import { configFor } from "../sports/registry";

/* The venue page's read path. No distance involved, single venue →
 * plain selects, no RPC (the rule: needs distance → RPC/PostGIS;
 * doesn't → this).
 *
 * Explicit column list because anon has COLUMN-level grants on
 * venues (notes_private etc. are not readable) — a `*` would fail. */
const VENUE_COLUMNS =
  "id, slug, name, sport, country, region, municipality, city, " +
  "address, short_description, long_description, status, " +
  "verification_source, last_verified, extra_data, lng, lat";

/* fetchVenue(slug) → one nested venue object, or null if the slug
 * doesn't exist / isn't published (RLS hides everything else):
 *
 *   { ...venues columns,                      // flat
 *     links:      {...} | null,               // venue_links row
 *     facilities: {...} | null,               // venue_facilities row
 *     images:     [...],                      // ordered by display_order
 *     profile:    {...} | null }              // sport profile row
 *
 * Nested, not flat: sport fields can't collide with venue columns,
 * and the object mirrors the tables it came from. Two round trips
 * (venue+children, then the profile) because the profile table name
 * depends on the fetched sport — kept simple over clever. */
export async function fetchVenue(slug) {
  const { data: venue, error } = await supabase
    .from("venues")
    .select(
      `${VENUE_COLUMNS},
       links:venue_links(*),
       facilities:venue_facilities(*),
       images:venue_images(*)`
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!venue) return null;

  let profile = null;
  const profileTable = configFor(venue.sport)?.profileTable;
  if (profileTable) {
    const { data, error: profileError } = await supabase
      .from(profileTable)
      .select("*")
      .eq("venue_id", venue.id)
      .maybeSingle();
    if (profileError) throw profileError;
    profile = data;
  }

  const { links, facilities, images, ...core } = venue;
  return {
    ...core,
    links: links ?? null,
    facilities: facilities ?? null,
    images: [...(images ?? [])].sort((a, b) => a.display_order - b.display_order),
    profile,
  };
}
