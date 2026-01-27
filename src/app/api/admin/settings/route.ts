import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/adminSession";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireAdminSession();
    const supabase = supabaseServer();

    const { data: s, error: sErr } = await supabase
      .from("app_settings")
      .select("active_event_id")
      .eq("id", 1)
      .single();

    if (sErr) return NextResponse.json({ ok: false, message: sErr.message }, { status: 500 });

    const { data: events, error: eErr } = await supabase
      .from("events")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false });

    if (eErr) return NextResponse.json({ ok: false, message: eErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, activeEventId: s?.active_event_id ?? null, events: events ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdminSession();
    const body = (await req.json()) as { activeEventId?: string };

    if (!body.activeEventId) {
      return NextResponse.json({ ok: false, message: "activeEventId fehlt" }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Sicherstellen, dass Event existiert und aktiv ist
    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select("id, status")
      .eq("id", body.activeEventId)
      .single();

    if (evErr) return NextResponse.json({ ok: false, message: evErr.message }, { status: 500 });
    if (!ev) return NextResponse.json({ ok: false, message: "Event nicht gefunden" }, { status: 404 });
    if (ev.status === "archived") {
      return NextResponse.json({ ok: false, message: "Archiviertes Event kann nicht aktiv gesetzt werden" }, { status: 409 });
    }

    const { error: upErr } = await supabase
      .from("app_settings")
      .update({ active_event_id: body.activeEventId })
      .eq("id", 1);

    if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
