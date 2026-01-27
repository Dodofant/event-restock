import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/adminSession";
import { hashPin } from "@/lib/security/pin";

function randomDigits(len: number) {
  let out = "";
  for (let i = 0; i < len; i++) out += String(Math.floor(Math.random() * 10));
  return out;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id: srcEventId } = await params;

    const supabase = supabaseServer();

    const { data: srcEvent, error: evErr } = await supabase
      .from("events")
      .select("id, name, status")
      .eq("id", srcEventId)
      .maybeSingle();

    if (evErr) return NextResponse.json({ ok: false, message: evErr.message }, { status: 500 });
    if (!srcEvent) return NextResponse.json({ ok: false, message: "Event nicht gefunden" }, { status: 404 });

    const { data: newEvent, error: newEvErr } = await supabase
      .from("events")
      .insert({
        name: `${srcEvent.name} (Kopie)`,
        status: "active",
      })
      .select("id")
      .single();

    if (newEvErr || !newEvent?.id) {
      return NextResponse.json({ ok: false, message: newEvErr?.message ?? "Event konnte nicht erstellt werden." }, { status: 500 });
    }

    const newEventId = newEvent.id as string;

    // Items kopieren (mit ID Mapping)
    const { data: srcItems, error: itErr } = await supabase
      .from("items")
      .select("id, name, category, default_unit, pack_size, active")
      .eq("event_id", srcEventId);

    if (itErr) return NextResponse.json({ ok: false, message: itErr.message }, { status: 500 });

    const itemIdMap = new Map<string, string>();

    if ((srcItems ?? []).length > 0) {
      for (const it of srcItems ?? []) {
        const { data: createdItem, error: insItErr } = await supabase
          .from("items")
          .insert({
            event_id: newEventId,
            name: it.name,
            category: it.category,
            default_unit: it.default_unit,
            pack_size: it.pack_size,
            active: it.active,
          })
          .select("id")
          .single();

        if (insItErr || !createdItem?.id) {
          return NextResponse.json({ ok: false, message: insItErr?.message ?? "Item Copy fehlgeschlagen" }, { status: 500 });
        }
        itemIdMap.set(it.id, createdItem.id);
      }
    }

    // Locations kopieren (mit ID Mapping) und PIN absichtlich unbekannt
    const { data: srcLocs, error: locErr } = await supabase
      .from("locations")
      .select("id, name, type, active")
      .eq("event_id", srcEventId);

    if (locErr) return NextResponse.json({ ok: false, message: locErr.message }, { status: 500 });

    const locIdMap = new Map<string, string>();

    if ((srcLocs ?? []).length > 0) {
      for (const l of srcLocs ?? []) {
        const unknownPin = randomDigits(8);
        const pin_hash = await hashPin(unknownPin);

        const public_id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

        const { data: createdLoc, error: insLocErr } = await supabase
          .from("locations")
          .insert({
            event_id: newEventId,
            public_id,
            name: l.name,
            type: l.type,
            active: l.active,
            pin_hash,
          })
          .select("id")
          .single();

        if (insLocErr || !createdLoc?.id) {
          return NextResponse.json({ ok: false, message: insLocErr?.message ?? "Location Copy fehlgeschlagen" }, { status: 500 });
        }

        locIdMap.set(l.id, createdLoc.id);
      }
    }

    // location_items kopieren
    const { data: srcMaps, error: mapErr } = await supabase
      .from("location_items")
      .select("location_id, item_id, active, sort")
      .eq("event_id", srcEventId);

    if (mapErr) return NextResponse.json({ ok: false, message: mapErr.message }, { status: 500 });

    if ((srcMaps ?? []).length > 0) {
      const rows = [];
      for (const m of srcMaps ?? []) {
        const newLoc = locIdMap.get(m.location_id);
        const newItem = itemIdMap.get(m.item_id);
        if (!newLoc || !newItem) continue;

        rows.push({
          event_id: newEventId,
          location_id: newLoc,
          item_id: newItem,
          active: m.active ?? true,
          sort: m.sort ?? 0,
        });
      }

      if (rows.length > 0) {
        const { error: insMapErr } = await supabase.from("location_items").insert(rows);
        if (insMapErr) return NextResponse.json({ ok: false, message: insMapErr.message }, { status: 500 });
      }
    }

    // runners kopieren (PIN Hash übernehmen)
    const { data: srcRunners, error: runErr } = await supabase
      .from("runners")
      .select("name, pin_hash, active")
      .eq("event_id", srcEventId);

    if (runErr) return NextResponse.json({ ok: false, message: runErr.message }, { status: 500 });

    if ((srcRunners ?? []).length > 0) {
      const rows = (srcRunners ?? []).map((r: any) => ({
        event_id: newEventId,
        name: r.name,
        pin_hash: r.pin_hash,
        active: r.active ?? true,
      }));

      const { error: insRunErr } = await supabase.from("runners").insert(rows);
      if (insRunErr) return NextResponse.json({ ok: false, message: insRunErr.message }, { status: 500 });
    }

    // Neues Event aktiv setzen
    const { error: setErr } = await supabase.from("app_settings").update({ active_event_id: newEventId }).eq("id", 1);
    if (setErr) return NextResponse.json({ ok: false, message: setErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, newEventId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
