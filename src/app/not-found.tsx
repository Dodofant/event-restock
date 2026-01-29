"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function NotFound() {
  const emojiArray = useMemo(
    () => [
      "\\(o_o)/",
      "(o^^)o",
      "(˚Δ˚)b",
      "(^-^*)",
      "(≥o≤)",
      "(^_^)b",
      "(·_·)",
      "(='X'=)",
      "(>_<)",
      "(;-;)",
      "\\(^Д^)/",
    ],
    []
  );

  const [emoji, setEmoji] = useState<string>("");

  useEffect(() => {
    const pick = emojiArray[Math.floor(Math.random() * emojiArray.length)];
    setEmoji(pick);
  }, [emojiArray]);

  return (
    <div className="container">
      <div className="grid gap-10">
        <div className="card grid gap-10" style={{ textAlign: "center" }}>
          <div className="error-emoji" style={{ fontSize: 28, fontWeight: 900, letterSpacing: 0.5 }}>
            {emoji}
          </div>

          <div>
            <h1 className="h1" style={{ justifySelf: "center" }}>
              Seite nicht gefunden
            </h1>
            <p className="p-muted m0 mt-10">Diese Seite gibt es nicht. Bitte URL prüfen.</p>
          </div>

          <div className="row row-end row-wrap" style={{ justifyContent: "center" }}>
            <Link className="btn-pill" href="/">
              Zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
