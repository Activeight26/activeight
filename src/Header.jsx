import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

/* ================================================================== *
 * Header
 * ------------------------------------------------------------------ *
 * Sticky top chrome for the app. Two rows:
 *   1. Brand row  — logo icon + "Activeight" wordmark (left),
 *                   hamburger menu button (right).
 *   2. View switch — a segmented "List | Map" control, built as an
 *                   accessible tab list (role="tablist"). List is the
 *                   active view; Map is present but disabled until the
 *                   Map view is built, so the control reads as honest:
 *                   it doesn't pretend to toggle something that isn't
 *                   there yet.
 *
 * Props:
 *   view       "list" | "map"  — current active view (controlled)
 *   onViewChange(next)          — called when a view tab is activated
 *   mapEnabled  boolean         — false until Map view exists; disables
 *                                 the Map tab and dims it
 * ================================================================== */
/* Respect the OS "reduce motion" setting — the tab transition is
 * disabled when the user has asked for less animation. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export default function Header({ view = "list", onViewChange, mapEnabled = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  /* Show a hairline bottom border only once the user has scrolled, so
   * the header separates from content when floating over it, but sits
   * flush and borderless at the top. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleTab = (next) => {
    if (next === "map" && !mapEnabled) return;
    onViewChange?.(next);
  };

  return (
    <header
      style={{
        ...styles.header,
        borderBottom: scrolled
          ? "0.5px solid #E2E7EC"
          : "0.5px solid transparent",
      }}
    >
      {/* Row 1 — brand + menu */}
      <div style={styles.brandRow}>
        <div style={styles.brand}>
          <img src="/A8_Logo.svg" alt="" style={styles.logo} />
          <span style={styles.wordmark}>Activeight</span>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          style={styles.menuButton}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Row 2 — segmented List | Map control (tabs) */}
      <div style={styles.switchRow}>
        <div
          role="tablist"
          aria-label="Choose result view"
          style={styles.segment}
        >
          <button
            role="tab"
            type="button"
            aria-selected={view === "list"}
            tabIndex={view === "list" ? 0 : -1}
            onClick={() => handleTab("list")}
            style={{
              ...styles.tab,
              transition: reducedMotion ? "none" : styles.tab.transition,
              ...(view === "list" ? styles.tabActive : styles.tabInactive),
            }}
          >
            List
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={view === "map"}
            aria-disabled={!mapEnabled}
            tabIndex={view === "map" ? 0 : -1}
            onClick={() => handleTab("map")}
            style={{
              ...styles.tab,
              transition: reducedMotion ? "none" : styles.tab.transition,
              ...(view === "map" ? styles.tabActive : styles.tabInactive),
              ...(mapEnabled ? {} : styles.tabDisabled),
            }}
          >
            Map
          </button>
        </div>
      </div>

      {/* Placeholder menu sheet — real content (FAQ, About) comes later.
       * Kept as a real toggle so the hamburger isn't a dead control. */}
      {menuOpen && (
        <div style={styles.menuSheet}>
          <span style={styles.menuPlaceholder}>Menu — coming soon</span>
        </div>
      )}
    </header>
  );
}

const styles = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "#f9f9f9",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  brandRow: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  logo: {
    height: 28,
    width: "auto",
    display: "block",
  },
  wordmark: {
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    /* Reversed logo gradient (logo runs light-blue → navy; this runs
     * navy → light-blue) clipped to the text, so the wordmark reads as
     * part of the same brand mark rather than plain text beside it. */
    background: "linear-gradient(90deg, #0E0F39, #76D6EE)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  },
  menuButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    border: "none",
    background: "transparent",
    color: "#0A0E17",
    cursor: "pointer",
    borderRadius: 10,
    flexShrink: 0,
  },
  switchRow: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "0 16px 12px",
    display: "flex",
    justifyContent: "center",
  },
  segment: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 4,
    padding: 4,
    borderRadius: 999,
    background: "#ECEFF2",
    width: "100%",
    maxWidth: 280,
  },
  tab: {
    minHeight: 40,
    border: "none",
    borderRadius: 999,
    background: "transparent",
    font: "inherit",
    fontSize: 15,
    cursor: "pointer",
    color: "#5A6A82",
    transition: "background 0.18s, color 0.18s, box-shadow 0.18s",
  },
  tabActive: {
    background: "#FFFFFF",
    color: "#0A0E17",
    fontWeight: 600,
    boxShadow: "0 1px 3px rgba(10,14,23,0.10)",
  },
  tabInactive: {},
  tabDisabled: {
    color: "#B4BDC9",
    cursor: "not-allowed",
  },
  menuSheet: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "16px",
    borderTop: "0.5px solid #E2E7EC",
  },
  menuPlaceholder: {
    fontSize: 14,
    color: "#8B9AB0",
  },
};
