import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/adminSession";
import { getActiveEventId } from "@/lib/settings/activeEvent";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const eventId = await getActiveEventId();

    const body = (await req.json()) as { name?: string; type?: "bar" | "food"; active?: boolean };

    const patch: any = {};
    if (typeof body.name === "string") patch.name = body.name.trim();
    if (body.type === "bar" || body.type === "food") patch.type = body.type;
    if (typeof body.active === "boolean") patch.active = body.active;

    const supabase = supabaseServer();
    const { error } = await supabase.from("locations").update(patch).eq("id", id).eq("event_id", eventId);

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const eventId = await getActiveEventId();

    const supabase = supabaseServer();

    // Historie schützen: gibt es Orders im aktiven Event für diese Location?
    const { data: hasOrder, error: hasOrderErr } = await supabase
      .from("orders")
      .select("id")
      .eq("event_id", eventId)
      .eq("location_id", id)
      .limit(1);

    if (hasOrderErr) return NextResponse.json({ ok: false, message: hasOrderErr.message }, { status: 500 });

    if ((hasOrder ?? []).length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Location kann nicht gelöscht werden, weil bereits Bestellungen existieren. Bitte deaktivieren.",
        },
        { status: 409 }
      );
    }

    // Zuweisungen im aktiven Event entfernen
    const { error: delMapErr } = await supabase
      .from("location_items")
      .delete()
      .eq("event_id", eventId)
      .eq("location_id", id);

    if (delMapErr) return NextResponse.json({ ok: false, message: delMapErr.message }, { status: 500 });

    // Location löschen (nur aktives Event)
    const { error: delLocErr } = await supabase.from("locations").delete().eq("event_id", eventId).eq("id", id);
    if (delLocErr) return NextResponse.json({ ok: false, message: delLocErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}



