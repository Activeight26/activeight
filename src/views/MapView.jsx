import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { useNearbyVenues } from "../lib/useNearbyVenues";
import { cardFor, labelFor, accentFor } from "../sports/registry";

/* ================================================================== *
 * MapView
 * ------------------------------------------------------------------ *
 * The map surface. Sport-agnostic, same as ListView: it reads the same
 * useNearbyVenues hook and gets the card via cardFor(sport) — it never
 * names wakeboarding. Differences from the list are layout only:
 * venues become pins instead of rows, and a tapped pin slides the card
 * up from the bottom as a sheet instead of expanding in place.
 *
 * Centering: on the user's GPS position when granted; on a Sweden-wide
 * view fitting all pins when denied — so the map is useful either way,
 * mirroring the list's graceful no-location fallback.
 *
 * Pins: a custom logo-style marker (the A8 mark) tinted with the
 * sport's accent color, so the map carries the same brand + category
 * language as the cards.
 * ================================================================== */

const SWEDEN_CENTER = { lng: 15.5, lat: 62.0 }; // rough national centroid
const SWEDEN_ZOOM = 4.2;

export default function MapView({ sport = "wakeboard", country = "SE" }) {
  const { venues, loading, error, locationDenied } = useNearbyVenues({ sport, country });
  const [selected, setSelected] = useState(null);

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const Card = cardFor(sport);
  const sportLabel = labelFor(sport);
  const accentColor = accentFor(sport);

  const apiKey = import.meta.env.VITE_MAPTILER_KEY;

  /* ---- Initialize the map once ---------------------------------- */
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    if (!apiKey) return; // guard: no key → skip init, error shown below

    maptilersdk.config.apiKey = apiKey;

    mapRef.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.STREETS,
      center: [SWEDEN_CENTER.lng, SWEDEN_CENTER.lat],
      zoom: SWEDEN_ZOOM,
      navigationControl: false,
      geolocateControl: false,
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [apiKey]);

  /* ---- Place / refresh markers when venues change --------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || loading || error) return;

    // clear any existing markers first (venues re-fetch on sport/country change)
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    venues.forEach((venue) => {
      if (venue.lat == null || venue.lng == null) return;

      const el = buildPinElement(accentColor);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelected(venue);
        map.flyTo({ center: [venue.lng, venue.lat], zoom: 9, speed: 1.2 });
      });

      const marker = new maptilersdk.Marker({ element: el, anchor: "bottom" })
        .setLngLat([venue.lng, venue.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Fit view: GPS granted → center on user; denied → fit all Swedish pins.
    if (locationDenied && venues.length > 0) {
      const bounds = new maptilersdk.LngLatBounds();
      venues.forEach((v) => {
        if (v.lat != null && v.lng != null) bounds.extend([v.lng, v.lat]);
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 64, maxZoom: 8, duration: 0 });
      }
    } else if (!locationDenied && venues.length > 0) {
      // venues[0] is nearest (hook sorts by distance when GPS is granted)
      const nearest = venues[0];
      if (nearest.lat != null && nearest.lng != null) {
        map.flyTo({ center: [nearest.lng, nearest.lat], zoom: 8, duration: 0 });
      }
    }
  }, [venues, loading, error, locationDenied, accentColor]);

  return (
    <div style={styles.wrap}>
      {!apiKey && (
        <div style={styles.status}>
          Map unavailable — missing MapTiler key.
        </div>
      )}

      {error && (
        <div style={styles.status}>Couldn't load venues right now.</div>
      )}

      <div ref={mapContainer} style={styles.map} />

      {loading && (
        <div style={styles.loadingPill}>Locating…</div>
      )}

      {/* Tapped-pin detail: card centered on a dimmed, scrollable
       * backdrop. When the card is taller than the screen the whole
       * overlay scrolls and the card travels with it (vertical pan of
       * the entire card). Close via the X on the card's corner or by
       * tapping the dim area. */}
      <AnimatePresence>
        {selected && (
          <motion.div
            style={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              style={styles.cardWrap}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelected(null)}
                style={styles.closeBtn}
              >
                <X size={20} />
              </button>
              <Card
                venue={{ ...selected, sportLabel }}
                variant="full"
                accentColor={accentColor}
                onToggle={() => setSelected(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---- Custom logo-style pin ------------------------------------- *
 * A rounded teardrop in the sport accent color with the A8 mark
 * suggested inside. Kept simple so it stays legible at ~34px — the
 * full logo SVG is too detailed at pin size, so this is a purpose-made
 * marker that echoes the brand rather than reproducing it exactly. */
function buildPinElement(accentColor) {
  const el = document.createElement("div");
  el.style.cursor = "pointer";
  el.style.width = "34px";
  el.style.height = "42px";
  el.innerHTML = `
    <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 0C7.6 0 0 7.4 0 16.6 0 28 17 42 17 42s17-14 17-25.4C34 7.4 26.4 0 17 0z"
            fill="${accentColor}"/>
      <circle cx="17" cy="16.5" r="7" fill="#FFFFFF"/>
      <circle cx="17" cy="16.5" r="3.4" fill="${accentColor}"/>
    </svg>`;
  return el;
}

const styles = {
  wrap: {
    position: "relative",
    width: "100%",
    /* Fills App's flex-column content region (the app's scroll area).
     * The header is a plain flex item above that region, so this simply
     * grows to fill whatever height is left — no viewport math needed. */
    flex: "1 1 auto",
    minHeight: 0,
    overflow: "hidden",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  map: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  status: {
    position: "absolute",
    top: 16,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 5,
    background: "#FFFFFF",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 14,
    color: "#5A6A82",
    boxShadow: "0 1px 4px rgba(10,14,23,0.12)",
  },
  loadingPill: {
    position: "absolute",
    top: 16,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 5,
    background: "#FFFFFF",
    borderRadius: 999,
    padding: "8px 16px",
    fontSize: 13,
    color: "#5A6A82",
    boxShadow: "0 1px 4px rgba(10,14,23,0.12)",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    zIndex: 10,
    background: "rgba(10,14,23,0.45)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    overflowY: "auto",
    padding: "24px 16px",
    WebkitOverflowScrolling: "touch",
  },
  cardWrap: {
    position: "relative",
    width: "100%",
    maxWidth: 440,
    margin: "auto",
    flexShrink: 0,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    borderRadius: 999,
    background: "rgba(255,255,255,0.9)",
    color: "#5A6A82",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(10,14,23,0.15)",
  },
};