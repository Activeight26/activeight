import { useState, useRef } from "react";
import Header from "./Header";
import ListView from "./views/ListView";
import MapView from "./views/MapView";

const SPORT = "wakeboard";
const COUNTRY = "SE";

/* ================================================================== *
 * App shell
 * ------------------------------------------------------------------ *
 * #root is a fixed-height flex column (see index.css). This lays out:
 *   [ Header        ]  ← plain flex item, always on top, never scrolls
 *   [ content region ] ← flex:1, fills the rest; scrolls internally
 *
 * The content region is the single scroll container for the whole app.
 * ListView scrolls its cards inside it; MapView fills it exactly. This
 * replaces the old page-scroll + sticky-header model, which interacted
 * badly with mobile Safari's viewport height and left a gap under the
 * map. Nothing scrolls the window anymore.
 * ================================================================== */
export default function App() {
  const [view, setView] = useState("list");
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    const y = scrollRef.current?.scrollTop ?? 0;
    setScrolled(y > 4);
  };

  return (
    <>
      <Header
        view={view}
        onViewChange={setView}
        mapEnabled={true}
        scrolled={scrolled}
      />
      <div ref={scrollRef} onScroll={handleScroll} style={styles.content}>
        {view === "list" && <ListView sport={SPORT} country={COUNTRY} />}
        {view === "map" && <MapView sport={SPORT} country={COUNTRY} />}
      </div>
    </>
  );
}

const styles = {
  content: {
    flex: "1 1 auto",
    minHeight: 0,
    /* the app's single scroll container. Map view sets its own child to
     * fill this; list view's content grows and scrolls here. */
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
};