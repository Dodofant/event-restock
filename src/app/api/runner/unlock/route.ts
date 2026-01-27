import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/settings/activeEvent";
import { validatePin, verifyPin } from "@/lib/security/pin";
import { RUNNER_COOKIE_NAME, createRunnerSessionToken } from "@/lib/auth/runnerSession";

type Body = { runnerId?: string; pin?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const runnerId = (body.runnerId ?? "").trim();
    const pin = (body.pin ?? "").trim();

    // Fallback: alte MVP Variante (globaler PIN), falls runnerId nicht mitgeschickt wird
    if (!runnerId) {
      const expected = process.env.RUNNER_ACCESS_PIN;
      if (!expected) {
        return NextResponse.json(
          { ok: false, message: "runnerId fehlt (und RUNNER_ACCESS_PIN ist nicht gesetzt)" },
          { status: 400 }
        );
      }

      if (pin !== expected) {
        return NextResponse.json({ ok: false, message: "Falscher PIN" }, { status: 401 });
      }

      const token = await createRunnerSessionToken();
      const res = NextResponse.json({ ok: true });

      res.cookies.set({
        name: RUNNER_COOKIE_NAME,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * Number(process.env.RUNNER_SESSION_TTL_HOURS ?? "12"),
      });

      return res;
    }

    // Neue Variante: Runner auswählen + PIN prüfen
    if (!validatePin(pin)) {
      return NextResponse.json({ ok: false, message: "PIN muss 4 bis 6 Ziffern haben" }, { status: 400 });
    }

    const supabase = supabaseServer();
    const eventId = await getActiveEventId();

    const { data: runner, error } = await supabase
      .from("runners")
      .select("id, name, pin_hash, active, event_id")
      .eq("id", runnerId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    if (!runner || !runner.active) {
      return NextResponse.json({ ok: false, message: "Runner nicht gefunden oder inaktiv" }, { status: 404 });
    }

    if (runner.event_id !== eventId) {
      return NextResponse.json({ ok: false, message: "Runner gehört nicht zum aktiven Event" }, { status: 409 });
    }

    const ok = await verifyPin(pin, runner.pin_hash);
    if (!ok) {
      return NextResponse.json({ ok: false, message: "Falscher PIN" }, { status: 401 });
    }

    const token = await createRunnerSessionToken();
    const res = NextResponse.json({ ok: true, runnerName: runner.name });

    res.cookies.set({
      name: RUNNER_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * Number(process.env.RUNNER_SESSION_TTL_HOURS ?? "12"),
    });

    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
