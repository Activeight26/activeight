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
