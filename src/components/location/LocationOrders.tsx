"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type OrderLine = { qty: number; unit: "stk" | "gebinde"; itemName: string };
type Order = {
  id: string;
  status: "neu" | "in_bearbeitung" | "unterwegs" | "geliefert" | "storniert";
  priority: "normal" | "dringend";
  note: string | null;
  createdAt: string;
  lines: OrderLine[];
};

function labelUnit(u: "stk" | "gebinde") {
  return u === "stk" ? "Stk" : "Gebinde";
}

function labelStatus(s: Order["status"]) {
  if (s === "neu") return "Neu";
  if (s === "in_bearbeitung") return "Angenommen";
  if (s === "unterwegs") return "Unterwegs";
  if (s === "geliefert") return "Geliefert";
  return "Storniert";
}

export default function LocationOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [rtOk, setRtOk] = useState(false);

  // Geliefert einklappbar (standard: zu)
  const [deliveredOpen, setDeliveredOpen] = useState(false);

  const reloadTimer = useRef<number | null>(null);

  function scheduleReload() {
    if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => {
      load();
    }, 120);
  }

  async function load() {
    const res = await fetch("/api/location/orders", { cache: "no-store" });
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

    setOrders(data.orders ?? []);
    setLocationId(data.locationId ?? null);
    setError(null);
  }

  // 1) Initial load + Polling Fallback (schnell solange Realtime nicht subscribed ist)
  useEffect(() => {
    load();
    const ms = rtOk ? 30000 : 3000;
    const t = setInterval(load, ms);
    return () => clearInterval(t);
  }, [rtOk]);

  // 2) Realtime: orders für diese Location
  useEffect(() => {
    if (!locationId) return;

    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`loc-orders-${locationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `location_id=eq.${locationId}` },
        () => load()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRtOk(true);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId]);

  // 3) Sofort refresh nach erfolgreichem Submit (Event wird von OrderMvp dispatcht)
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("location-orders-refresh", handler);
    return () => window.removeEventListener("location-orders-refresh", handler);
  }, []);

  const openOrders = useMemo(() => orders.filter((o) => o.status !== "geliefert"), [orders]);
  const deliveredOrders = useMemo(() => orders.filter((o) => o.status === "geliefert"), [orders]);

  return (
    // Mehr Abstand nach oben, damit es visuell klar von der Bestellmaske getrennt ist
    <div style={{ marginTop: 28, paddingTop: 18 }}>
      {/* optional: leichter Top-Trenner innerhalb des Statusblocks */}
      <div
        aria-hidden="true"
        style={{
          height: 1,
          width: "100%",
          opacity: 0.18,
          background: "currentColor",
          marginBottom: 18,
        }}
      />

      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 className="h2">Bestellstatus</h2>

        <div className="small-muted live-badge">
          {rtOk ? (
            <>
              <span className="live-dot pulse" />
              <span>Live</span>
            </>
          ) : (
            <span>Sync…</span>
          )}
        </div>
      </div>

      {error && <div className="card bad-danger mt-10">{error}</div>}

      {/* Offen */}
      <div style={{ marginTop: 26 }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 900 }}>Offen</h3>

        <div className="grid gap-10">
          {openOrders.length === 0 && <div className="card">Aktuell keine offenen Bestellungen.</div>}

          {openOrders.map((o) => (
            <div key={o.id} className="card grid gap-8">
              <div className="card-row">
                <div>
                  <div style={{ fontWeight: 900 }}>{labelStatus(o.status)}</div>
                  <div className="small-muted">
                    {new Date(o.createdAt).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    Priorität: {o.priority === "dringend" ? "Dringend" : "Normal"}
                  </div>
                </div>
              </div>

              <div className="grid gap-8">
                {o.lines.map((l, idx) => (
                  <div key={idx} className="row" style={{ justifyContent: "space-between" }}>
                    <div>{l.itemName}</div>
                    <div style={{ fontWeight: 900 }}>
                      {l.qty} {labelUnit(l.unit)}
                    </div>
                  </div>
                ))}
              </div>

              {o.note && <div className="small-muted">Notiz: {o.note}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Klarer Trenner zwischen den Sektionen */}
      <div
        aria-hidden="true"
        style={{
          height: 1,
          width: "100%",
          opacity: 0.18,
          background: "currentColor",
          margin: "26px 0",
        }}
      />

      {/* Geliefert einklappbar */}
      <div style={{ marginTop: 0 }}>
        <div className="row row-between row-wrap" style={{ alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Geliefert</h3>

          <button
            type="button"
            className={`btn-pill ${deliveredOpen ? "is-active" : ""}`}
            onClick={() => setDeliveredOpen((v) => !v)}
            aria-expanded={deliveredOpen}
            title={deliveredOpen ? "Gelieferte Bestellungen ausblenden" : "Gelieferte Bestellungen einblenden"}
          >
            {deliveredOpen ? "Ausblenden" : `Einblenden (${deliveredOrders.length})`}
          </button>
        </div>

        {!deliveredOpen ? null : (
          <div className="grid gap-10">
            {deliveredOrders.length === 0 && <div className="card">Noch keine gelieferten Bestellungen.</div>}

            {deliveredOrders.map((o) => (
              <div key={o.id} className="card grid gap-8">
                <div className="card-row">
                  <div>
                    <div style={{ fontWeight: 900 }}>{labelStatus(o.status)}</div>
                    <div className="small-muted">
                      {new Date(o.createdAt).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>

                <div className="grid gap-8">
                  {o.lines.map((l, idx) => (
                    <div key={idx} className="row" style={{ justifyContent: "space-between" }}>
                      <div>{l.itemName}</div>
                      <div style={{ fontWeight: 900 }}>
                        {l.qty} {labelUnit(l.unit)}
                      </div>
                    </div>
                  ))}
                </div>

                {o.note && <div className="small-muted">Notiz: {o.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
