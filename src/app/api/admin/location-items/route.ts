import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/adminSession";
import { getActiveEventId } from "@/lib/settings/activeEvent";

export async function GET(req: Request) {
  try {
    await requireAdminSession();
    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    const { searchParams } = new URL(req.url);
    const locationId = (searchParams.get("locationId") ?? "").trim();
    if (!locationId) return NextResponse.json({ ok: false, message: "locationId fehlt" }, { status: 400 });

    const { data, error } = await supabase
      .from("location_items")
      .select("location_id, item_id, active, sort, items:items (id, name, category, default_unit, pack_size, active)")
      .eq("event_id", eventId)
      .eq("location_id", locationId);

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, rows: data ?? [] });
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

    const body = (await req.json()) as {
      locationId?: string;
      itemId?: string;
      active?: boolean;
      sort?: number;
    };

    const locationId = (body.locationId ?? "").trim();
    const itemId = (body.itemId ?? "").trim();

    if (!locationId || !itemId) {
      return NextResponse.json({ ok: false, message: "locationId oder itemId fehlt" }, { status: 400 });
    }

    const row: any = {
      event_id: eventId,
      location_id: locationId,
      item_id: itemId,
      active: typeof body.active === "boolean" ? body.active : true,
      sort: typeof body.sort === "number" ? body.sort : 0,
    };

    // upsert braucht passenden unique constraint (event_id, location_id, item_id)
    const { error } = await supabase
      .from("location_items")
      .upsert(row, { onConflict: "event_id,location_id,item_id" });

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdminSession();
    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    const body = (await req.json()) as { locationId?: string; itemId?: string };
    const locationId = (body.locationId ?? "").trim();
    const itemId = (body.itemId ?? "").trim();

    if (!locationId || !itemId) {
      return NextResponse.json({ ok: false, message: "locationId oder itemId fehlt" }, { status: 400 });
    }

    const { error } = await supabase
      .from("location_items")
      .delete()
      .eq("event_id", eventId)
      .eq("location_id", locationId)
      .eq("item_id", itemId);

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
