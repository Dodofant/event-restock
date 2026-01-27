import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/adminSession";

type Category = "drink" | "food" | "other";
type Unit = "stk" | "gebinde";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;

    const body = (await req.json()) as {
      name?: string;
      category?: Category;
      // subcategory absichtlich NICHT patchbar
      default_unit?: Unit;
      pack_size?: number | null;
      active?: boolean;
    };

    const patch: any = {};
    if (typeof body.name === "string") patch.name = body.name.trim();

    if (body.category === "drink" || body.category === "food" || body.category === "other") patch.category = body.category;
    if (body.default_unit === "stk" || body.default_unit === "gebinde") patch.default_unit = body.default_unit;

    if (body.pack_size === null) patch.pack_size = null;
    if (typeof body.pack_size === "number") patch.pack_size = body.pack_size === 0 ? null : Number(body.pack_size);

    if (typeof body.active === "boolean") patch.active = body.active;

    const supabase = supabaseServer();
    const { error } = await supabase.from("items").update(patch).eq("id", id);

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

    const supabase = supabaseServer();

    // Wenn es Order Lines gibt, nicht löschen (Historie schützen)
    const { data: hasLines, error: hasLinesErr } = await supabase
      .from("order_lines")
      .select("order_id")
      .eq("item_id", id)
      .limit(1);

    if (hasLinesErr) {
      return NextResponse.json({ ok: false, message: hasLinesErr.message }, { status: 500 });
    }

    if ((hasLines ?? []).length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Artikel kann nicht gelöscht werden, weil er bereits in Bestellungen verwendet wurde. Bitte deaktivieren.",
        },
        { status: 409 }
      );
    }

    // Zuweisungen entfernen
    const { error: delMapErr } = await supabase.from("location_items").delete().eq("item_id", id);
    if (delMapErr) {
      return NextResponse.json({ ok: false, message: delMapErr.message }, { status: 500 });
    }

    // Item löschen
    const { error: delItemErr } = await supabase.from("items").delete().eq("id", id);
    if (delItemErr) {
      return NextResponse.json({ ok: false, message: delItemErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}