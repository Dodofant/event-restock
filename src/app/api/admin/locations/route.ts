import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/adminSession";
import { getActiveEventId } from "@/lib/settings/activeEvent";
import { randomBytes } from "crypto";

function makePublicId() {
  // 16 hex wie bei dir: 896cfbb328a0dc80
  return randomBytes(8).toString("hex");
}

export async function GET() {
  try {
    await requireAdminSession();
    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    const { data, error } = await supabase
      .from("locations")
      .select("id, public_id, name, type, active")
      .eq("event_id", eventId)
      .order("name", { ascending: true });

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, locations: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    const body = (await req.json()) as { name?: string; type?: "bar" | "food"; active?: boolean };

    const name = (body.name ?? "").trim();
    const type = body.type === "food" ? "food" : "bar";
    const active = typeof body.active === "boolean" ? body.active : true;

    if (!name) {
      return NextResponse.json({ ok: false, message: "Name fehlt" }, { status: 400 });
    }

    const insertRow: any = {
      event_id: eventId,
      public_id: makePublicId(),
      name,
      type,
      active,
      // pin_hash bleibt null, wenn du es nullable gemacht hast (wie empfohlen)
    };

    const { data, error } = await supabase
      .from("locations")
      .insert(insertRow)
      .select("id, public_id, name, type, active")
      .single();

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, location: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
