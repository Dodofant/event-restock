"use client";

import { useEffect, useState } from "react";

const LS_KEY = "theme"; // "dark" | "light"

function applyTheme(mode: "dark" | "light") {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("theme-dark");
  else root.classList.remove("theme-dark");
}

function detectInitial(): "dark" | "light" {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {}

  // Fallback: System Preference
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<"dark" | "light">("light");

  useEffect(() => {
    const initial = detectInitial();
    setMode(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
    try {
      localStorage.setItem(LS_KEY, next);
    } catch {}
  }

  const isDark = mode === "dark";

  return (
    <button
      type="button"
      className="btn-pill"
      onClick={toggle}
      aria-label={isDark ? "Darkmode deaktivieren" : "Darkmode aktivieren"}
      title={isDark ? "Darkmode" : "Lightmode"}
    >
      {isDark ? (
        <>
          <i className="fa-regular fa-moon" style={{ marginRight: 8 }} />
          Dark
        </>
      ) : (
        <>
          <i className="fa-regular fa-lightbulb" style={{ marginRight: 8 }} />
          Light
        </>
      )}
    </button>
  );
}
