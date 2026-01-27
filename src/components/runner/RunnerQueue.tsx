"use client";

import AppInfoButton from "@/components/shared/AppInfoButton";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useEffect, useMemo, useRef, useState } from "react";
import SwipeCard from "@/components/runner/SwipeCard";

type OrderLine = { qty: number; unit: "stk" | "gebinde"; itemName: string };
type Order = {
  id: string;
  status: "neu" | "in_bearbeitung" | "unterwegs" | "geliefert" | "storniert";
  priority: "normal" | "dringend";
  note: string | null;
  createdAt: string;
  location: { name: string; type: "bar" | "food" };
  lines: OrderLine[];
};

function labelUnit(u: "stk" | "gebinde") {
  return u === "stk" ? "Stk" : "Gebinde";
}

function buttonLabel(status: Order["status"]) {
  if (status === "neu") return "Annehmen";
  if (status === "in_bearbeitung") return "Angenommen";
  if (status === "unterwegs") return "Unterwegs";
  if (status === "geliefert") return "Archivieren";
  return "Status";
}

function nextStatusOnTap(status: Order["status"]): "in_bearbeitung" | "unterwegs" | "neu" {
  // Tap durchschalten: neu -> in_bearbeitung -> unterwegs -> neu
  if (status === "neu") return "in_bearbeitung";
  if (status === "in_bearbeitung") return "unterwegs";
  return "neu";
}

function playBeep(kind: "normal" | "urgent") {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as any;
    if (!Ctx) return;

    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "sine";
    o.frequency.value = kind === "urgent" ? 880 : 520;

    g.gain.value = 0.0001;

    o.connect(g);
    g.connect(ctx.destination);

    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "urgent" ? 0.22 : 0.14));

    o.start(now);
    o.stop(now + (kind === "urgent" ? 0.26 : 0.18));

    o.onended = () => {
      try {
        ctx.close();
      } catch {}
    };
  } catch {
    // ignorieren, falls Browser Audio blockt
  }
}

export default function RunnerQueue() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Geliefert einklappbar (standard: zu)
  const [deliveredOpen, setDeliveredOpen] = useState(false);

  // Normal-Badge standardmässig ausblenden, aber easy wieder aktivierbar
  const SHOW_NORMAL_BADGE = false;

  const prevOpenIds = useRef<Set<string>>(new Set());
  const didInit = useRef(false);

  async function load() {
    try {
      const res = await fetch("/api/runner/orders", { cache: "no-store" });
      const text = await res.text();

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!res.ok || !data?.ok) {
        setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
        setLoading(false);
        return;
      }

      setOrders(data.orders ?? []);
      setError(null);
      setLoading(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setError(`Fetch Fehler: ${msg}`);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  const openOrders = useMemo(() => {
    const list = orders.filter((o) => o.status !== "geliefert");

    // dringend zuerst, dann älteste zuerst (FIFO)
    return list.sort((a, b) => {
      const ap = a.priority === "dringend" ? 0 : 1;
      const bp = b.priority === "dringend" ? 0 : 1;
      if (ap !== bp) return ap - bp;

      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      return at - bt;
    });
  }, [orders]);

  const deliveredOrders = useMemo(() => {
    const list = orders.filter((o) => o.status === "geliefert");
    // neueste geliefert oben
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  // Sound bei neuer Bestellung (nur für offene)
  useEffect(() => {
    const currentOpen = new Set(openOrders.map((o) => o.id));

    if (!didInit.current) {
      prevOpenIds.current = currentOpen;
      didInit.current = true;
      return;
    }

    const newOnes = openOrders.filter((o) => !prevOpenIds.current.has(o.id));
    if (newOnes.length > 0) {
      const hasUrgent = newOnes.some((o) => o.priority === "dringend");
      playBeep(hasUrgent ? "urgent" : "normal");
    }

    prevOpenIds.current = currentOpen;
  }, [openOrders]);

  async function setStatus(orderId: string, status: "neu" | "in_bearbeitung" | "unterwegs" | "geliefert") {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
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

    await load();
  }

  async function archive(orderId: string) {
    const res = await fetch(`/api/orders/${orderId}/archive`, { method: "POST" });

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

    await load();
  }

  async function logout() {
    await fetch("/api/runner/logout", { method: "POST" });
    window.location.reload();
  }

  function locationIcon(t: "bar" | "food") {
    if (t === "bar") return <i className="fa-solid fa-beer-mug-empty" title="Bar" aria-label="Bar" />;
    return <i className="fa-solid fa-burger" title="Food" aria-label="Food" />;
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card">Lade Bestellungen…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card bad-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row row-between row-wrap">
        <div>
          <h1 className="h1">Läufer Übersicht</h1>
          <p className="p-muted m0">
            Offen: {openOrders.length} · Geliefert: {deliveredOrders.length}
          </p>
        </div>

        <div className="row row-end row-wrap gap-10">
          <AppInfoButton />
          <ThemeToggle />
          <button type="button" className="btn-pill" onClick={logout}>
            Abmelden <i className="fa-solid fa-arrow-right-from-bracket" />
          </button>
        </div>
      </div>

      {/* Offene */}
      <div style={{ marginTop: 24 }}>
        <h2 className="h2">Offene Bestellungen</h2>

        <div className="grid gap-10" style={{ marginTop: 18 }}>
          {openOrders.length === 0 && <div className="card">Aktuell keine offenen Bestellungen.</div>}

          {openOrders.map((o) => {
            const next = nextStatusOnTap(o.status);
            const urgent = o.priority === "dringend";
            const showBadge = urgent || SHOW_NORMAL_BADGE;

            return (
              <SwipeCard
                key={o.id}
                disabled={o.status !== "unterwegs"}
                actionLabel="Geliefert"
                actionVariant="deliver"
                actionIcon="✓"
                onSwipeLeft={() => setStatus(o.id, "geliefert")}
              >
                <div className="card grid gap-8">
                  <div className="card-row">
                    <div className="grid gap-6">
                      {/* Titel + Badge auf einer Linie */}
                      <div className="row row-wrap gap-10" style={{ alignItems: "center" }}>
                        <div className="fw-900">
                          <span className="mini-icon">{locationIcon(o.location.type)}</span> {o.location.name}
                        </div>

                        {showBadge && (
                          <span className={`badge ${urgent ? "badge-urgent" : "badge-normal"}`}>
                            {urgent && <span className="live-dot pulse" />}
                            {urgent ? "Dringend" : "Normal"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="small-muted">
                      {new Date(o.createdAt).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>

                  <div className="grid gap-8">
                    {o.lines.map((l, idx) => (
                      <div key={idx} className="row row-between">
                        <div>{l.itemName}</div>
                        <div className="fw-900">
                          {l.qty} {labelUnit(l.unit)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {o.note && <div className="small-muted">Notiz: {o.note}</div>}

                  <div className="btn-group">
                    {o.status === "unterwegs" && (
                      <button className="btn-pill desktop-only" type="button" onClick={() => setStatus(o.id, "geliefert")}>
                        Geliefert
                      </button>
                    )}

                    <button className="btn-pill" type="button" onClick={() => setStatus(o.id, next)}>
                      {buttonLabel(o.status)}
                    </button>
                  </div>
                </div>
              </SwipeCard>
            );
          })}
        </div>
      </div>

      {/* Klarer Trenner */}
      <div
        aria-hidden="true"
        style={{
          height: 1,
          width: "100%",
          opacity: 0.18,
          background: "currentColor",
          margin: "28px 0",
        }}
      />

      {/* Geliefert einklappbar */}
      <div style={{ marginTop: 0 }}>
        <div className="row row-between row-wrap" style={{ alignItems: "center" }}>
          <h2 className="h2 m0">Gelieferte Bestellungen</h2>

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
          <div className="grid gap-10" style={{ marginTop: 18 }}>
            {deliveredOrders.length === 0 && <div className="card">Noch keine gelieferten Bestellungen.</div>}

            {deliveredOrders.map((o) => {
              const urgent = o.priority === "dringend";
              const showBadge = urgent || SHOW_NORMAL_BADGE;

              return (
                <SwipeCard
                  key={o.id}
                  disabled={false}
                  actionLabel="Zurücksetzen"
                  actionVariant="reset"
                  actionIcon="↩"
                  onSwipeLeft={() => setStatus(o.id, "neu")}
                >
                  <div className="card grid gap-8">
                    <div className="card-row">
                      <div className="grid gap-6">
                        {/* Titel + Badge auf einer Linie */}
                        <div className="row row-wrap gap-10" style={{ alignItems: "center" }}>
                          <div className="fw-900">
                            <span className="mini-icon">{locationIcon(o.location.type)}</span> {o.location.name}
                          </div>

                          {showBadge && (
                            <span className={`badge ${urgent ? "badge-urgent" : "badge-normal"}`}>
                              {urgent && <span className="live-dot" />}
                              {urgent ? "Dringend" : "Normal"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="small-muted">
                        {new Date(o.createdAt).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>

                    <div className="grid gap-8">
                      {o.lines.map((l, idx) => (
                        <div key={idx} className="row row-between">
                          <div>{l.itemName}</div>
                          <div className="fw-900">
                            {l.qty} {labelUnit(l.unit)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {o.note && <div className="small-muted">Notiz: {o.note}</div>}

                    <div className="btn-group">
                      <button className="btn-pill desktop-only" type="button" onClick={() => setStatus(o.id, "neu")}>
                        <i className="fa-solid fa-arrow-rotate-right" />
                      </button>

                      <button className="btn-pill" type="button" onClick={() => archive(o.id)}>
                        <i className="fa-solid fa-box-archive" />
                      </button>
                    </div>
                  </div>
                </SwipeCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
