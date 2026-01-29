"use client";

import { useMemo, useState } from "react";

export default function ClientLocationsLauncher(props: {
  locations: Array<{ public_id: string; name: string; type: "bar" | "food" }>;
}) {
  const options = useMemo(
    () => [...props.locations].sort((a, b) => a.name.localeCompare(b.name, "de-CH")),
    [props.locations]
  );

  const [sel, setSel] = useState(options[0]?.public_id ?? "");
  const href = sel ? `/l/${sel}` : "#";

  return (
    <div className="form-row">
      <select className="input form-grow" value={sel} onChange={(e) => setSel(e.target.value)}>
        {options.map((l) => (
          <option key={l.public_id} value={l.public_id}>
            {l.name} ({l.type === "bar" ? "Bar" : "Food"})
          </option>
        ))}
      </select>

      <a className="btn-pill form-action" href={href}>
        Öffnen
      </a>
    </div>
  );
}
