import { useState } from "react";
import Header from "./Header";
import ListView from "./views/ListView";
 
const SPORT = "wakeboard";
const COUNTRY = "SE";
 
export default function App() {
  /* Which result view is showing. "map" isn't buildable yet, so the
   * Header's Map tab is disabled (mapEnabled={false}) and this only
   * ever holds "list" for now — but the state + wiring are in place so
   * enabling Map later is a one-line change, not a restructure. */
  const [view, setView] = useState("list");
 
  return (
    <>
      <Header view={view} onViewChange={setView} mapEnabled={false} />
      {view === "list" && <ListView sport={SPORT} country={COUNTRY} />}
      {/* {view === "map" && <MapView sport={SPORT} country={COUNTRY} />} */}
    </>
  );
}