import { useRef, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router";
import { Map as MapIcon, List as ListIcon } from "lucide-react";
import Header from "./Header";
import ListView from "./views/ListView";
import MapView from "./views/MapView";
import VenuePage from "./pages/VenuePage";

const SPORT = "wakeboard";
const COUNTRY = "SE";

/* ================================================================== *
 * App shell + routes
 * ------------------------------------------------------------------ *
 * #root is a fixed-height flex column (see index.css). This lays out:
 *   [ Header        ]  ← plain flex item, always on top, never scrolls
 *   [ content region ] ← flex:1, fills the rest; scrolls internally
 *
 * The content region is the single scroll container for the whole app.
 * ListView and VenuePage scroll inside it; MapView fills it exactly.
 *
 * Routes (real URLs — venue pages are shareable, back returns to the
 * surface you came from):
 *   /             list of teasers
 *   /map          map of pins
 *   /venue/:slug  dedicated venue page
 *
 * View switching lives in a floating pill (below), NOT in the header.
 * Header chrome is expensive on this screen: the metric that matters is
 * how many cards land above the fold, and a second header row cost most
 * of a card.
 * ================================================================== */
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef(null);

  const view = location.pathname === "/map" ? "map" : "list";

  /* The pill is a browse-surface switch. On a venue page you're one
   * level deeper than both surfaces — the way out is back, not
   * sideways — so it hides there. */
  const isVenuePage = location.pathname.startsWith("/venue/");

  const handleScroll = () => {
    const y = scrollRef.current?.scrollTop ?? 0;
    setScrolled(y > 4);
  };

  return (
    <>
      <Header scrolled={scrolled} />

      <div ref={scrollRef} onScroll={handleScroll} style={styles.content}>
        <Routes>
          <Route path="/" element={<ListView sport={SPORT} country={COUNTRY} />} />
          <Route path="/map" element={<MapView sport={SPORT} country={COUNTRY} />} />
          <Route path="/venue/:slug" element={<VenuePage />} />
        </Routes>
      </div>

      {/* Floating view switch.
       *
       * position:fixed, and deliberately OUTSIDE the scroll container —
       * inside it, the pill would scroll away with the cards.
       *
       * zIndex 8 is deliberate: above the map (0–5), but BELOW MapView's
       * tapped-pin overlay (zIndex 10). So when a pin is tapped, the
       * overlay covers this pill for free — no cross-component state
       * needed to hide it.
       *
       * The label names the DESTINATION, not the current view: it reads
       * "Map" while you're in the list, "List" while you're in the map.
       * One control, one tap. */}
      {!isVenuePage && (
        <button
          type="button"
          onClick={() => navigate(view === "map" ? "/" : "/map")}
          aria-label={view === "map" ? "Switch to list view" : "Switch to map view"}
          style={styles.viewSwitch}
        >
          {view === "map" ? <ListIcon size={18} /> : <MapIcon size={18} />}
          {view === "map" ? "List" : "Map"}
        </button>
      )}
    </>
  );
}

const styles = {
  content: {
    flex: "1 1 auto",
    minHeight: 0,
    /* the app's single scroll container. Map view sets its own child to
     * fill this; list and venue-page content grow and scroll here. */
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  viewSwitch: {
    position: "fixed",
    left: "50%",
    /* safe-area inset costs nothing in a normal Safari tab and protects
     * the standalone/home-screen case if it ever happens. */
    bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
    transform: "translateX(-50%)",
    zIndex: 8,
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    padding: "0 20px",
    border: "none",
    borderRadius: 999,
    background: "#0A0E17",
    color: "#FFFFFF",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    /* A vertical drag that starts on the pill should scroll the list
     * underneath rather than being swallowed by the button. Taps still
     * register normally. Without this, putting your thumb down on the
     * pill and swiping does nothing — the button eats the gesture. */
    touchAction: "pan-y",
    boxShadow: "0 4px 14px rgba(10,14,23,0.28)",
  },
};