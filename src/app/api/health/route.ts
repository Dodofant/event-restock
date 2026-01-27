// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = supabaseServer();

    // simpler Query, zählt Locations (kann 0 sein, das ist ok)
    const { count, error } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { ok: false, step: "query", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, locationsCount: count ?? 0 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ ok: false, step: "env", message }, { status: 500 });
  }
}