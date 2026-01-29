# Event Restock

Kleine, schlanke Web App für die **Bestandsverwaltung und Nachschub** an Events (zB Bar, Foodstände).  
Admins pflegen **Events, Locations, Artikel, Zuweisungen und Runner**. Locations erstellen Bestellungen, Runner sehen offene Aufträge und liefern diese aus.

Repository: https://github.com/Dodofant/event-restock

---

## Features

### Admin (`/admin`)
- PIN-basierter Admin Zugriff (Session Cookie mit TTL)
- Events verwalten
  - aktives Event wählen
  - Event erstellen
  - Event duplizieren
  - Event archivieren
- Locations verwalten
  - Location erstellen, umbenennen, duplizieren, aktivieren/deaktivieren, löschen
  - QR Code für Location Link
  - PIN pro Location setzen
- Artikel verwalten
  - Kategorie, Unterkategorie, Packart (Stk/Gebinde), Packgrösse
  - aktivieren/deaktivieren, löschen (mit Historien-Schutz)
- Zuweisung
  - Location auswählen
  - Zugewiesene Artikel verwalten (Sortierung, entfernen)
  - Verfügbare Artikel hinzufügen

### Location UI (`/l/:publicId`)
- Zugriff über Location PIN (Session TTL)
- Bestellungen erfassen (Order + Order Lines)
- Übersicht / Workflow je nach Umsetzung im UI

### Runner UI
- Zugriff via PIN (Runner Session TTL)
- Offene Bestellungen sehen, liefern, Status setzen

---

## Tech Stack

- Next.js (App Router)
- TypeScript
- Supabase (Postgres)
- Minimal CSS (kein Tailwind notwendig)

---

## Voraussetzungen

- Node.js 20+
- Supabase Projekt (DB + Keys)

---

## Lokales Setup

### 1) Repo klonen & Dependencies installieren

```bash
git clone https://github.com/Dodofant/event-restock.git
cd event-restock
npm install
```

### 2) Supabase Projekt einrichten

Erstelle ein Supabase Projekt und führe anschliessend die SQL Migrationen aus (siehe `/sql` Ordner im Repo).

Danach brauchst du:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

> Wichtig: **Service Role Key nur serverseitig verwenden** (nie ins Frontend).

### 3) `.env.local` erstellen

Lege im Projektroot eine Datei `.env.local` an:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# nur serverseitig verwenden
SUPABASE_SERVICE_ROLE_KEY=...

# Sessions / Tokens

LOCATION_SESSION_TTL_HOURS=24
RUNNER_SESSION_TTL_HOURS=24
ADMIN_SESSION_TTL_HOURS=24

# Admin Zugang
ADMIN_ACCESS_PIN=...

# Signatur für Cookies/Tokens (serverseitig)
SESSION_SIGNING_SECRET=...
RUNNER_SESSION_SECRET=...
LOCATION_SESSION_SECRET=...
```

---

## Secrets generieren (SESSION_SIGNING_SECRET / LOCATION_SESSION_SECRET / RUNNER_SESSION_SECRET)

Am einfachsten über Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Oder über OpenSSL:

```bash
openssl rand -hex 32
```

Diese Werte in `.env.local` übernehmen:

- `SESSION_SIGNING_SECRET`
- `LOCATION_SESSION_SECRET`
- `RUNNER_SESSION_SECRET`

Empfehlung:
- **mindestens 32 Bytes** (64 Hex Zeichen)
- pro Projekt unique
- niemals committen

---

## Starten (Dev)

```bash
npm run dev
```

App läuft danach standardmässig auf:
- http://localhost:3000

---

## Admin Zugriff

Admin Panel:
- http://localhost:3000/admin

Der Zugriff ist **PIN-basiert**. Es wird **kein Supabase Auth Admin User** benötigt.
Die API Routen prüfen serverseitig via `requireAdminSession()`.

---

## Deploy auf Vercel

### 1) Projekt in Vercel importieren
- GitHub Repo verbinden
- Framework automatisch: Next.js

### 2) Environment Variables setzen
In Vercel unter **Project Settings → Environment Variables** alle Variablen aus `.env.local` setzen:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_ACCESS_PIN`
- `ADMIN_SESSION_TTL_HOURS`
- `SESSION_SIGNING_SECRET`
- `LOCATION_SESSION_SECRET`
- `LOCATION_SESSION_TTL_HOURS`
- `RUNNER_SESSION_TTL_HOURS`
- optional: `APP_VERSION`, `BUILD_TIME`

> Achtung: Alles mit `SERVICE_ROLE` oder `*_SECRET` muss **Server-only** bleiben.

### 3) Deploy
Vercel baut automatisch bei jedem Push.

---

## Datenmodell (Kurzüberblick)

Typische Tabellen (je nach Stand des Repos):
- `events`
- `app_settings` (zB `active_event_id`)
- `locations`
- `items`
- `location_items` (Zuweisung + Sort)
- `runners`
- `orders`
- `order_lines`

---

## Hinweise zur Sicherheit

- Adminzugriff läuft über PIN + signierte Session Cookies
- `SUPABASE_SERVICE_ROLE_KEY` nur serverseitig
- Optional empfehlenswert: Rate Limiting / Lockout auf PIN Endpoints

---

## Lizenz

GPL-3.0 (siehe `LICENSE`)
