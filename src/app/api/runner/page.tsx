"use client";

import { useState } from "react";
import RunnerGate from "@/components/runner/RunnerPinGate";
import RunnerQueue from "@/components/runner/RunnerQueue";

export default function RunnerPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [runnerName, setRunnerName] = useState("");

  if (!unlocked) {
    return (
      <div className="container">
        <h1 className="h1">Runner Login</h1>
        <div className="mt-14">
          <RunnerGate
            onUnlocked={(name) => {
              setRunnerName(name);
              setUnlocked(true);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="container">
        <div className="small-muted">Angemeldet als: {runnerName}</div>
      </div>
      <RunnerQueue />
    </div>
  );
}
