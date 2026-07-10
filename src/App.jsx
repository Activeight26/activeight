import { useRef, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router";
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
 * The header's List|Map segmented control is navigation: it reflects
 * the current path and navigates on tap.
 * ================================================================== */
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef(null);

  const view = location.pathname === "/map" ? "map" : "list";

  const handleScroll = () => {
    const y = scrollRef.current?.scrollTop ?? 0;
    setScrolled(y > 4);
  };

  return (
    <>
      <Header
        view={view}
        onViewChange={(next) => navigate(next === "map" ? "/map" : "/")}
        mapEnabled={true}
        scrolled={scrolled}
      />
      <div ref={scrollRef} onScroll={handleScroll} style={styles.content}>
        <Routes>
          <Route path="/" element={<ListView sport={SPORT} country={COUNTRY} />} />
          <Route path="/map" element={<MapView sport={SPORT} country={COUNTRY} />} />
          <Route path="/venue/:slug" element={<VenuePage />} />
        </Routes>
      </div>
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
};
