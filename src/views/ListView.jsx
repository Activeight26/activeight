import { useNavigate } from "react-router";
import { useNearbyVenues } from "../lib/useNearbyVenues";
import VenueTeaserCard from "../components/VenueTeaserCard";

/* ================================================================== *
 * ListView
 * ------------------------------------------------------------------ *
 * The first surface: distance-sorted teasers. Sport-agnostic — the
 * teaser card resolves everything sport-shaped from the registry
 * itself. Tapping a teaser navigates to the venue's dedicated page
 * (/venue/:slug); dist_m rides along as router state so the page can
 * show it without re-asking for GPS.
 * ================================================================== */

export default function ListView({ sport = "wakeboard", country = "SE" }) {
  const { venues, loading, error, locationDenied } = useNearbyVenues({ sport, country });
  const navigate = useNavigate();

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.status}>Loading nearby venues…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.status}>Couldn't load venues right now.</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {locationDenied && (
        <div style={styles.locationNote}>
          Location off — showing venues alphabetically.
        </div>
      )}

      {venues.length === 0 ? (
        <div style={styles.status}>No venues yet.</div>
      ) : (
        <div style={styles.grid}>
          {venues.map((venue) => (
            <VenueTeaserCard
              key={venue.id}
              venue={venue}
              onOpen={() =>
                navigate(`/venue/${venue.slug}`, { state: { dist_m: venue.dist_m } })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    background: "transparent",
    padding: "16px 16px 64px",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  locationNote: {
    maxWidth: 640,
    margin: "0 auto 16px",
    fontSize: 13,
    color: "#8B9AB0",
    textAlign: "center",
  },
  grid: {
    maxWidth: 640,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  status: {
    maxWidth: 640,
    margin: "60px auto",
    textAlign: "center",
    fontSize: 15,
    color: "#5A6A82",
  },
};
