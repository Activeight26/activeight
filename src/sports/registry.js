import wakeboardConfig from "./wakeboard/config";

/* Category → accent color. The single source of color truth.
 * A sport never names a color directly; it names a category, and the
 * category owns the hex. (The DB mirrors this: sports.category lives
 * in the sports lookup table — one row per sport, not per venue.) */
const CATEGORY_ACCENTS = {
  water: "#38BFFF", // water-blue
  land:  "#2E7D32", // dark green
};

const FALLBACK_ACCENT = CATEGORY_ACCENTS.water;

/* Sport registry. Each entry is the sport's display config (see
 * sports/wakeboard/config.js for the shape) plus `active`, which
 * hides a sport entirely until it has verified venues. Adding a
 * sport = drop its folder in, add a line here. */
export const SPORTS = {
  wakeboard: { ...wakeboardConfig, active: true },
};

/* ---- resolvers: views call these, never reach into SPORTS directly -- */

export const configFor = (sport) => SPORTS[sport];

export const labelFor = (sport) => SPORTS[sport]?.label ?? sport;

export const accentFor = (sport) =>
  CATEGORY_ACCENTS[SPORTS[sport]?.category] ?? FALLBACK_ACCENT;

export const activeSports = () =>
  Object.entries(SPORTS).filter(([, s]) => s.active);
