import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { validatePin, verifyPin } from "@/lib/security/pin";
import { LOCATION_COOKIE_NAME, createLocationSessionToken } from "@/lib/auth/session";
import { getActiveEventId } from "@/lib/settings/activeEvent";

type Body = {
  publicId?: string;
  pin?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const publicId = (body.publicId ?? "").trim();
    const pin = (body.pin ?? "").trim();

    if (!publicId) {
      return NextResponse.json({ ok: false, message: "publicId fehlt" }, { status: 400 });
    }
    if (!validatePin(pin)) {
      return NextResponse.json({ ok: false, message: "PIN muss 4 bis 6 Ziffern haben" }, { status: 400 });
    }

    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    const { data: location, error } = await supabase
      .from("locations")
      .select("id, public_id, pin_hash, active, name, event_id")
      .eq("public_id", publicId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
    if (!location || !location.active) {
      return NextResponse.json({ ok: false, message: "Location nicht gefunden oder inaktiv" }, { status: 404 });
    }

    const ok = await verifyPin(pin, location.pin_hash);
    if (!ok) {
      return NextResponse.json({ ok: false, message: "Falscher PIN" }, { status: 401 });
    }

    const token = await createLocationSessionToken({ loc: location.id, pid: location.public_id });

    const res = NextResponse.json({ ok: true, locationName: location.name });

    res.cookies.set({
      name: LOCATION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * Number(process.env.LOCATION_SESSION_TTL_HOURS ?? "12"),
    });

    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
