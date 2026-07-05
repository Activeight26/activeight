import { useState, useRef, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { useNearbyVenues } from "../lib/useNearbyVenues";
import { cardFor, labelFor, accentFor } from "../sports/registry";
 
/* ================================================================== *
 * ExpandingCard
 * ------------------------------------------------------------------ *
 * Animates a REAL height change (measured via ref), not a scale-based
 * `layout` transform. Framer Motion's `layout` prop fakes size changes
 * by scaling the whole box during the transition — fine for small
 * deltas, but teaser→full is a big jump (a few lines → eight field
 * rows + contacts + badge), so the in-between scale stretches and
 * blurs the text until the transition ends. Animating `height`
 * directly forces the browser to actually reflow content at every
 * frame instead of transforming it, so text stays crisp throughout.
 * ================================================================== */
function ExpandingCard({ children }) {
  const ref = useRef(null);
  const [height, setHeight] = useState("auto");
 
  useLayoutEffect(() => {
    if (ref.current) setHeight(ref.current.scrollHeight);
  }, [children]);
 
  return (
    <motion.div
      style={{ overflow: "hidden" }}
      animate={{ height }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
    >
      <div ref={ref}>{children}</div>
    </motion.div>
  );
}
 
/* ================================================================== *
 * ListView
 * ------------------------------------------------------------------ *
 * The first surface. Sport-agnostic: it never mentions wakeboarding.
 * It asks the registry for the right card, the right label, and the
 * right accent color, and hands each venue through them.
 *
 * Accordion expand: only one card is "full" at a time. The outer
 * motion.div uses layout="position" (not plain `layout`) so it only
 * translates neighboring cards to make room — no scale, so it can't
 * distort anything itself. The actual height change of the expanding
 * card is handled by ExpandingCard above.
 * ================================================================== */
 
export default function ListView({ sport = "wakeboard", country = "SE" }) {
  const { venues, loading, error, locationDenied } = useNearbyVenues({ sport, country });
  const [expandedId, setExpandedId] = useState(null);
 
  const Card = cardFor(sport);
  const sportLabel = labelFor(sport);
  const accentColor = accentFor(sport);
 
  const handleToggle = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };
 
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
        <div style={styles.status}>No verified venues yet.</div>
      ) : (
        <div style={styles.grid}>
          {venues.map((venue) => {
            const isExpanded = expandedId === venue.id;
            const venueWithLabel = { ...venue, sportLabel };
 
            return (
              <motion.div key={venue.id} layout="position" transition={SPRING}>
                <ExpandingCard>
                  <Card
                    venue={venueWithLabel}
                    variant={isExpanded ? "full" : "teaser"}
                    accentColor={accentColor}
                    onToggle={() => handleToggle(venue.id)}
                  />
                </ExpandingCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
 
const SPRING = { layout: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } };
 
const styles = {
  page: {
    minHeight: "100vh",
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