import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireRunnerSession } from "@/lib/auth/runnerSession";
import { getActiveEventId } from "@/lib/settings/activeEvent";

export async function GET() {
  try {
    await requireRunnerSession();
    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, status, priority, note, created_at, location_id")
      .eq("event_id", eventId)
      .is("archived_at", null)
      .in("status", ["neu", "in_bearbeitung", "unterwegs", "geliefert"])
      .order("created_at", { ascending: true });

    if (ordersErr) {
      return NextResponse.json({ ok: false, message: ordersErr.message }, { status: 500 });
    }

    const safeOrders = orders ?? [];

    const locationIds = Array.from(
      new Set(
        safeOrders
          .map((o) => o.location_id)
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      )
    );

    let locations: Array<{ id: string; name: string; type: any }> = [];
    if (locationIds.length > 0) {
      const { data, error: locErr } = await supabase
        .from("locations")
        .select("id, name, type")
        .eq("event_id", eventId)
        .in("id", locationIds);

      if (locErr) {
        return NextResponse.json({ ok: false, message: locErr.message }, { status: 500 });
      }
      locations = (data ?? []) as any;
    }

    const locMap = new Map(locations.map((l) => [l.id, l]));

    const orderIds = safeOrders
      .map((o) => o.id)
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0);

    const linesByOrder = new Map<string, any[]>();
    if (orderIds.length > 0) {
      const { data: lines, error: linesErr } = await supabase
        .from("order_lines")
        .select("order_id, qty, unit, items:items (id, name)")
        .in("order_id", orderIds);

      if (linesErr) {
        return NextResponse.json({ ok: false, message: linesErr.message }, { status: 500 });
      }

      for (const l of lines ?? []) {
        const arr = linesByOrder.get(l.order_id) ?? [];
        const item = Array.isArray(l.items) ? l.items[0] : l.items;

        arr.push({
          qty: l.qty,
          unit: l.unit,
          itemName: item?.name ?? "Unbekannt",
        });
        linesByOrder.set(l.order_id, arr);
      }
    }

    const result = safeOrders.map((o) => {
      const loc = locMap.get(o.location_id as any);

      // ROBUST: type normalisieren (zB. "Food", "food ", null)
      const rawType = (loc as any)?.type;
      const normType = typeof rawType === "string" ? rawType.trim().toLowerCase() : "";
      const locType: "bar" | "food" = normType === "food" ? "food" : "bar";

      return {
        id: o.id,
        status: o.status,
        priority: o.priority,
        note: o.note,
        createdAt: o.created_at,
        location: loc ? { name: loc.name, type: locType } : { name: "Unbekannt", type: "bar" },
        lines: linesByOrder.get(o.id) ?? [],
      };
    });

    return NextResponse.json({ ok: true, orders: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
