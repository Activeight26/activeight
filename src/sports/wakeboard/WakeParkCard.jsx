import { Globe, Phone, Mail, BadgeCheck } from "lucide-react";

/* Newer lucide-react dropped brand/logo icons (Instagram, Facebook), so
 * they're drawn locally here. Same stroke style and `size` prop as the
 * lucide icons above — no extra icon-library dependency needed. */
function Instagram({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function Facebook({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

/* ================================================================== *
 * WakeParkCard
 * ------------------------------------------------------------------ *
 * Props-driven card for a single wakeboarding venue.
 *   venue        the venue row + two derived fields the app supplies:
 *                  sportLabel (from the registry) and dist_m (from the
 *                  useNearbyVenues hook). Everything else is read from
 *                  the Supabase row directly.
 *   variant      "teaser" | "full"
 *   accentColor  the sport's category color. Passed in with a water-blue
 *                default; in the app it comes from the registry (and
 *                eventually from a sport *category* — water/nature/indoor
 *                — rather than the individual sport). The prop name stays
 *                neutral so it survives that change without a rename.
 *   onToggle     called on card tap (teaser expands, full collapses)
 * ================================================================== */

/* ---- 1 · FIELD DESCRIPTOR (the "new sport = config" seam) -------- *
 * Order here is the order rows appear on the full card. Sport is NOT in
 * this list — it's universal, injected as the first row from venue.sport
 * + the registry, not from sport_data. When this graduates to the
 * descriptor model, this array is what a new sport's folder supplies. */
const WAKEBOARD_FIELDS = [
  { key: "cable_type", label: "Cable type", type: "chip" },
  { key: "rider_level", label: "Rider level", type: "chips" },
  { key: "features", label: "Features", type: "chips" },
  { key: "park_count", label: "Cables", type: "chip" },
  { key: "rental_equipment", label: "Rental", type: "chip" },
  { key: "lessons_available", label: "Lessons", type: "chip" },
];
const TEASER_FIELDS = ["cable_type"];

/* ---- 2 · VALUE FORMATTERS --------------------------------------- *
 * Raw sport_data values → display strings. An empty result ([]) means
 * "unknown" and renders the dashed Unknown chip. */
const LABELS = {
  cable_type: { full_size: "Full-size", system_2_0: "System 2.0" },
  rider_level: { beginner: "beginner", intermediate: "intermediate", advanced: "advanced" },
  features: { kicker: "kicker", rail: "rail", box: "box", pipe: "pipe", pyramid: "pyramid" },
};

function formatValue(key, value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value) && value.length === 0) return [];
  switch (key) {
    case "cable_type":
    case "rider_level":
    case "features": {
      const arr = Array.isArray(value) ? value : [value];
      const map = LABELS[key] || {};
      return arr.map((v) => map[v] ?? v);
    }
    case "park_count":
      return [String(value)];
    case "rental_equipment":
    case "lessons_available":
      return [value ? "Available" : "Not available"];
    default:
      return [String(value)];
  }
}

/* ---- 3 · CHIP --------------------------------------------------- */
function hexToTint(hex, alpha = 0.12) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function Chip({ children, variant = "default", accentColor }) {
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

/* ---- 4 · LABELLED ROW (label above, chips below) ---------------- */
function FieldRow({ label, values }) {
  const unknown = values.length === 0;
  return (
    <div style={{ textAlign: "left" }}>
      <div style={{ fontSize: 13, color: "#8B9AB0", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {unknown ? <Chip variant="unknown">Unknown</Chip> : values.map((v, i) => <Chip key={i}>{v}</Chip>)}
      </div>
    </div>
  );
}

/* ---- 5 · CONTACT LINKS (missing ones hidden entirely) ----------- */
const CONTACTS = [
  { key: "website", label: "Website", Icon: Globe },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "phone", label: "Phone", Icon: Phone, href: (v) => `tel:${v}` },
  { key: "email", label: "Email", Icon: Mail, href: (v) => `mailto:${v}` },
];

function ContactLinks({ venue, accentColor }) {
  const present = CONTACTS.filter((c) => venue[c.key]);
  if (present.length === 0) return null;
  return (
    <div style={{ borderTop: "0.5px solid #E2E7EC", marginTop: 20, paddingTop: 18, display: "flex", flexWrap: "wrap", gap: 10 }}>
      {present.map(({ key, label, Icon, href }) => (
        <a
          key={key}
          href={href ? href(venue[key]) : venue[key]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 15, color: accentColor, textDecoration: "none", padding: "11px 16px", border: "0.5px solid #E2E7EC", borderRadius: 8 }}
        >
          <Icon size={18} />
          {label}
        </a>
      ))}
    </div>
  );
}

/* ---- 6 · VERIFIED BADGE (year only) ----------------------------- */
function VerifiedBadge({ lastVerified }) {
  const year = lastVerified ? new Date(lastVerified).getFullYear() : null;
  if (!year) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 18 }}>
      <BadgeCheck size={18} style={{ color: "#1D9E75" }} />
      <span style={{ fontSize: 14, color: "#8B9AB0" }}>Verified {year}</span>
    </div>
  );
}

/* ---- 7 · WAKEPARKCARD ------------------------------------------- */
export default function WakeParkCard({ venue, variant = "teaser", accentColor = "#38BFFF", onToggle }) {
  const isTeaser = variant === "teaser";
  const data = venue.sport_data || {};
  const card = {
    background: "#FFFFFF",
    border: "0.5px solid #E2E7EC",
    borderRadius: 12,
    padding: "22px 22px",
    fontFamily: "'Inter', system-ui, sans-serif",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(10,14,23,0.04)",
  };
  return (
    <div
      style={card}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle?.(); } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 500, color: "#0A0E17", lineHeight: 1.2 }}>{venue.name}</div>
          <div style={{ fontSize: 15, color: "#5A6A82", marginTop: 4 }}>{venue.city}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span style={{ fontSize: 44, fontWeight: 500, color: "#0A0E17", lineHeight: 0.9, letterSpacing: "-0.02em" }}>{formatDistance(venue.dist_m)}</span>
          <span style={{ fontSize: 17, color: "#5A6A82", marginLeft: 3 }}>km</span>
        </div>
      </div>

      {isTeaser ? (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
            <Chip variant="accent" accentColor={accentColor}>{venue.sportLabel}</Chip>
            {TEASER_FIELDS.map((key) => {
              const values = formatValue(key, data[key]);
              return values.length === 0
                ? <Chip key={key} variant="unknown">Unknown</Chip>
                : values.map((v, i) => <Chip key={`${key}-${i}`}>{v}</Chip>);
            })}
          </div>
          <VerifiedBadge lastVerified={venue.last_verified} />
        </>
      ) : (
        <>
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, color: "#8B9AB0", marginBottom: 8 }}>Sport</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Chip variant="accent" accentColor={accentColor}>{venue.sportLabel}</Chip>
              </div>
            </div>
            {WAKEBOARD_FIELDS.map((field) => (
              <FieldRow key={field.key} label={field.label} values={formatValue(field.key, data[field.key])} />
            ))}
          </div>
          <ContactLinks venue={venue} accentColor={accentColor} />
          <VerifiedBadge lastVerified={venue.last_verified} />
        </>
      )}
    </div>
  );
}

function formatDistance(distM) {
  if (distM === undefined || distM === null) return "–";
  const km = distM / 1000;
  return km >= 10 ? String(Math.round(km)) : km.toFixed(1);
}