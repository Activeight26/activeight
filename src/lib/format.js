/* Meters → display km: one decimal under 10 km, whole numbers above,
 * en dash when distance is unknown (no GPS). */
export function formatDistance(distM) {
  if (distM === undefined || distM === null) return "–";
  const km = distM / 1000;
  return km >= 10 ? String(Math.round(km)) : km.toFixed(1);
}

/* Raw profile value → array of display strings, driven by a sport
 * config's field descriptor (see sports/wakeboard/config.js).
 * [] means "unknown" — the renderer decides whether that shows an
 * Unknown chip (important fields) or hides the row. Unmapped chip
 * values pass through raw so new DB values degrade readably. */
export function formatFieldValues(field, value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value) && value.length === 0) return [];
  switch (field.type) {
    /* An ORDERED set that reads better as a span than as a pile of
     * chips. "beginner, intermediate, advanced" is three chips saying
     * one thing; "Beginner–Advanced" is one chip saying it better —
     * and at scan speed, fewer chips is the whole game.
     *
     * The ordering lives in the sport's config (field.order), never
     * here — this function knows how to collapse a range, not what a
     * rider level is. A future sport with its own graded scale gets
     * this by declaring type:"range" and an order. */
    case "range": {
      const arr = Array.isArray(value) ? value : [value];
      const order = field.order ?? [];
      const map = field.valueLabels || {};

      /* Unknown values can't be positioned in the range, so they're
       * passed through as their own chips rather than silently dropped
       * — same "degrade readably" principle as chips. */
      const known = arr.filter((v) => order.includes(v));
      const unknown = arr.filter((v) => !order.includes(v));

      if (known.length === 0) return unknown.map((v) => map[v] ?? v);

      const sorted = known.sort((a, b) => order.indexOf(a) - order.indexOf(b));
      const lo = sorted[0];
      const hi = sorted[sorted.length - 1];

      /* Note: [low, mid, high] and [low, high] collapse to the SAME
       * string. That's deliberate — the span is what a scanner needs;
       * the middle value adds nothing to "who is this for?". */
      const label = lo === hi
        ? (map[lo] ?? lo)
        : `${map[lo] ?? lo}–${map[hi] ?? hi}`;   // en dash

      return [label, ...unknown.map((v) => map[v] ?? v)];
    }
    case "chips": {
      const arr = Array.isArray(value) ? value : [value];
      const map = field.valueLabels || {};
      return arr.map((v) => map[v] ?? v);
    }
    case "bool":
      return [value ? "Available" : "Not available"];
    case "text":
    default:
      return [field.unit ? `${value} ${field.unit}` : String(value)];
  }
}