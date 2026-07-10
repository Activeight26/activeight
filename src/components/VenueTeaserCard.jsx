import Chip from "./Chip";
import VerificationBadge from "./VerificationBadge";
import { configFor, labelFor, accentFor } from "../sports/registry";
import { formatDistance, formatFieldValues } from "../lib/format";

/* The universal teaser — the card in the list and on a tapped map
 * pin, for every sport. Sport-blind: the sport chip, accent and
 * teaser chips all come from the registry config resolved off
 * venue.sport. Tapping it opens the venue's dedicated page (the
 * caller supplies onOpen and navigates).
 *
 * Expects a teaser row from useNearbyVenues (venue.profile holds the
 * sport profile; config.teaserFields pick what to show from it). */
export default function VenueTeaserCard({ venue, onOpen }) {
  const config = configFor(venue.sport);
  const accentColor = accentFor(venue.sport);

  return (
    <div
      style={styles.card}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(); } }}
    >
      <div style={styles.topRow}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.name}>{venue.name}</div>
          <div style={styles.city}>{venue.city}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span style={styles.distance}>{formatDistance(venue.dist_m)}</span>
          <span style={styles.distanceUnit}>km</span>
        </div>
      </div>

      <div style={styles.chipRow}>
        <Chip variant="accent" accentColor={accentColor}>{labelFor(venue.sport)}</Chip>
        {(config?.teaserFields ?? []).map((key) => {
          const field = config.fields.find((f) => f.key === key);
          if (!field) return null;
          const values = formatFieldValues(field, venue.profile?.[key]);
          return values.length === 0
            ? <Chip key={key} variant="unknown">Unknown</Chip>
            : values.map((v, i) => <Chip key={`${key}-${i}`}>{v}</Chip>);
        })}
      </div>

      <VerificationBadge
        verificationSource={venue.verification_source}
        lastVerified={venue.last_verified}
      />
    </div>
  );
}

const styles = {
  card: {
    background: "#FFFFFF",
    border: "0.5px solid #E2E7EC",
    borderRadius: 12,
    padding: "22px 22px",
    fontFamily: "'Inter', system-ui, sans-serif",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(10,14,23,0.04)",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },
  name: { fontSize: 20, fontWeight: 500, color: "#0A0E17", lineHeight: 1.2 },
  city: { fontSize: 15, color: "#5A6A82", marginTop: 4 },
  distance: {
    fontSize: 44,
    fontWeight: 500,
    color: "#0A0E17",
    lineHeight: 0.9,
    letterSpacing: "-0.02em",
  },
  distanceUnit: { fontSize: 17, color: "#5A6A82", marginLeft: 3 },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 },
};
