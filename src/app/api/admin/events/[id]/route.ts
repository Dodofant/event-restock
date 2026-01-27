import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/adminSession";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;

    const body = (await req.json()) as { name?: string };
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (name.length < 2) {
      return NextResponse.json({ ok: false, message: "Event Name ist zu kurz." }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { error } = await supabase.from("events").update({ name }).eq("id", id);

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
