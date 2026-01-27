import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireRunnerSession } from "@/lib/auth/runnerSession";
import { getActiveEventId } from "@/lib/settings/activeEvent";

type Status = "neu" | "in_bearbeitung" | "unterwegs" | "geliefert";
type Body = { status?: Status };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRunnerSession();
    const { id } = await params;
    const body = (await req.json()) as Body;

    const nextStatus = body.status;
    if (!nextStatus || !["neu", "in_bearbeitung", "unterwegs", "geliefert"].includes(nextStatus)) {
      return NextResponse.json({ ok: false, message: "Ungültiger Status" }, { status: 400 });
    }

    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    // Erlaubte Wechsel gemäss deiner Logik:
    // Tap: neu -> in_bearbeitung -> unterwegs -> neu
    // Swipe: unterwegs -> geliefert
    // Swipe auf geliefert: geliefert -> neu
    const allowedFromMap: Record<Status, Status[]> = {
      in_bearbeitung: ["neu"],
      unterwegs: ["in_bearbeitung"],
      geliefert: ["unterwegs"],
      neu: ["unterwegs", "geliefert"],
    };

    const allowedFrom = allowedFromMap[nextStatus];

    const patch: any = { status: nextStatus };

    if (nextStatus === "geliefert") {
      patch.delivered_at = new Date().toISOString();
    } else {
      patch.delivered_at = null;
    }

    const { data, error } = await supabase
      .from("orders")
      .update(patch)
      .eq("id", id)
      .eq("event_id", eventId)
      .in("status", allowedFrom)
      .select("id, status")
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    if (!data) {
      return NextResponse.json(
        { ok: false, message: "Statuswechsel nicht möglich (evtl. bereits geändert)" },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, status: data.status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
