"use client";

import AppInfoButton from "@/components/shared/AppInfoButton";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useState } from "react";

type Props = {
  publicId: string;
  onUnlocked: (locationName: string) => void;
};

export default function PinGate({ publicId, onUnlocked }: Props) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !loading && pin.length >= 4;

  async function unlock() {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/location/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, pin }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setError(data?.message ?? "Unlock fehlgeschlagen");
        return;
      }

      onUnlocked(data.locationName ?? "Location");
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-narrow">
      <div className="pin-gate-head">
        <h1 className="h1">PIN eingeben</h1>

        <div className="pin-gate-actions">
          <AppInfoButton />
          <ThemeToggle />
        </div>
      </div>

      <div className="mt-14" />

      <p className="p-muted m0 mt-10">
        Bitte PIN eingeben, um diese Location freizuschalten.
      </p>

      <div className="card grid gap-10 mt-14">
        <div className="grid gap-6">
          <div className="small-muted">PIN</div>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="PIN (4 bis 6 Ziffern)"
            onKeyDown={(e) => {
              if (e.key === "Enter") unlock();
            }}
          />
        </div>

        {error && <div className="bad-danger">{error}</div>}

        <button type="button" className="btn btn-full" onClick={unlock} disabled={!canSubmit}>
          {loading ? "Prüfe…" : "Freischalten"}
        </button>
      </div>
    </div>
  );
}
