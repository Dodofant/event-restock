"use client";

import { useRef, useState } from "react";

type Props = {
  onSwipeLeft: () => void;
  disabled?: boolean;
  actionLabel: string;
  actionVariant: "deliver" | "reset";
  actionIcon?: string;
  children: React.ReactNode;
};

export default function SwipeCard({
  onSwipeLeft,
  disabled,
  actionLabel,
  actionVariant,
  actionIcon,
  children,
}: Props) {
  const startX = useRef<number | null>(null);
  const dragging = useRef(false);

  const [dx, setDx] = useState(0);
  const [anim, setAnim] = useState(false);

  const THRESHOLD = -90;
  const MAX = -140;

  function clamp(v: number) {
    if (v < MAX) return MAX;
    if (v > 0) return 0;
    return v;
  }

  function reset() {
    setAnim(true);
    setDx(0);
    window.setTimeout(() => setAnim(false), 170);
  }

  function commit() {
    setAnim(true);
    setDx(MAX);
    window.setTimeout(() => {
      setAnim(false);
      setDx(0);
      onSwipeLeft();
    }, 170);
  }

  function isInteractiveTarget(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    if (!el) return false;
    return !!el.closest("button, a, input, select, textarea, label");
  }

  return (
    <div className="swipe-wrap">
      <div className={`swipe-bg ${actionVariant}`}>
        <div className="swipe-bg-inner">
          <span>{actionLabel}</span>
          <span className="swipe-icon">{actionIcon ?? "✓"}</span>
        </div>
      </div>

      <div
        className={`swipe-fg ${anim ? "anim" : ""}`}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={(e) => {
          if (disabled) return;
          if (isInteractiveTarget(e.target)) return; // Button Klicks nicht blockieren

          dragging.current = true;
          startX.current = e.clientX;
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          setAnim(false);
        }}
        onPointerMove={(e) => {
          if (disabled) return;
          if (!dragging.current || startX.current == null) return;

          const delta = e.clientX - startX.current;
          setDx(clamp(delta));
        }}
        onPointerUp={(e) => {
          if (disabled) return;
          if (!dragging.current) return;

          dragging.current = false;
          startX.current = null;
          (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);

          if (dx <= THRESHOLD) commit();
          else reset();
        }}
        onPointerCancel={() => {
          if (disabled) return;
          dragging.current = false;
          startX.current = null;
          reset();
        }}
      >
        {children}
      </div>
    </div>
  );
}
