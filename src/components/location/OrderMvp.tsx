"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  category: "drink" | "food" | "other";
  default_unit: "stk" | "gebinde";
  pack_size: number | null;
};

type LineDraft = {
  itemId: string;
  name: string;
  unit: "stk" | "gebinde";
  qty: number;
};

function labelCategory(c: Item["category"]) {
  if (c === "drink") return "Getränke";
  if (c === "food") return "Essen";
  return "Anderes";
}

function labelUnit(u: "stk" | "gebinde") {
  return u === "stk" ? "Stk" : "Gebinde";
}

export default function OrderMvp() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lines, setLines] = useState<Record<string, LineDraft>>({});
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Neu: Priorität + Notiz (optional)
  const [priority, setPriority] = useState<"normal" | "dringend">("normal");
  const [note, setNote] = useState<string>("");

  function togglePriority() {
    setPriority((p) => (p === "normal" ? "dringend" : "normal"));
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const res = await fetch("/api/location/items", { cache: "no-store" });
        const text = await res.text();

        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }

        if (!res.ok) {
          const msg = data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`;
          setError(msg);
          setLoading(false);
          return;
        }

        if (!data?.ok) {
          setError(data?.message ?? "Konnte Artikel nicht laden");
          setLoading(false);
          return;
        }

        setItems(data.items ?? []);
        setLoading(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
        setError(`Fetch Fehler: ${msg}`);
        setLoading(false);
      }
    })();
  }, []);

  const lineList = useMemo(() => Object.values(lines).filter((l) => l.qty > 0), [lines]);

  function setQty(item: Item, qty: number) {
    setSuccess(null);
    setLines((prev) => {
      const next = { ...prev };
      next[item.id] = {
        itemId: item.id,
        name: item.name,
        unit: prev[item.id]?.unit ?? item.default_unit,
        qty,
      };
      return next;
    });
  }

  function toggleUnit(item: Item) {
    setSuccess(null);
    setLines((prev) => {
      const cur =
        prev[item.id] ?? ({
          itemId: item.id,
          name: item.name,
          unit: item.default_unit,
          qty: 0,
        } as LineDraft);

      const nextUnit = cur.unit === "stk" ? "gebinde" : "stk";
      return {
        ...prev,
        [item.id]: { ...cur, unit: nextUnit },
      };
    });
  }

  async function submit() {
    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        priority,
        note: note.trim() ? note.trim() : null,
        lines: lineList.map((l) => ({ itemId: l.itemId, qty: l.qty, unit: l.unit })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!res.ok || !data?.ok) {
        setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
        return;
      }

      setLines({});
      setNote("");
      setPriority("normal");
      setSuccess(`Bestellung gesendet (ID: ${data.orderId})`);
      window.dispatchEvent(new Event("location-orders-refresh"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setError(`Fetch Fehler: ${msg}`);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="card">Lade Artikel…</div>;
  if (error) return <div className="card bad-danger">{error}</div>;

  return (
    <div className="grid gap-10">
      <div className="grid gap-8">
        <h2 className="h2">Nachschub bestellen</h2>
        {items.length === 0 && <p className="p-muted m0">Keine Artikel für diese Location freigeschaltet.</p>}

        <div className="card grid gap-10">
          <div className="row row-between row-wrap">
            <div className="small-muted">Priorität</div>

            <button
              type="button"
              className={`btn-pill ${priority === "dringend" ? "btn-danger" : ""}`}
              onClick={togglePriority}
              title="Tippen zum Umschalten"
            >
              Priorität: {priority === "dringend" ? "Dringend" : "Normal"}
            </button>
          </div>

          <div className="grid gap-6">
            <div className="small-muted">Notiz (optional)</div>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="zB. Bitte zuerst Mineralwasser"
            />
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="grid gap-10">
          {items.map((item) => {
            const line = lines[item.id];
            const qty = line?.qty ?? 0;
            const unit = line?.unit ?? item.default_unit;

            return (
              <div key={item.id} className="card grid gap-8">
                <div className="card-row">
                  <div>
                    <div className="fw-900">{item.name}</div>
                    <div className="small-muted">
                      Kategorie: {labelCategory(item.category)} · Standard: {labelUnit(item.default_unit)}
                      {item.pack_size ? ` · Gebinde: ${item.pack_size}` : ""}
                    </div>
                  </div>

                  <button type="button" className="btn-pill" onClick={() => toggleUnit(item)}>
                    {labelUnit(unit)}
                  </button>
                </div>

                <div className="row row-wrap gap-10">
                  <button
                    type="button"
                    className="btn-square"
                    onClick={() => setQty(item, Math.max(0, qty - 1))}
                  >
                    <i className="fa-solid fa-minus" />
                  </button>

                  <input
                    className="input-qty"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={qty}
                    onChange={(e) => {
                      const v = Number(String(e.target.value).replace(/\D/g, ""));
                      setQty(item, Number.isFinite(v) ? v : 0);
                    }}
                  />

                  <button type="button" className="btn-square" onClick={() => setQty(item, qty + 1)}>
                    <i className="fa-solid fa-plus" />
                  </button>

                  <div className="op-80">{labelUnit(unit)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <button
          type="button"
          className="btn btn-full"
          onClick={submit}
          disabled={sending || lineList.length === 0}
        >
          {sending ? "Sende…" : `Bestellen (${lineList.length})`} <i className="fa-solid fa-truck-fast" />
        </button>

        {success && <div className="bad-success mt-10">{success}</div>}
        {error && <div className="bad-danger mt-10">{error}</div>}
      </div>
    </div>
  );
}
