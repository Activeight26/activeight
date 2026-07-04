{/* This code is temporary, it exists to display WakeParkCard. */}

import { useState } from "react";
import WakeParkCard from "./sports/wakeboard/WakeParkCard";

/* Temporary test harness for viewing WakeParkCard against real Lagunen
   data. This whole file gets replaced by ListView later — it only exists
   to render the card in isolation during development. */
const lagunen = {
  name: "Lagunen Wake Park",
  city: "Härryda",
  dist_m: 4200,
  sportLabel: "Wakeboarding",
  last_verified: "2026-07-04",
  website: "https://www.lagunencablepark.se",
  instagram: "https://www.instagram.com/lagunenwakepark/",
  facebook: null,
  phone: null,
  email: null,
  sport_data: {
    cable_type: ["system_2_0"],
    rider_level: ["beginner", "intermediate", "advanced"],
    features: ["kicker", "rail", "box"],
    park_count: 1,
    rental_equipment: true,
    lessons_available: true,
  },
};

export default function App() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ minHeight: "100vh", background: "#EEF1F5", padding: "20px 14px", boxSizing: "border-box", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 440, margin: "0 auto" }}>
        <WakeParkCard
          venue={lagunen}
          variant={expanded ? "full" : "teaser"}
          onToggle={() => setExpanded((v) => !v)}
        />
      </div>
    </div>
  );
}

{/* End of temporary code */}