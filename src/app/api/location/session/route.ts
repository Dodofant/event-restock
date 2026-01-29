import { NextResponse } from "next/server";
import { requireLocationSession } from "@/lib/auth/locationSession";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const publicId = (url.searchParams.get("publicId") ?? "").trim();

    if (!publicId) {
      return NextResponse.json({ ok: false, message: "publicId fehlt" }, { status: 400 });
    }

    const session = await requireLocationSession(publicId);

    return NextResponse.json({
      ok: true,
      publicId: session?.pid ?? null,
      locationId: session?.loc ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nicht freigeschaltet";
    return NextResponse.json({ ok: false, message }, { status: 401 });
  }
}
