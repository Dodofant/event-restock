import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createAdminSessionToken } from "@/lib/auth/adminSession";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { pin?: string };
    const pin = (body.pin ?? "").trim();

    const expected = process.env.ADMIN_ACCESS_PIN;
    if (!expected) return NextResponse.json({ ok: false, message: "ADMIN_ACCESS_PIN fehlt" }, { status: 500 });
    if (pin !== expected) return NextResponse.json({ ok: false, message: "Falscher PIN" }, { status: 401 });

    const token = await createAdminSessionToken();
    const res = NextResponse.json({ ok: true });

    res.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * Number(process.env.ADMIN_SESSION_TTL_HOURS ?? "12"),
    });

    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
