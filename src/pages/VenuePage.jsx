import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";
import { fetchVenue } from "../lib/fetchVenue";
import { configFor, labelFor, accentFor } from "../sports/registry";
import { formatDistance } from "../lib/format";
import Chip from "../components/Chip";
import VerificationBadge from "../components/VerificationBadge";
import ProfileFields from "../components/ProfileFields";
import ContactLinks from "../components/ContactLinks";
import FacilityList from "../components/FacilityList";

/* /venue/:slug — the dedicated venue page, one component for every
 * sport. Universal parts (name, place, images, facilities, links,
 * badge) render directly; the sport-specific block is ProfileFields
 * driven by the sport's config, plus any `extras` components the
 * config lists. No `if (sport === ...)` in here — that branch lives
 * in the config/registry.
 *
 * dist_m arrives via router state when the user came from a teaser
 * (list or map). On a cold deep-link there's no distance — the row
 * is simply omitted. */
export default function VenuePage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  /* One result object keyed on the slug it answered for; "loading" is
   * derived (result doesn't match the current slug yet) instead of a
   * separate flag set synchronously in the effect. */
  const [result, setResult] = useState(null);

  const distM = location.state?.dist_m;

  useEffect(() => {
    let cancelled = false;
    fetchVenue(slug)
      .then((venue) => { if (!cancelled) setResult({ slug, venue, error: null }); })
      .catch((error) => { if (!cancelled) setResult({ slug, venue: null, error }); });
    return () => { cancelled = true; };
  }, [slug]);

  const loading = result?.slug !== slug;
  const venue = loading ? null : result.venue;
  const error = loading ? null : result.error;

  /* Back goes to the surface the user came from (list or map); on a
   * cold deep-link there's no app history, so fall back to the list. */
  const goBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  };

  if (loading) {
    return <div style={styles.page}><div style={styles.status}>Loading venue…</div></div>;
  }
  if (error) {
    return <div style={styles.page}><div style={styles.status}>Couldn't load this venue right now.</div></div>;
  }
  if (!venue) {
    return (
      <div style={styles.page}>
        <div style={styles.status}>
          This venue doesn't exist (or isn't published).
          <div style={{ marginTop: 12 }}>
            <button type="button" onClick={() => navigate("/")} style={styles.backBtn}>
              <ChevronLeft size={18} /> All venues
            </button>
          </div>
        </div>
      </div>
    );
  }

  const config = configFor(venue.sport);
  const accentColor = accentFor(venue.sport);
  const cover = venue.images.find((i) => i.is_cover) ?? venue.images[0];
  const gallery = venue.images.filter((i) => i !== cover);
  const placeLine = [venue.city, venue.region].filter(Boolean).join(", ");

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        <button type="button" onClick={goBack} style={styles.backBtn}>
          <ChevronLeft size={18} /> Back
        </button>

        {cover && (
          <img src={cover.image_url} alt={cover.caption ?? venue.name} style={styles.hero} />
        )}

        <div style={styles.headRow}>
          <div style={{ minWidth: 0 }}>
            <h1 style={styles.name}>{venue.name}</h1>
            {placeLine && <div style={styles.place}>{placeLine}</div>}
          </div>
          {distM != null && (
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <span style={styles.distance}>{formatDistance(distM)}</span>
              <span style={styles.distanceUnit}>km</span>
            </div>
          )}
        </div>

        <div style={styles.chipRow}>
          <Chip variant="accent" accentColor={accentColor}>{labelFor(venue.sport)}</Chip>
        </div>
        <VerificationBadge
          verificationSource={venue.verification_source}
          lastVerified={venue.last_verified}
        />

        {venue.short_description && <p style={styles.shortDesc}>{venue.short_description}</p>}
        {venue.long_description && <p style={styles.longDesc}>{venue.long_description}</p>}

        {venue.profile && config && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>{labelFor(venue.sport)} details</h2>
            <ProfileFields config={config} profile={venue.profile} />
          </section>
        )}

        {/* Sport-specific custom widgets (the config escape hatch). */}
        {(config?.extras ?? []).map((Extra, i) => (
          <Extra key={i} venue={venue} accentColor={accentColor} />
        ))}

        {venue.facilities && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Facilities</h2>
            <FacilityList facilities={venue.facilities} />
          </section>
        )}

        {venue.links && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Links</h2>
            <ContactLinks links={venue.links} accentColor={accentColor} />
          </section>
        )}

        {gallery.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Photos</h2>
            <div style={styles.gallery}>
              {gallery.map((img) => (
                <img key={img.id} src={img.image_url} alt={img.caption ?? ""} style={styles.galleryImg} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "transparent",
    padding: "16px 16px 64px",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  inner: { maxWidth: 640, margin: "0 auto" },
  status: {
    maxWidth: 640,
    margin: "60px auto",
    textAlign: "center",
    fontSize: 15,
    color: "#5A6A82",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "8px 12px 8px 6px",
    marginBottom: 12,
    border: "none",
    borderRadius: 8,
    background: "transparent",
    fontFamily: "inherit",
    fontSize: 15,
    color: "#5A6A82",
    cursor: "pointer",
  },
  hero: {
    width: "100%",
    aspectRatio: "16 / 9",
    objectFit: "cover",
    borderRadius: 12,
    marginBottom: 18,
    display: "block",
  },
  headRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },
  name: {
    margin: 0,
    fontSize: 26,
    fontWeight: 600,
    color: "#0A0E17",
    lineHeight: 1.15,
    letterSpacing: "-0.01em",
  },
  place: { fontSize: 15, color: "#5A6A82", marginTop: 6 },
  distance: {
    fontSize: 44,
    fontWeight: 500,
    color: "#0A0E17",
    lineHeight: 0.9,
    letterSpacing: "-0.02em",
  },
  distanceUnit: { fontSize: 17, color: "#5A6A82", marginLeft: 3 },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 },
  shortDesc: { fontSize: 16, color: "#2A3646", lineHeight: 1.55, marginTop: 22, marginBottom: 0 },
  longDesc: { fontSize: 15, color: "#4A5563", lineHeight: 1.6, marginTop: 14, marginBottom: 0 },
  section: { marginTop: 30 },
  sectionTitle: {
    margin: "0 0 14px",
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#8B9AB0",
  },
  gallery: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  galleryImg: {
    width: "100%",
    aspectRatio: "4 / 3",
    objectFit: "cover",
    borderRadius: 10,
    display: "block",
  },
};
