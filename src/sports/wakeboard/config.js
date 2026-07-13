import WakeboardPlaceholder from "./Placeholder";

/* Wakeboard display config — the sport's entire UI contribution.
 * Adding a sport = a folder with one of these + a profile table in
 * the DB + a CASE branch in the nearby_venues RPC. No components.
 *
 * Field shape (rendered by the universal renderer, in array order):
 *   key          column in the sport's profile table (venue.profile[key])
 *   label        row label
 *   type         "chips" (multi-value) | "range" (ordered span) |
 *                "text" (single value) | "bool"
 *   order        for type "range": the values low → high. The formatter
 *                collapses a set to its span ("Beginner–Advanced")
 *                rather than listing every member.
 *   unit         appended to text values ("m" → "180 m")
 *   important    empty + important → "Unknown" chip; empty otherwise → row hidden
 *   valueLabels  raw DB value → display string (chips); unmapped values
 *                pass through raw so new DB values degrade readably
 *
 * `placeholder` is the sport's card artwork — shown in the teaser's
 * photo band when a venue has no real photo. The card asks the config
 * for it and never names a sport, so a new sport supplies its own
 * without touching the card.
 *
 * `extras` is the escape hatch for sport-specific custom UI (e.g. a
 * wind compass component). The venue page renders whatever is listed
 * here after the field rows — the page itself stays sport-blind.
 *
 * NOTE — what is deliberately absent:
 *   obstacle_types / obstacle_count / cable_length_m were removed.
 *   Not because they were uninteresting, but because they cannot be
 *   kept true: parks add and sell features between seasons without
 *   announcing it, and verifying them would require per-season
 *   research or community edits — the exact trade this product
 *   refuses. A stale fact is worse than an absent one.
 *
 *   Facilities (rental, lessons, parking, ...) were removed for the
 *   same reason: twelve booleans per venue per sport is a maintenance
 *   load that can't be carried honestly. The venue's own website
 *   answers those questions and is always current. */
export default {
  sport: "wakeboard",
  label: "Wakeboarding",
  category: "water",                    // accent comes from CATEGORY_ACCENTS
  placeholder: WakeboardPlaceholder,    // card artwork when no photo exists
  profileTable: "wakeboard_profiles",
  fields: [
    {
      key: "cable_type",
      label: "Cable type",
      type: "chips",
      important: true,
      valueLabels: { full_size: "Full-size", system_2_0: "System 2.0" },
    },
    {
      key: "participant_level",
      label: "Rider level",
      type: "range",
      important: true,
      order: ["beginner", "intermediate", "advanced"],
      valueLabels: {
        beginner: "Beginner",
        intermediate: "Intermediate",
        advanced: "Advanced",
      },
    },
    { key: "cable_count", label: "Cables", type: "text" },
  ],
  teaserFields: ["participant_level"],
  extras: [],
};