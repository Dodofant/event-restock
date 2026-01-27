import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/adminSession";

type Category = "drink" | "food" | "other";
type Unit = "stk" | "gebinde";

type Subcategory =
  | "bier"
  | "wein"
  | "softdrink"
  | "wasser"
  | "spirituosen"
  | "cocktail_mix"
  | "kaffee_tee"
  | "sonstiges_getraenk"
  | "fleisch"
  | "vegetarisch"
  | "beilage"
  | "teigwaren"
  | "brot_buns"
  | "sauce_dressing"
  | "snack"
  | "sonstiges_food"
  | "einweg"
  | "verpackung"
  | "hygiene"
  | "gas"
  | "technik"
  | "sonstiges_other";

const ALLOWED_SUBCATS: Record<Category, Set<string>> = {
  drink: new Set(["bier", "wein", "softdrink", "wasser", "spirituosen", "cocktail_mix", "kaffee_tee", "sonstiges_getraenk"]),
  food: new Set(["fleisch", "vegetarisch", "beilage", "teigwaren", "brot_buns", "sauce_dressing", "snack", "sonstiges_food"]),
  other: new Set(["einweg", "verpackung", "hygiene", "gas", "technik", "sonstiges_other"]),
};

const FALLBACK_SUBCAT: Record<Category, Subcategory> = {
  drink: "sonstiges_getraenk",
  food: "sonstiges_food",
  other: "sonstiges_other",
};

export async function GET() {
  try {
    await requireAdminSession();
    const supabase = supabaseServer();

    const { data, error } = await supabase
      .from("items")
      .select("id, name, category, subcategory, default_unit, pack_size, active, created_at")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const supabase = supabaseServer();

    const body = (await req.json()) as {
      name?: string;
      category?: Category;
      subcategory?: Subcategory;
      default_unit?: Unit;
      pack_size?: number | null;
      active?: boolean;
    };

    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ ok: false, message: "Name fehlt" }, { status: 400 });

    const category: Category = body.category === "food" ? "food" : body.category === "other" ? "other" : "drink";
    const default_unit: Unit = body.default_unit === "gebinde" ? "gebinde" : "stk";

    const subcategory: Subcategory =
      typeof body.subcategory === "string" && ALLOWED_SUBCATS[category].has(body.subcategory)
        ? (body.subcategory as Subcategory)
        : FALLBACK_SUBCAT[category];

    const pack_size =
      body.pack_size === null || body.pack_size === undefined || body.pack_size === 0 ? null : Number(body.pack_size);

    const active = body.active !== false;

    const { data, error } = await supabase
      .from("items")
      .insert({ name, category, subcategory, default_unit, pack_size, active })
      .select("id")
      .single();

    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = message === "Nicht freigeschaltet" ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}