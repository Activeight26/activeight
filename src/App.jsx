import { Routes, Route, useLocation, useNavigate } from "react-router";
import { Map as MapIcon, List as ListIcon } from "lucide-react";
import Header from "./Header";
import ListView from "./views/ListView";
import MapView from "./views/MapView";
import VenuePage from "./pages/VenuePage";

const SPORT = "wakeboard";
const COUNTRY = "SE";

/* ================================================================== *
 * App + routes
 * ------------------------------------------------------------------ *
 * Native document scrolling. There is no app shell, no fixed-height
 * flex column, and no inner scroll container — the document scrolls,
 * like any normal page. The header is position:sticky.
 *
 * Routes (real URLs — venue pages are shareable, back returns to the
 * surface you came from):
 *   /             list of teasers
 *   /map          map of pins
 *   /venue/:slug  dedicated venue page
 *
 * View switching lives in a floating pill (below), NOT in the header.
 * Header chrome is expensive here: the metric that matters is how many
 * cards land above the fold, and a second header row cost most of a
 * card.
 * ================================================================== */
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const view = location.pathname === "/map" ? "map" : "list";

  /* The pill is a browse-surface switch. On a venue page you're one
   * level deeper than both surfaces — the way out is back, not
   * sideways — so it hides there. */
  const isVenuePage = location.pathname.startsWith("/venue/");

  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<ListView sport={SPORT} country={COUNTRY} />} />
        <Route path="/map" element={<MapView sport={SPORT} country={COUNTRY} />} />
        <Route path="/venue/:slug" element={<VenuePage />} />
      </Routes>

      {/* Floating view switch.
       *
       * position:fixed → pinned to the viewport, so it stays put while
       * the document scrolls beneath it.
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
          {view === "map" ? <ListIcon size={20} /> : <MapIcon size={20} />}
          {view === "map" ? "List" : "Map"}
        </button>
      )}
    </>
  );
}

const styles = {
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
    gap: 9,
    /* Sized on its own terms, not matched to Safari's toolbar — that's a
     * moving target we don't own (it varies by iOS version, collapses on
     * scroll, and differs in other browsers). 52px reads as substantial
     * and clears Apple's 44px minimum touch target comfortably. */
    minHeight: 52,
    padding: "0 26px",
    border: "none",
    borderRadius: 999,
    background: "#0A0E17",
    color: "#FFFFFF",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 16,
    fontWeight: 500,
    cursor: "pointer",
    /* A vertical drag starting on the pill should scroll the page
     * underneath rather than being swallowed by the button. */
    touchAction: "pan-y",
    boxShadow: "0 4px 16px rgba(10,14,23,0.30)",
  },
};