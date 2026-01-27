import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/settings/activeEvent";

export async function GET() {
  try {
    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    const { data, error } = await supabase
      .from("runners")
      .select("id, name")
      .eq("event_id", eventId)
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, runners: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
