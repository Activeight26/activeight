import { BadgeCheck, CircleHelp } from "lucide-react";

/* The trust signal. Driven entirely by verification_source.
 *
 * Two variants, because the two surfaces want different things:
 *
 *   DEFAULT (venue page) — always renders, including null as a real
 *   state ("Not verified"). The page is where trust should be loud and
 *   complete: a reader who's leaning toward this venue deserves the full
 *   provenance, gaps included. Unverified venues are shown on purpose —
 *   real decisions route through outbound links, so a slightly-stale
 *   unverified record is low-risk and still useful for discovery.
 *
 *   onPhoto (teaser card) — sits on a dark scrim over the photo band, so
 *   it's white. Two deliberate reductions:
 *
 *     · Short label. "Verified 2026", not "Verified by Activeight 2026".
 *       At scan speed the question is "is this vouched for?", not "by
 *       whom" — the source detail belongs on the page.
 *
 *     · Renders NOTHING when unverified. A gray "Not verified" pill on
 *       every unverified card is the same visual noise as a dashed
 *       "Unknown" chip: it fills the scanning surface with non-signal.
 *       On a card, absence IS the signal. The page still tells the whole
 *       truth. (This is the card's omit-don't-substitute rule applied to
 *       the badge.)
 */
const SOURCE_LABELS = {
  activeight:   "Verified by Activeight",
  community:    "Community verified",
  organization: "Verified by venue",
};

export default function VerificationBadge({
  verificationSource,
  lastVerified,
  onPhoto = false,
}) {
  const label = SOURCE_LABELS[verificationSource];
  const year = lastVerified ? new Date(lastVerified).getFullYear() : null;

  if (onPhoto) {
    /* Unverified → nothing. Silence, not a gray pill. */
    if (!label) return null;
    return (
      <div style={styles.rowOnPhoto}>
        <BadgeCheck size={15} style={{ color: "#FFFFFF" }} />
        <span style={styles.textOnPhoto}>
          Verified{year ? ` ${year}` : ""}
        </span>
      </div>
    );
  }

  if (!label) {
    return (
      <div style={styles.row}>
        <CircleHelp size={18} style={{ color: "#9AA6B2" }} />
        <span style={styles.text}>Not verified</span>
      </div>
    );
  }
  return (
    <div style={styles.row}>
      <BadgeCheck size={18} style={{ color: "#1D9E75" }} />
      <span style={styles.text}>{label}{year ? ` ${year}` : ""}</span>
    </div>
  );
}

const styles = {
  row: { display: "flex", alignItems: "center", gap: 6, marginTop: 18 },
  text: { fontSize: 14, color: "#8B9AB0" },

  /* No marginTop — the card positions this absolutely on the photo. */
  rowOnPhoto: { display: "flex", alignItems: "center", gap: 5 },
  textOnPhoto: {
    fontSize: 12,
    fontWeight: 500,
    color: "#FFFFFF",
    /* belt-and-braces against a bright patch in a real photo, on top of
     * the card's scrim */
    textShadow: "0 1px 2px rgba(4,44,83,0.5)",
  },
};