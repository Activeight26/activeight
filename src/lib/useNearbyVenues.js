import { useState, useEffect } from "react";
import { supabase } from "./supabase";

/* useNearbyVenues({ sport, country })
 * Gets a GPS fix, calls the nearby_venues RPC, returns published
 * venues of that sport+country as TEASER rows, distance-sorted:
 *
 *   { id, slug, name, city, sport, category, verification_source,
 *     last_verified, lng, lat, dist_m, cover_image_url, profile }
 *
 * `profile` is the venue's sport-profile row as one object (or null);
 * views resolve the sport config's teaserFields against it. On GPS
 * denial the RPC still returns the venues (name-sorted, dist_m null)
 * so the app stays usable. No sport-specific logic lives here.
 *
 * State is one result object keyed on sport|country; "loading" is
 * derived (the result doesn't answer the current key yet) rather than
 * a separate flag set synchronously inside the effect. */
export function useNearbyVenues({ sport, country }) {
  const key = `${sport}|${country}`;
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchVenues(coords, locationDenied) {
      const { data, error } = await supabase.rpc("nearby_venues", {
        p_lat: coords?.lat ?? null,
        p_lng: coords?.lng ?? null,
        p_sport: sport,
        p_country: country,
      });
      if (cancelled) return;
      setResult({
        key: `${sport}|${country}`,
        venues: error ? [] : data ?? [],
        error: error ?? null,
        locationDenied,
      });
    }

    if (!("geolocation" in navigator)) {
      fetchVenues(null, true);
      return () => { cancelled = true; };
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchVenues({ lat: pos.coords.latitude, lng: pos.coords.longitude }, false),
      () => fetchVenues(null, true),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );

    return () => { cancelled = true; };
  }, [sport, country]);

  const loading = result?.key !== key;
  return {
    venues: loading ? [] : result.venues,
    loading,
    error: loading ? null : result.error,
    locationDenied: loading ? false : result.locationDenied,
  };
}