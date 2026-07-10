/* The app's atomic value token. Three variants:
 *   default  — neutral gray, a known value
 *   accent   — tinted with the sport category color (the sport chip)
 *   unknown  — dashed outline "Unknown" placeholder
 */

function hexToTint(hex, alpha = 0.12) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function Chip({ children, variant = "default", accentColor }) {
  const base = {
    fontSize: 14,
    lineHeight: 1.2,
    padding: "6px 13px",
    borderRadius: 7,
    whiteSpace: "nowrap",
    display: "inline-block",
  };
  if (variant === "accent") {
    return (
      <span style={{ ...base, background: hexToTint(accentColor), color: accentColor, border: `0.5px solid ${hexToTint(accentColor, 0.35)}` }}>
        {children}
      </span>
    );
  }
  if (variant === "unknown") {
    return (
      <span style={{ ...base, background: "transparent", color: "#9AA6B2", border: "1px dashed #C2CBD6" }}>
        {children}
      </span>
    );
  }
  return (
    <span style={{ ...base, background: "#F4F6F8", color: "#4A5563", border: "0.5px solid #E2E7EC" }}>
      {children}
    </span>
  );
}
