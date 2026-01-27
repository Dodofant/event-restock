import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/adminSession";
import { supabaseServer } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;

    const body = (await req.json()) as { pin?: string };
    const pin = (body.pin ?? "").trim();

    if (!/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ ok: false, message: "PIN muss 4-8 Ziffern haben" }, { status: 400 });
    }

    const pin_hash = await bcrypt.hash(pin, 10);

    const supabase = supabaseServer();
    const { error } = await supabase.from("runners").update({ pin_hash }).eq("id", id);

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
