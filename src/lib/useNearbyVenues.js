import { useState, useEffect } from "react";
import { supabase } from "./supabase";

/* useNearbyVenues({ sport, country })
 * Gets a GPS fix, calls the nearby_venues RPC, returns live venues of that
 * sport+country. On GPS denial it still returns the venues (unsorted, dist
 * null) so the app stays usable. No sport-specific logic lives here — sport
 * and country are just params, and sportLabel/accent are attached later by
 * the view via the registry. */
export function useNearbyVenues({ sport, country }) {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchVenues(coords) {
      const { data, error } = await supabase.rpc("nearby_venues", {
        p_lat: coords?.lat ?? null,
        p_lng: coords?.lng ?? null,
        p_sport: sport,
        p_country: country,
      });
      if (cancelled) return;
      if (error) {
        setError(error);
        setVenues([]);
      } else {
        setError(null);
        setVenues(data ?? []);
      }
      setLoading(false);
    }

    setLoading(true);
    setError(null);
    setLocationDenied(false);

    if (!("geolocation" in navigator)) {
      setLocationDenied(true);
      fetchVenues(null);
      return () => { cancelled = true; };
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchVenues({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        if (cancelled) return;
        setLocationDenied(true);
        fetchVenues(null);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );

    return () => { cancelled = true; };
  }, [sport, country]);

  return { venues, loading, error, locationDenied };
}