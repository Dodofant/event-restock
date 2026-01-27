import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/adminSession";
import { getActiveEventId } from "@/lib/settings/activeEvent";
import { hashPin } from "@/lib/security/pin";

function randomDigits(len: number) {
  let out = "";
  for (let i = 0; i < len; i++) out += String(Math.floor(Math.random() * 10));
  return out;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const eventId = await getActiveEventId();

    const supabase = supabaseServer();

    const { data: src, error: srcErr } = await supabase
      .from("locations")
      .select("id, name, type, active")
      .eq("event_id", eventId)
      .eq("id", id)
      .maybeSingle();

    if (srcErr) return NextResponse.json({ ok: false, message: srcErr.message }, { status: 500 });
    if (!src) return NextResponse.json({ ok: false, message: "Location nicht gefunden" }, { status: 404 });

    // PIN bewusst unbekannt machen (not null constraint bleibt erfüllt)
    const unknownPin = randomDigits(8);
    const pin_hash = await hashPin(unknownPin);

    const public_id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const name = `${src.name} (Kopie)`;

    const { data: created, error: insErr } = await supabase
      .from("locations")
      .insert({
        event_id: eventId,
        public_id,
        name,
        type: src.type,
        active: src.active,
        pin_hash,
      })
      .select("id")
      .single();

    if (insErr || !created?.id) {
      return NextResponse.json({ ok: false, message: insErr?.message ?? "Location konnte nicht erstellt werden." }, { status: 500 });
    }

    const newLocId = created.id as string;

    // Zuweisungen kopieren
    const { data: maps, error: mapErr } = await supabase
      .from("location_items")
      .select("item_id, active, sort")
      .eq("event_id", eventId)
      .eq("location_id", id);

    if (mapErr) return NextResponse.json({ ok: false, message: mapErr.message }, { status: 500 });

    if ((maps ?? []).length > 0) {
      const rows = (maps ?? []).map((m: any) => ({
        event_id: eventId,
        location_id: newLocId,
        item_id: m.item_id,
        active: m.active ?? true,
        sort: m.sort ?? 0,
      }));

      const { error: mapInsErr } = await supabase.from("location_items").insert(rows);
      if (mapInsErr) {
        return NextResponse.json({ ok: false, message: mapInsErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, newLocationId: newLocId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
