import Chip from "./Chip";
import { formatFieldValues } from "../lib/format";

/* The universal field renderer — the UI half of "adding a sport is
 * config, not components". Reads a sport config's field descriptors
 * (see sports/wakeboard/config.js) and resolves each against the
 * venue's profile object. No sport is ever named in here. */

export function FieldRow({ label, values }) {
  return (
    <div style={{ textAlign: "left" }}>
      <div style={{ fontSize: 13, color: "#8B9AB0", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {values.map((v, i) => <Chip key={i}>{v}</Chip>)}
      </div>
    </div>
  );
}

/* All of a sport's field rows, in config order.
 *
 * SILENT OMISSION: an empty field is not rendered. No dash, no "N/A",
 * no "Unknown" chip, no substituted value — the row simply isn't there.
 * A blank space is honest; a placeholder is noise competing with real
 * signal, and the scan-and-filter loop this product rests on depends on
 * every visible token meaning something. */
export default function ProfileFields({ config, profile }) {
  const rows = (config?.fields ?? [])
    .map((field) => ({ field, values: formatFieldValues(field, profile?.[field.key]) }))
    .filter(({ values }) => values.length > 0);

  if (rows.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {rows.map(({ field, values }) => (
        <FieldRow key={field.key} label={field.label} values={values} />
      ))}
    </div>
  );
}