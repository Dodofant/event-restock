import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/adminSession";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;

    const supabase = supabaseServer();

    const { error } = await supabase.from("events").update({ status: "archived" }).eq("id", id);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
