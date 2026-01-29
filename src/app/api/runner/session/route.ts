import { NextResponse } from "next/server";
import { requireRunnerSession } from "@/lib/auth/runnerSession";

export async function GET() {
  try {
    const session = await requireRunnerSession();
    return NextResponse.json({
      ok: true,
      runnerName: session.runnerName ?? null,
      runnerId: session.runnerId ?? null,
      eventId: session.eventId ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nicht freigeschaltet";
    return NextResponse.json({ ok: false, message }, { status: 401 });
  }
}
