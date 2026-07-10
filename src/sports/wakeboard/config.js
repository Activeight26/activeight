/* Wakeboard display config — the sport's entire UI contribution.
 * Adding a sport = a folder with one of these + a profile table in
 * the DB + a CASE branch in the nearby_venues RPC. No components.
 *
 * Field shape (rendered by the universal renderer, in array order):
 *   key          column in the sport's profile table (venue.profile[key])
 *   label        row label
 *   type         "chips" (multi-value) | "text" (single value) | "bool"
 *   unit         appended to text values ("m" → "180 m")
 *   important    empty + important → "Unknown" chip; empty otherwise → row hidden
 *   valueLabels  raw DB value → display string (chips); unmapped values
 *                pass through raw so new DB values degrade readably
 *
 * `extras` is the escape hatch for sport-specific custom UI (e.g. a
 * wind compass component). The venue page renders whatever is listed
 * here after the field rows — the page itself stays sport-blind. */
export default {
  sport: "wakeboard",
  label: "Wakeboarding",
  category: "water",                    // accent comes from CATEGORY_ACCENTS
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
      type: "chips",
      important: true,
      valueLabels: {
        beginner: "beginner",
        intermediate: "intermediate",
        advanced: "advanced",
      },
    },
    {
      key: "obstacle_types",
      label: "Features",
      type: "chips",
      valueLabels: {
        kicker: "kicker",
        rail: "rail",
        box: "box",
        pipe: "pipe",
        pyramid: "pyramid",
        rooftop: "rooftop",
        slider: "slider",
        flatbar: "flatbar",
      },
    },
    { key: "cable_count", label: "Cables", type: "text" },
    { key: "obstacle_count", label: "Obstacles", type: "text" },
    { key: "cable_length_m", label: "Cable length", type: "text", unit: "m" },
  ],
  teaserFields: ["cable_type"],
  extras: [],
};
