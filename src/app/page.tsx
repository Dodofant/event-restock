import Link from "next/link";
import Image from "next/image";
import { supabaseServer } from "@/lib/supabase/server";
import HomeHeader from "@/components/home/HomeHeader";
import ClientLocationsLauncher from "@/components/home/ClientLocationsLauncher";

type LocationRow = {
  id: string;
  public_id: string;
  name: string;
  type: "bar" | "food";
  active: boolean;
};

export default async function HomePage() {
  const supabase = supabaseServer();

  // Aktives Event direkt aus events holen (ohne settings Tabelle)
  const { data: activeEv } = await supabase
    .from("events")
    .select("id, name")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeEventId = activeEv?.id ?? "";
  const activeEventName = activeEv?.name ?? null;

  // Aktive Locations
  const { data: locs } = await supabase
    .from("locations")
    .select("id, public_id, name, type, active")
    .eq("active", true)
    .order("name", { ascending: true });

  const locations = (locs ?? []) as LocationRow[];

  return (
    <div className="container">
      <div className="grid gap-10">
        <HomeHeader title=""/>

        <div className="home-logo">
          <Image
            src="/brand/logo.png"
            alt="NachschubApp"
            width={256}
            height={256}
            priority
          />
        </div>

        <div className="card grid gap-10">
          <div>
            <div className="h2">Aktives Event</div>
            <div className="small-muted mt-10">
              {activeEventId ? activeEventName ?? "Aktives Event ist gesetzt (Name nicht verfügbar)" : "Kein aktives Event gesetzt"}
            </div>
          </div>
        </div>

        <div className="card grid gap-10">
          <div className="h2">Runner</div>

          <div className="row row-between row-wrap gap-10">
            <div className="small-muted">Bestellungen annehmen und liefern.</div>

            <Link className="btn-pill form-action" href="/runner">
              Öffnen
            </Link>
          </div>
        </div>

        <div className="card grid gap-10">
          <div className="h2">Locations</div>

          {locations.length === 0 ? (
            <div className="small-muted">Keine aktiven Locations.</div>
          ) : (
            <ClientLocationsLauncher
              locations={locations.map((l) => ({ public_id: l.public_id, name: l.name, type: l.type }))}
            />
          )}
        </div>

        <div className="card grid gap-10">
          <div className="h2">Admin</div>

          <div className="row row-between row-wrap gap-10">
            <div className="small-muted">Verwalten von Events, Läufer und Artikel.</div>

            <Link className="btn-pill form-action" href="/admin">
              Öffnen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
