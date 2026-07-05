import { useState } from "react";
import { useNearbyVenues } from "./lib/useNearbyVenues";
import { cardFor, labelFor, accentFor } from "./sports/registry";

/* Temporary end-to-end test harness. Proves the real data spine works:
   supabase client → useNearbyVenues → nearby_venues RPC → live rows,
   rendered through the registry-supplied card. Replaced by ListView next. */

const SPORT = "wakeboard";
const COUNTRY = "SE";

export default function App() {
  const { venues, loading, error, locationDenied } = useNearbyVenues({
    sport: SPORT,
    country: COUNTRY,
  });

  // one expanded card at a time; null = all collapsed
  const [expandedId, setExpandedId] = useState(null);

  const Card = cardFor(SPORT);
  const accent = accentFor(SPORT);
  const label = labelFor(SPORT);

  return (
    <div style={{ minHeight: "100vh", background: "#EEF1F5", padding: "20px 14px", boxSizing: "border-box", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 440, margin: "0 auto" }}>

        {/* diagnostic banner — not part of the real UI, just proves state */}
        <div style={{ fontSize: 13, color: "#5A6A82", marginBottom: 16, lineHeight: 1.5 }}>
          <strong>Harness:</strong> {SPORT} / {COUNTRY}<br />
          {loading && "Locating + loading…"}
          {!loading && error && <span style={{ color: "#C0392B" }}>Error: {error.message}</span>}
          {!loading && !error && `${venues.length} venue${venues.length === 1 ? "" : "s"} · ${locationDenied ? "no location (alphabetical)" : "sorted by distance"}`}
        </div>

        {!loading && !error && venues.length === 0 && (
          <div style={{ color: "#5A6A82", fontSize: 14 }}>No live venues returned.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {venues.map((venue) => (
            <Card
              key={venue.id}
              venue={{ ...venue, sportLabel: label }}
              variant={expandedId === venue.id ? "full" : "teaser"}
              accentColor={accent}
              onToggle={() =>
                setExpandedId((cur) => (cur === venue.id ? null : venue.id))
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}