import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/adminSession";
import { supabaseServer } from "@/lib/supabase/server";
import { setActiveEventId } from "@/lib/settings/activeEvent";

export async function GET() {
  try {
    await requireAdminSession();
    const supabase = supabaseServer();

    const { data, error } = await supabase
      .from("events")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, events: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = (await req.json()) as { name?: string; setActive?: boolean };

    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ ok: false, message: "Name fehlt" }, { status: 400 });

    const supabase = supabaseServer();

    const { data: created, error } = await supabase
      .from("events")
      .insert({ name, status: "active" })
      .select("id, name, status, created_at")
      .single();

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    if (body.setActive) {
      await setActiveEventId(created.id);
    }

    return NextResponse.json({ ok: true, event: created });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
