"use client";

import AppInfoButton from "@/components/shared/AppInfoButton";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useEffect, useState } from "react";

type Runner = { id: string; name: string };
type Props = { onUnlocked: (runnerName: string) => void };

export default function RunnerPinGate({ onUnlocked }: Props) {
  const [runners, setRunners] = useState<Runner[]>([]);
  const [runnerId, setRunnerId] = useState("");
  const [pin, setPin] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRunners() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/runner/list", { cache: "no-store" });
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

    const list: Runner[] = data.runners ?? [];
    setRunners(list);
    if (!runnerId && list.length > 0) setRunnerId(list[0].id);

    setLoading(false);
  }

  useEffect(() => {
    loadRunners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = !sending && !!runnerId && pin.length >= 4;

  async function unlock() {
    if (!canSubmit) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/runner/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runnerId, pin }),
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

      onUnlocked(data?.runnerName ?? "Runner");
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="container-narrow">
        <div className="card">Lade Runner…</div>
      </div>
    );
  }

  return (
    <div className="container-narrow">
      <div className="pin-gate-head">
        <h1 className="h1">Läufer Login</h1>
        <div className="pin-gate-actions">
          <AppInfoButton />
          <ThemeToggle />
        </div>
      </div>

      <p className="p-muted m0 mt-10">Runner auswählen und PIN eingeben.</p>

      <div className="card grid gap-10 mt-14">
        <div className="grid gap-6">
          <div className="small-muted">Runner</div>
          <select className="input" value={runnerId} onChange={(e) => setRunnerId(e.target.value)}>
            {runners.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

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
          {sending ? "Prüfe…" : "Anmelden"}
        </button>
      </div>
    </div>
  );
}
