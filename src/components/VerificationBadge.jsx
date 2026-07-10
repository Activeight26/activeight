import { BadgeCheck, CircleHelp } from "lucide-react";

/* The trust signal. Driven entirely by verification_source and it
 * ALWAYS renders — null is a real state ("Not verified"), not a
 * missing one. Unverified venues are shown on purpose: real
 * decisions route through outbound links, so a slightly-stale
 * unverified record is low-risk and still useful for discovery. */
const SOURCE_LABELS = {
  activeight:   "Verified by Activeight",
  community:    "Community verified",
  organization: "Verified by venue",
};

export default function VerificationBadge({ verificationSource, lastVerified }) {
  const label = SOURCE_LABELS[verificationSource];
  const year = lastVerified ? new Date(lastVerified).getFullYear() : null;

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
};
