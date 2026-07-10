import { Globe, Phone, Mail, Ticket, MapPin } from "lucide-react";

/* Outbound links — the app's "transaction layer". Universal (every
 * sport renders the same link row); reads the venue_links object.
 * Missing links are hidden entirely, never "Unknown".
 *
 * Newer lucide-react dropped brand/logo icons, so Instagram,
 * Facebook, YouTube and TikTok are drawn locally with the same
 * stroke style and `size` prop — no extra icon dependency. */

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

function YouTube({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9.5v5l4.5-2.5z" />
    </svg>
  );
}

function TikTok({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4c.5 2.5 2.5 4.5 5 5" />
    </svg>
  );
}

/* Booking first — it's the action this whole app funnels toward. */
const LINKS = [
  { key: "booking_url", label: "Book", Icon: Ticket },
  { key: "website", label: "Website", Icon: Globe },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "youtube", label: "YouTube", Icon: YouTube },
  { key: "tiktok", label: "TikTok", Icon: TikTok },
  { key: "google_maps_url", label: "Directions", Icon: MapPin },
  { key: "phone", label: "Phone", Icon: Phone, href: (v) => `tel:${v}` },
  { key: "email", label: "Email", Icon: Mail, href: (v) => `mailto:${v}` },
];

export default function ContactLinks({ links, accentColor }) {
  const present = LINKS.filter((l) => links?.[l.key]);
  if (present.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {present.map(({ key, label, Icon, href }) => (
        <a
          key={key}
          href={href ? href(links[key]) : links[key]}
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
