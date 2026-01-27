"use client";

import { useEffect, useState } from "react";

type Meta = {
  version: string;
  commit: string | null;
  vercelEnv: string | null;
  vercelUrl: string | null;
  buildTime: string | null;
};

export default function AppInfoButton() {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadMeta() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/meta", { cache: "no-store" });
      const text = await res.text();

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!res.ok || !data?.ok) {
        setErr(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
        setLoading(false);
        return;
      }

      setMeta({
        version: String(data.version ?? "dev"),
        commit: data.commit ? String(data.commit) : null,
        vercelEnv: data.vercelEnv ? String(data.vercelEnv) : null,
        vercelUrl: data.vercelUrl ? String(data.vercelUrl) : null,
        buildTime: data.buildTime ? String(data.buildTime) : null,
      });
      setLoading(false);
    } catch {
      setErr("Netzwerkfehler");
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !meta && !loading) loadMeta();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        className="btn-icon-plain"
        type="button"
        title="Info"
        aria-label="Info"
        onClick={toggle}
      >
        <i className="fa-solid fa-circle-info" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="modal">
            <div className="grid gap-10">
              <div className="row row-between row-wrap">
                <div className="fw-900 fs-18">Info</div>

                <button
                  className="btn-icon"
                  type="button"
                  title="Schliessen"
                  aria-label="Schliessen"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </div>

              {loading && <div className="card">Lade…</div>}
              {err && <div className="card bad-danger">{err}</div>}

              {!loading && !err && (
                <div className="grid gap-10">
                  <div className="card grid gap-6">
                    <div className="fw-900">Nachschub App</div>
                    <div className="small-muted">
                      Version: <span className="fw-900">{meta?.version ?? "dev"}</span>
                      {meta?.commit ? (
                        <>
                          {" · "}Commit: <code>{meta.commit.slice(0, 10)}</code>
                        </>
                      ) : null}
                      {meta?.vercelEnv ? (
                        <>
                          {" · "}Vercel: <code>{meta.vercelEnv}</code>
                        </>
                      ) : null}
                    </div>

                    {meta?.vercelUrl ? (
                      <div className="small-muted">
                        URL: <code>{meta.vercelUrl}</code>
                      </div>
                    ) : null}

                    {meta?.buildTime ? (
                      <div className="small-muted">
                        Build: <code>{meta.buildTime}</code>
                      </div>
                    ) : null}
                  </div>

                  <div className="card grid gap-6">
                    <div className="fw-900">Autor</div>
                    <div className="small-muted">
                      Heizi
                      <br />
                      <a href="https://heizi.ch/" target="_blank" rel="noreferrer">
                        https://heizi.ch/
                      </a>
                      <br />
                      <a href="https://github.com/Dodofant" target="_blank" rel="noreferrer">
                        https://github.com/Dodofant
                      </a>
                    </div>
                  </div>

                  <div className="card grid gap-6">
                    <div className="fw-900">Hinweise</div>
                    <div className="small-muted">
                      Hosting: Vercel
                      <br />
                      Icons: react-icons <a href="https://react-icons.github.io/react-icons/" target="_blank" rel="noreferrer">
                        https://react-icons.github.io/ </a>
                      <br />
                      Backend: Supabase
                    </div>
                  </div>
                </div>
              )}

              <div className="row row-end row-wrap">
                <button className="btn-pill" type="button" onClick={() => setOpen(false)}>
                  Schliessen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
