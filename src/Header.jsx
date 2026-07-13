import { useState } from "react";
import { Menu, X } from "lucide-react";

/* ================================================================== *
 * Header
 * ------------------------------------------------------------------ *
 * Sticky top chrome. The document scrolls natively; the header sticks
 * to the top of the viewport as it goes.
 *
 * (It was previously a plain flex item inside a fixed-height app shell.
 * That shell was removed — it never fixed the mobile-Safari map gap it
 * was introduced for, and it created a second competing scroller that
 * broke list scrolling and detached the header. Native scroll is back.)
 *
 * One row: logo + wordmark (left), hamburger menu (right).
 *
 * The List|Map segmented control used to live here as a second row. It
 * moved OUT to a floating pill in App.jsx — header chrome is expensive
 * on this screen, because the metric that matters is how many cards land
 * above the fold, and that second row cost most of a card.
 * ================================================================== */
export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={styles.header}>
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