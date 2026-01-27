import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireRunnerSession } from "@/lib/auth/runnerSession";
import { getActiveEventId } from "@/lib/settings/activeEvent";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRunnerSession();
    const { id } = await params;

    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    // Nur geliefert darf archiviert werden und nur im aktiven Event
    const { data, error } = await supabase
      .from("orders")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id)
      .eq("event_id", eventId)
      .eq("status", "geliefert")
      .is("archived_at", null)
      .select("id")
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    if (!data) {
      return NextResponse.json(
        { ok: false, message: "Nur gelieferte Bestellungen können archiviert werden." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
