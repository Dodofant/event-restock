import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/adminSession";

export async function GET() {
  try {
    await requireAdminSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nicht freigeschaltet";
    return NextResponse.json({ ok: false, message }, { status: 401 });
  }
}
