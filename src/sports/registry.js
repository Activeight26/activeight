import WakeParkCard from './wakeboard/WakeParkCard';

/* Category → accent color. The single source of color truth.
 * A sport never names a color directly; it names a category, and the
 * category owns the hex. Add a sport to a category and it inherits the
 * accent for free — that's the whole point of the indirection. */
const CATEGORY_ACCENTS = {
  water: '#38BFFF', // water-blue
  land:  '#2E7D32', // dark green
};

const FALLBACK_ACCENT = CATEGORY_ACCENTS.water;

/* Sport registry. `category` (not a raw color) is what makes accents
 * DRY across a category. `card` is the component the views render for
 * this sport. `active: false` hides a sport entirely until verified. */
export const SPORTS = {
  wakeboard: {
    label:    'Wakeboarding',
    category: 'water',
    card:     WakeParkCard,
    active:   true,
  },
  // skatepark: { label: 'Skatepark', category: 'land', card: SkateParkCard, active: false },
  // ↑ sport #2: drop its folder in, add a line here. category 'land' → dark green, automatically.
};

/* ---- resolvers: views call these, never reach into SPORTS directly -- */

export const cardFor = (sport) => SPORTS[sport]?.card;

export const labelFor = (sport) => SPORTS[sport]?.label ?? sport;

export const accentFor = (sport) =>
  CATEGORY_ACCENTS[SPORTS[sport]?.category] ?? FALLBACK_ACCENT;

export const activeSports = () =>
  Object.entries(SPORTS).filter(([, s]) => s.active);