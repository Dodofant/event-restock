import { supabaseServer } from "@/lib/supabase/server";

export async function getActiveEventId(): Promise<string> {
  const supabase = supabaseServer();

  const { data: s, error: sErr } = await supabase
    .from("app_settings")
    .select("active_event_id")
    .eq("id", 1)
    .single();

  if (sErr) throw new Error(sErr.message);
  if (!s?.active_event_id) throw new Error("Kein aktives Event gesetzt");

  return s.active_event_id as string;
}

export async function setActiveEventId(eventId: string): Promise<void> {
  const supabase = supabaseServer();

  const { error } = await supabase
    .from("app_settings")
    .update({ active_event_id: eventId })
    .eq("id", 1);

  if (error) throw new Error(error.message);
}
