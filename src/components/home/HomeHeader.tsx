"use client";

import AppInfoButton from "@/components/shared/AppInfoButton";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function HomeHeader(props: { title?: string }) {
  const title = props.title ?? "Nachschub App";

  return (
    <div className="row row-between row-wrap">
      <h1 className="h1">{title}</h1>

      <div className="row row-end row-wrap gap-10">
        <AppInfoButton />
        <ThemeToggle />
      </div>
    </div>
  );
}
