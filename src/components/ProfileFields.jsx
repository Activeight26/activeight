import Chip from "./Chip";
import { formatFieldValues } from "../lib/format";

/* The universal field renderer — the UI half of "adding a sport is
 * config, not components". Reads a sport config's field descriptors
 * (see sports/wakeboard/config.js) and resolves each against the
 * venue's profile object. No sport is ever named in here. */

export function FieldRow({ label, values }) {
  const unknown = values.length === 0;
  return (
    <div style={{ textAlign: "left" }}>
      <div style={{ fontSize: 13, color: "#8B9AB0", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {unknown
          ? <Chip variant="unknown">Unknown</Chip>
          : values.map((v, i) => <Chip key={i}>{v}</Chip>)}
      </div>
    </div>
  );
}

/* All of a sport's field rows, in config order. Empty-field rule:
 * important + empty → "Unknown" chip (an honest gap); not important
 * + empty → the row is hidden entirely. */
export default function ProfileFields({ config, profile }) {
  const rows = (config?.fields ?? [])
    .map((field) => ({ field, values: formatFieldValues(field, profile?.[field.key]) }))
    .filter(({ field, values }) => values.length > 0 || field.important);

  if (rows.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {rows.map(({ field, values }) => (
        <FieldRow key={field.key} label={field.label} values={values} />
      ))}
    </div>
  );
}
