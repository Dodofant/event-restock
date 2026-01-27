"use client";

import { useState } from "react";
import RunnerPinGate from "@/components/runner/RunnerPinGate";
import RunnerQueue from "@/components/runner/RunnerQueue";

export default function RunnerClientPage() {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <RunnerPinGate onUnlocked={() => setUnlocked(true)} />;
  }

  return <RunnerQueue />;
}