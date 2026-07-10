import Chip from "./Chip";

/* Facilities — universal in storage (venue_facilities booleans) and
 * universal in rendering. Three-state semantics from the DB:
 *   true  → shown as a chip
 *   false → confirmed absent, not shown
 *   null  → unknown, not shown
 * If nothing is known-true, the whole section disappears. */
const FACILITIES = [
  { key: "parking", label: "Parking" },
  { key: "toilet", label: "Toilet" },
  { key: "shower", label: "Shower" },
  { key: "changing_room", label: "Changing room" },
  { key: "restaurant", label: "Restaurant" },
  { key: "cafe", label: "Café" },
  { key: "shop", label: "Shop" },
  { key: "rental", label: "Rental" },
  { key: "lessons", label: "Lessons" },
  { key: "camping", label: "Camping" },
  { key: "accommodation", label: "Accommodation" },
  { key: "wheelchair_accessible", label: "Wheelchair accessible" },
];

export default function FacilityList({ facilities }) {
  const present = FACILITIES.filter((f) => facilities?.[f.key] === true);
  if (present.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {present.map((f) => <Chip key={f.key}>{f.label}</Chip>)}
    </div>
  );
}
