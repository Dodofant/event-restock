"use client";

import AppInfoButton from "@/components/shared/AppInfoButton";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useEffect, useState } from "react";

export default function AdminPinGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Beim Laden: prüfen ob Cookie Session bereits gültig ist
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/admin/session", { method: "GET", cache: "no-store" });
        if (cancelled) return;

        if (res.ok) {
          onUnlocked();
          return;
        }
      } catch {
        // ignorieren
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onUnlocked]);

  const canSubmit = !loading && pin.trim().length >= 4;

  async function unlock() {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
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
      setLoading(false);
      return;
    }

    setLoading(false);
    onUnlocked();
  }

  return (
    <div className="container-narrow">
      <div className="pin-gate-head">
        <h1 className="h1">Admin</h1>

        <div className="pin-gate-actions">
          <AppInfoButton />
          <ThemeToggle />
        </div>
      </div>

      <p className="p-muted m0 mt-10">Bitte Admin PIN eingeben.</p>

      <div className="card grid gap-10 mt-14">
        <div className="grid gap-6">
          <div className="small-muted">Admin PIN</div>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
            onKeyDown={(e) => {
              if (e.key === "Enter") unlock();
            }}
            placeholder="PIN (mind. 4 Ziffern)"
          />
        </div>

        {error && <div className="bad-danger">{error}</div>}

        <button className="btn btn-full" onClick={unlock} disabled={!canSubmit}>
          {loading ? "Prüfe…" : "Freischalten"}
        </button>
      </div>
    </div>
  );
}
