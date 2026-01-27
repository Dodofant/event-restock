import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireLocationSession } from "@/lib/auth/locationSession";

export async function GET() {
  try {
    const { loc } = await requireLocationSession();
    const supabase = supabaseServer();

    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, status, priority, note, created_at, archived_at")
      .eq("location_id", loc)
      .order("created_at", { ascending: false })
      .limit(20);

    if (ordersErr) {
      return NextResponse.json({ ok: false, message: ordersErr.message }, { status: 500 });
    }

    const orderIds = (orders ?? []).map((o) => o.id);
    if (orderIds.length === 0) {
      return NextResponse.json({ ok: true, orders: [] });
    }

    const { data: lines, error: linesErr } = await supabase
      .from("order_lines")
      .select("order_id, qty, unit, items:items (id, name)")
      .in("order_id", orderIds);

    if (linesErr) {
      return NextResponse.json({ ok: false, message: linesErr.message }, { status: 500 });
    }

    const linesByOrder = new Map<string, any[]>();
    for (const l of (lines ?? []) as any[]) {
      const arr = linesByOrder.get(l.order_id) ?? [];
      const item = Array.isArray(l.items) ? l.items[0] : l.items;

      arr.push({
        qty: l.qty,
        unit: l.unit,
        itemName: item?.name ?? "Unbekannt",
      });

      linesByOrder.set(l.order_id, arr);
    }

    const result = (orders ?? []).map((o) => ({
      id: o.id,
      status: o.status,
      priority: o.priority,
      note: o.note,
      createdAt: o.created_at,
      archivedAt: o.archived_at,
      lines: linesByOrder.get(o.id) ?? [],
    }));

    return NextResponse.json({ ok: true, orders: result, locationId: loc });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
