import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireLocationSession } from "@/lib/auth/locationSession";
import { getActiveEventId } from "@/lib/settings/activeEvent";

export async function GET() {
  try {
    const { loc } = await requireLocationSession();
    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    const { data: locRow, error: locErr } = await supabase
      .from("locations")
      .select("id")
      .eq("id", loc)
      .eq("event_id", eventId)
      .limit(1);

    if (locErr) return NextResponse.json({ ok: false, message: locErr.message }, { status: 500 });
    if (!locRow || locRow.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Location nicht gefunden oder nicht im aktiven Event" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("location_items")
      .select("item_id, items:items (id, name, category, subcategory, default_unit, pack_size)")
      .eq("event_id", eventId)
      .eq("location_id", loc)
      .eq("active", true);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    const items = data?.map((row: any) => row.items).filter(Boolean) ?? [];
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}