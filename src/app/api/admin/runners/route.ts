import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/adminSession";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/settings/activeEvent";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await requireAdminSession();
    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    const { data, error } = await supabase
      .from("runners")
      .select("id, name, active, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, runners: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = (await req.json()) as { name?: string; pin?: string; active?: boolean };

    const name = (body.name ?? "").trim();
    const pin = (body.pin ?? "").trim();

    if (!name) return NextResponse.json({ ok: false, message: "Name fehlt" }, { status: 400 });
    if (!/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ ok: false, message: "PIN muss 4-8 Ziffern haben" }, { status: 400 });
    }

    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    const pin_hash = await bcrypt.hash(pin, 10);

    const { data, error } = await supabase
      .from("runners")
      .insert({
        name,
        pin_hash,
        active: typeof body.active === "boolean" ? body.active : true,
        event_id: eventId,
      })
      .select("id, name, active, created_at")
      .single();

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, runner: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
