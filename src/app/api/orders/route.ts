import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireLocationSession } from "@/lib/auth/locationSession";
import { getActiveEventId } from "@/lib/settings/activeEvent";

type Unit = "stk" | "gebinde";
type Priority = "normal" | "dringend";

type Body = {
  priority?: Priority;
  note?: string | null;
  lines?: Array<{
    itemId: string;
    qty: number;
    unit: Unit;
  }>;
};

function isUnit(v: any): v is Unit {
  return v === "stk" || v === "gebinde";
}

function isPriority(v: any): v is Priority {
  return v === "normal" || v === "dringend";
}

export async function POST(req: Request) {
  try {
    const { loc } = await requireLocationSession();
    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    const body = (await req.json()) as Body;

    const priority: Priority = isPriority(body.priority) ? body.priority : "normal";
    const note = typeof body.note === "string" ? body.note.trim() : null;

    const linesRaw = Array.isArray(body.lines) ? body.lines : [];
    const lines = linesRaw
      .map((l) => ({
        itemId: String(l.itemId ?? "").trim(),
        qty: Number(l.qty ?? 0),
        unit: l.unit as Unit,
      }))
      .filter((l) => l.itemId && Number.isFinite(l.qty) && l.qty > 0 && isUnit(l.unit));

    if (lines.length === 0) {
      return NextResponse.json({ ok: false, message: "Keine gültigen Positionen." }, { status: 400 });
    }

    // Guard: Location muss aktiv sein UND im aktiven Event sein
    const { data: locRow, error: locErr } = await supabase
      .from("locations")
      .select("id")
      .eq("id", loc)
      .eq("event_id", eventId)
      .eq("active", true)
      .maybeSingle();

    if (locErr) {
      return NextResponse.json({ ok: false, message: locErr.message }, { status: 500 });
    }
    if (!locRow) {
      return NextResponse.json({ ok: false, message: "Location nicht gefunden oder inaktiv" }, { status: 404 });
    }

    // Nur Items erlauben, die dieser Location im aktiven Event zugewiesen sind
    const itemIds = Array.from(new Set(lines.map((l) => l.itemId)));

    const { data: allowedRows, error: allowedErr } = await supabase
      .from("location_items")
      .select("item_id")
      .eq("event_id", eventId)
      .eq("location_id", loc)
      .eq("active", true)
      .in("item_id", itemIds);

    if (allowedErr) {
      return NextResponse.json({ ok: false, message: allowedErr.message }, { status: 500 });
    }

    const allowed = new Set((allowedRows ?? []).map((r: any) => r.item_id));
    const forbidden = itemIds.filter((id) => !allowed.has(id));

    if (forbidden.length > 0) {
      return NextResponse.json(
        { ok: false, message: "Ein Artikel ist für diese Location nicht freigegeben." },
        { status: 400 }
      );
    }

    // Order erstellen (mit event_id)
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        event_id: eventId,
        location_id: loc,
        status: "neu",
        priority,
        note: note && note.length > 0 ? note : null,
      })
      .select("id")
      .single();

    if (orderErr || !order?.id) {
      return NextResponse.json(
        { ok: false, message: orderErr?.message ?? "Bestellung konnte nicht erstellt werden." },
        { status: 500 }
      );
    }

    // Lines erstellen
    const orderLines = lines.map((l) => ({
      order_id: order.id,
      item_id: l.itemId,
      qty: l.qty,
      unit: l.unit,
    }));

    const { error: linesErr } = await supabase.from("order_lines").insert(orderLines);

    if (linesErr) {
      // Best effort rollback
      await supabase.from("orders").delete().eq("id", order.id).eq("event_id", eventId);
      return NextResponse.json({ ok: false, message: linesErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
