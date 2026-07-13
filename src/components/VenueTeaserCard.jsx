import { configFor, accentFor } from "../sports/registry";
import { formatDistance, formatFieldValues } from "../lib/format";
import VerificationBadge from "./VerificationBadge";

/* The universal teaser — the card in the list and on a tapped map pin,
 * for every sport. Sport-blind: the accent, the chips, and the
 * placeholder artwork all resolve from the registry off venue.sport.
 * Tapping it opens the venue's dedicated page.
 *
 * ---- The card is the product ---------------------------------------
 * The core loop is scan a stack → brain-filter → open the promising one.
 * Everything here serves that:
 *
 *   PHOTO BAND leads. A photo says more about a venue than any amount of
 *   text, so it gets the height. No real photo → the sport's
 *   placeholder, which is deliberately quiet so real photos win the eye.
 *
 *   NAME + DISTANCE on one line. Distance is the anchor — at launch,
 *   with few venues, "near" is most of "fits", so the numeral earns its
 *   weight and the eye lands on it first.
 *
 *   CHIP STRIP is the filter — and it is SPORT-DECLARED, not universal.
 *   The card renders whatever the sport's config lists in `teaserFields`
 *   and nothing else. This matters across sports: wakeboard's decisive
 *   scan attribute is rider level, but kitesurf's is wind direction and
 *   surf's is conditions — for those, ability barely filters anything. A
 *   card that hardcoded one universal field set would be wrong for most
 *   of the sports that come after the first.
 *
 *   Cap teaserFields at ~2. More than that and scanning degrades into
 *   reading, and the card grows past the half-card budget.
 *
 *   OMIT, DON'T SUBSTITUTE. A missing field is silently absent — no
 *   dashes, no "Unknown" chips, and never backfilled with a lower-ranked
 *   field. Every card shows the same fields (uniform columns are what
 *   make vertical scanning work); it just shows fewer when data is thin.
 *
 *   The card is sized so ~2.5+ land in a phone viewport. That half card
 *   is a deliberate scroll affordance — a wordless "there's more below"
 *   — and it caps how tall this card may get.
 * -------------------------------------------------------------------- */
export default function VenueTeaserCard({ venue, onOpen }) {
  const config = configFor(venue.sport);
  const accentColor = accentFor(venue.sport);
  const Placeholder = config?.placeholder;

  /* The teaser RPC pre-resolves a single cover image (a scalar), unlike
   * the venue page which receives the full images array and picks its
   * own. Two shapes on purpose: a scanning surface needs one image, not
   * a gallery.
   *
   * No cover → the sport's placeholder. Two links, no further tiers: a
   * sport always supplies a placeholder, so a missing one is a build
   * error worth seeing, not something to paper over with a generic
   * fallback. */
  const cover = venue.cover_image_url;

  return (
    <div
      style={styles.card}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(); }
      }}
    >
      {/* ---- Photo band ---- */}
      <div style={styles.photoBand}>
        {cover ? (
          <img src={cover} alt="" style={styles.photo} />
        ) : (
          Placeholder && <Placeholder accentColor={accentColor} />
        )}

        {/* Scrim: keeps the badge legible on ANY photo, however busy.
         * Costs nothing on the placeholder. */}
        <div style={styles.scrim} />

        <div style={styles.badgeOnPhoto}>
          <VerificationBadge
            verificationSource={venue.verification_source}
            lastVerified={venue.last_verified}
            onPhoto
          />
        </div>
      </div>

      {/* ---- Text strip ---- */}
      <div style={styles.body}>
        <div style={styles.topLine}>
          <div style={styles.nameWrap}>
            <span style={styles.name}>{venue.name}</span>
            {venue.city && <span style={styles.city}>{venue.city}</span>}
          </div>
          <div style={styles.distanceWrap}>
            <span style={styles.distance}>{formatDistance(venue.dist_m)}</span>
            <span style={styles.distanceUnit}>km</span>
          </div>
        </div>

        <ChipStrip venue={venue} config={config} accentColor={accentColor} />
      </div>
    </div>
  );
}

/* ---- Chip strip -------------------------------------------------- *
 * Renders the sport's `teaserFields` — the 1–2 attributes THAT SPORT
 * says are decisive at a glance. The card never names a field or a
 * sport; it asks the config.
 *
 * Renders nothing at all when there's nothing to show. An empty strip
 * would be dead vertical space on every data-thin card, and this card's
 * height is expensive. */
function ChipStrip({ venue, config, accentColor }) {
  const chips = (config?.teaserFields ?? []).flatMap((key) => {
    const field = config.fields.find((f) => f.key === key);
    if (!field) return [];
    /* Silent omission: no value → no chip. Not a dash, not "Unknown". */
    return formatFieldValues(field, venue.profile?.[key]);
  });

  if (chips.length === 0) return null;

  return (
    <div style={styles.chipStrip}>
      {chips.map((label, i) => (
        <span
          key={i}
          style={{
            ...styles.chip,
            background: tint(accentColor, 0.12),
            color: shade(accentColor),
          }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

/* ---- color helpers ----------------------------------------------- */
function tint(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* The accent is tuned for pins and fills, not for text on a pale tint —
 * at chip size it's too light to read. Darken it for the label. */
function shade(hex) {
  const h = hex.replace("#", "");
  const dark = [0, 2, 4].map((i) =>
    Math.round(parseInt(h.slice(i, i + 2), 16) * 0.55)
  );
  return `rgb(${dark[0]}, ${dark[1]}, ${dark[2]})`;
}

const styles = {
  card: {
    background: "#FFFFFF",
    border: "0.5px solid #E2E7EC",
    borderRadius: 12,
    /* clips the photo to the rounded corners */
    overflow: "hidden",
    fontFamily: "'Inter', system-ui, sans-serif",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(10,14,23,0.04)",
  },
  photoBand: {
    position: "relative",
    /* Sized for real photography (~1.6:1 at card width), not for the
     * placeholder. Constrained by the half-card rule: cards must land at
     * ~2.5+ per viewport so the clipped card reads as "more below".
     * Taller trades scroll affordance for image presence. */
    height: 208,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 46,
    background: "linear-gradient(to top, rgba(4,44,83,0.45), transparent)",
    pointerEvents: "none",
  },
  badgeOnPhoto: {
    position: "absolute",
    bottom: 9,
    left: 12,
  },
  body: {
    /* Compact. The photo carries the visual weight, so the text gets out
     * of its own way. */
    padding: "10px 14px 12px",
  },
  topLine: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
  },
  nameWrap: {
    minWidth: 0,
    display: "flex",
    alignItems: "baseline",
    gap: 7,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 16,
    fontWeight: 500,
    color: "#0A0E17",
  },
  /* City sits beside the name, not under it — one line, not two. */
  city: {
    fontSize: 13,
    color: "#8B9AB0",
  },
  distanceWrap: {
    flexShrink: 0,
    lineHeight: 1,
  },
  distance: {
    fontSize: 24,
    fontWeight: 500,
    color: "#0A0E17",
    letterSpacing: "-0.5px",
  },
  distanceUnit: {
    fontSize: 12,
    color: "#5A6A82",
    marginLeft: 1,
  },
  chipStrip: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    fontSize: 12,
    fontWeight: 500,
    padding: "3px 9px",
    borderRadius: 100,
    whiteSpace: "nowrap",
  },
};