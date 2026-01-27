"use client";

import AppInfoButton from "@/components/shared/AppInfoButton";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

type LocationRow = {
  id: string;
  public_id: string;
  name: string;
  type: "bar" | "food";
  active: boolean;
};

type ItemRow = {
  id: string;
  name: string;
  category: "drink" | "food" | "other";
  subcategory:
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
  default_unit: "stk" | "gebinde";
  pack_size: number | null;
  active: boolean;
};

type EventRow = {
  id: string;
  name: string;
  status: "active" | "archived";
  created_at: string;
};

type RunnerRow = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

const CATEGORY_OPTIONS = [
  { value: "drink", label: "Getränke" },
  { value: "food", label: "Essen" },
  { value: "other", label: "Anderes" },
] as const;

const SUBCATEGORY_OPTIONS = {
  drink: [
    { value: "bier", label: "Bier" },
    { value: "wein", label: "Wein" },
    { value: "softdrink", label: "Softdrink" },
    { value: "wasser", label: "Wasser" },
    { value: "spirituosen", label: "Spirituosen" },
    { value: "cocktail_mix", label: "Cocktail Mix" },
    { value: "kaffee_tee", label: "Kaffee Tee" },
    { value: "sonstiges_getraenk", label: "Sonstiges Getränk" },
  ],
  food: [
    { value: "fleisch", label: "Fleisch" },
    { value: "vegetarisch", label: "Vegetarisch" },
    { value: "beilage", label: "Beilage" },
    { value: "teigwaren", label: "Teigwaren" },
    { value: "brot_buns", label: "Brot Buns" },
    { value: "sauce_dressing", label: "Sauce Dressing" },
    { value: "snack", label: "Snack" },
    { value: "sonstiges_food", label: "Sonstiges Food" },
  ],
  other: [
    { value: "einweg", label: "Einweg" },
    { value: "verpackung", label: "Verpackung" },
    { value: "hygiene", label: "Hygiene" },
    { value: "gas", label: "Gas" },
    { value: "technik", label: "Technik" },
    { value: "sonstiges_other", label: "Sonstiges" },
  ],
} as const;

function subcatLabel(category: ItemRow["category"], sub: ItemRow["subcategory"]) {
  return SUBCATEGORY_OPTIONS[category].find((x) => x.value === sub)?.label ?? sub;
}

const UNIT_OPTIONS = [
  { value: "stk", label: "Stk" },
  { value: "gebinde", label: "Gebinde" },
] as const;

function catLabel(v: ItemRow["category"]) {
  return CATEGORY_OPTIONS.find((x) => x.value === v)?.label ?? v;
}
function unitLabel(v: ItemRow["default_unit"]) {
  return UNIT_OPTIONS.find((x) => x.value === v)?.label ?? v;
}

export default function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"locations" | "items" | "assign" | "settings">("locations");

  return (
    <div className="container">
      <div className="row row-between row-wrap">
        <h1 className="h1">Adminpanel</h1>
        <div className="row row-end row-wrap gap-10">
          <AppInfoButton />
          <ThemeToggle />
          <button
            className="btn-pill"
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              onLogout();
            }}
          >
            Abmelden <i className="fa-solid fa-arrow-right-from-bracket" />
          </button> 
        </div>
      </div>      
      <div className="row mt-14 row-wrap gap-10">
        <button className="btn-pill" onClick={() => setTab("locations")}>
          Locations
        </button>
        <button className="btn-pill" onClick={() => setTab("items")}>
          Artikel
        </button>
        <button className="btn-pill" onClick={() => setTab("assign")}>
          Zuweisung
        </button>
        <button className="btn-pill" onClick={() => setTab("settings")}>
          Settings
        </button>
      </div>

      {tab === "locations" && <LocationsAdmin />}
      {tab === "items" && <ItemsAdmin />}
      {tab === "assign" && <AssignAdmin />}
      {tab === "settings" && <SettingsAdmin />}
    </div>
  );
}

/* ---------------- Locations ---------------- */

function LocationsAdmin() {
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"bar" | "food">("bar");
  const [error, setError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<null | { id: string; name: string }>(null);
  const [rename, setRename] = useState<null | { id: string; current: string }>(null);
  const [dupConfirm, setDupConfirm] = useState<null | { id: string; name: string }>(null);

  const [qrModal, setQrModal] = useState<null | { publicId: string; name: string }>(null);
  const [locMenuModal, setLocMenuModal] = useState<null | { id: string; name: string; active: boolean }>(null);

  async function load() {
    const res = await fetch("/api/admin/locations", { cache: "no-store" });
    const text = await res.text();

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }
    setRows(data.locations ?? []);
    setError(null);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const res = await fetch("/api/admin/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, active: true }),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    setName("");
    await load();
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/admin/locations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });

    if (!res.ok) {
      setError(`Fehler beim Speichern (HTTP ${res.status})`);
      return;
    }

    await load();
  }

  async function deleteLocationConfirmed(id: string) {
    const res = await fetch(`/api/admin/locations/${id}`, { method: "DELETE" });
    const text = await res.text();

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    await load();
  }

  async function renameLocationSave(id: string, newName: string) {
    const res = await fetch(`/api/admin/locations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    await load();
  }

  async function duplicateLocationConfirmed(id: string) {
    const res = await fetch(`/api/admin/locations/${id}/duplicate`, { method: "POST" });
    const text = await res.text();

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    await load();
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="mt-14 grid gap-10">
      <div className="card grid gap-10">
        <div className="row row-wrap gap-10">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />

          <select className="input" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="bar">Bar</option>
            <option value="food">Food</option>
          </select>

          <button className="btn-pill" onClick={create}>
            Location erstellen
          </button>
        </div>

        {error && <div className="bad-danger card">{error}</div>}
      </div>

      <div className="grid gap-10">
        {rows.map((l) => (
          <div key={l.id} className="card grid gap-10">
            <div className="row row-between items-start row-wrap">
              <div className="grid gap-6">
                <div className="fw-900">{l.name}</div>

                <div className="small-muted">
                  Typ: {l.type === "bar" ? "Bar" : "Food"} · Aktiv: {l.active ? "Ja" : "Nein"}
                </div>

                <div className="row row-wrap gap-8">
                  <div className="small-muted">
                    Link: <code>/l/{l.public_id}</code>
                  </div>

                  <button
                    className="btn-icon"
                    type="button"
                    title="Link kopieren"
                    aria-label="Link kopieren"
                    onClick={() => copyToClipboard(`${window.location.origin}/l/${l.public_id}`)}
                  >
                    <i className="fa-regular fa-copy" />
                  </button>
                </div>
              </div>

              <div className="grid gap-10 justify-items-end">
                <LocationActionsRow
                  qrActive={qrModal?.publicId === l.public_id}
                  onToggleQr={() =>
                    setQrModal(qrModal?.publicId === l.public_id ? null : { publicId: l.public_id, name: l.name })
                  }
                  onSettings={() => setLocMenuModal({ id: l.id, name: l.name, active: l.active })}
                />

                <PinSetterCompact locationId={l.id} onSaved={load} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <QrModal
        open={!!qrModal}
        title={qrModal ? `QR-Code: ${qrModal.name}` : "QR-Code"}
        publicId={qrModal?.publicId ?? ""}
        onClose={() => setQrModal(null)}
      />

      <ActionMenuModal
        open={!!locMenuModal}
        title={locMenuModal ? `Location: ${locMenuModal.name}` : "Location"}
        onClose={() => setLocMenuModal(null)}
        actions={[
          {
            label: "Umbenennen",
            onClick: () => {
              if (!locMenuModal) return;
              const { id, name } = locMenuModal;
              setLocMenuModal(null);
              setRename({ id, current: name });
            },
          },
          {
            label: "Duplizieren",
            onClick: () => {
              if (!locMenuModal) return;
              const { id, name } = locMenuModal;
              setLocMenuModal(null);
              setDupConfirm({ id, name });
            },
          },
          {
            label: locMenuModal?.active ? "Deaktivieren" : "Aktivieren",
            onClick: async () => {
              if (!locMenuModal) return;
              const { id, active } = locMenuModal;
              setLocMenuModal(null);
              await toggleActive(id, !active);
            },
          },
          {
            label: "Löschen",
            danger: true,
            onClick: () => {
              if (!locMenuModal) return;
              const { id, name } = locMenuModal;
              setLocMenuModal(null);
              setConfirmDelete({ id, name });
            },
          },
        ]}
      />

      <PromptModal
        open={!!rename}
        title="Location umbenennen"
        message={rename ? `Aktuell: ${rename.current}` : ""}
        placeholder="Neuer Name"
        initialValue={rename?.current ?? ""}
        confirmText="Speichern"
        cancelText="Abbrechen"
        validate={(v) => (v.trim().length < 2 ? "Bitte mindestens 2 Zeichen eingeben." : null)}
        onCancel={() => setRename(null)}
        onConfirm={async (v) => {
          if (!rename) return;
          const id = rename.id;
          setRename(null);
          await renameLocationSave(id, v);
        }}
      />

      <ConfirmDialog
        open={!!dupConfirm}
        title="Location duplizieren?"
        message={
          dupConfirm
            ? `Willst du diese Location duplizieren?\n\n${dupConfirm.name}\n\nAlle zugewiesenen Artikel werden übernommen.\nPIN ist danach leer und muss neu gesetzt werden.`
            : ""
        }
        confirmText="Duplizieren"
        cancelText="Abbrechen"
        onCancel={() => setDupConfirm(null)}
        onConfirm={async () => {
          if (!dupConfirm) return;
          const id = dupConfirm.id;
          setDupConfirm(null);
          await duplicateLocationConfirmed(id);
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Location löschen?"
        message={
          confirmDelete
            ? `Willst du diese Location wirklich löschen?\n\n${confirmDelete.name}\n\nDas kann nicht rückgängig gemacht werden.`
            : ""
        }
        confirmText="Löschen"
        cancelText="Abbrechen"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          const id = confirmDelete.id;
          setConfirmDelete(null);
          await deleteLocationConfirmed(id);
        }}
      />
    </div>
  );
}

function LocationActionsRow(props: { qrActive: boolean; onToggleQr: () => void; onSettings: () => void }) {
  return (
    <div className="row row-end row-wrap gap-10">
      <button className={`btn-pill-qr ${props.qrActive ? "is-active" : ""}`} type="button" onClick={props.onToggleQr}>
        <i className="fa-solid fa-qrcode" />
      </button>

      <button className="btn-icon" type="button" title="Settings" aria-label="Settings" onClick={props.onSettings}>
        <i className="fa-solid fa-gear" />
      </button>
    </div>
  );
}

function PinSetterCompact({ locationId, onSaved }: { locationId: string; onSaved: () => void }) {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    const res = await fetch(`/api/admin/locations/${locationId}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setMsg(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 120)}`);
      return;
    }

    setPin("");
    setMsg("PIN gespeichert");
    onSaved();
    window.setTimeout(() => setMsg(null), 1500);
  }

  return (
    <div className="grid gap-6 w-220">
      <div className="row gap-10" style={{ alignItems: "stretch" }}>
        <input
          className="input-sm"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="PIN (4-8 Ziffern)"
          inputMode="numeric"
        />
        <button className="btn-pill" type="button" onClick={save} disabled={!pin.trim()}>
          PIN setzen
        </button>
      </div>

      {msg && <div className="small-muted">{msg}</div>}
    </div>
  );
}

/* ---------------- Items ---------------- */

function ItemsAdmin() {
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<ItemRow["category"]>("drink");
  const [subcategory, setSubcategory] = useState<ItemRow["subcategory"]>("sonstiges_getraenk");
  const [unit, setUnit] = useState<ItemRow["default_unit"]>("stk");
  const [packSize, setPackSize] = useState<string>("");

  const [confirmDelete, setConfirmDelete] = useState<null | { id: string; name: string }>(null);

  async function load() {
    const res = await fetch("/api/admin/items", { cache: "no-store" });
    const text = await res.text();

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }
    setRows(data.items ?? []);
    setError(null);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const ps = packSize.trim() ? Number(packSize.trim()) : null;

    const res = await fetch("/api/admin/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      name,
      category,
      subcategory,
      default_unit: unit,
      pack_size: Number.isFinite(ps as any) ? ps : null,
      active: true,
    }),
    });

    setSubcategory(category === "drink" ? "sonstiges_getraenk" : category === "food" ? "sonstiges_food" : "sonstiges_other");
    setUnit("stk");
    setPackSize("");

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    setName("");
    setPackSize("");
    await load();
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/admin/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });

    if (!res.ok) {
      setError(`Fehler beim Speichern (HTTP ${res.status})`);
      return;
    }

    await load();
  }

  async function deleteItemConfirmed(id: string) {
    const res = await fetch(`/api/admin/items/${id}`, { method: "DELETE" });
    const text = await res.text();

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    await load();
  }

  return (
    <div className="mt-14 grid gap-10">
      <div className="card grid gap-10">
        <div className="form-row form-4" style={{ alignItems: "stretch" }}>
          <select
            className="input"
            value={category}
            onChange={(e) => {
              const nextCat = e.target.value as ItemRow["category"];
              setCategory(nextCat);

              const fallback =
                nextCat === "drink"
                  ? "sonstiges_getraenk"
                  : nextCat === "food"
                  ? "sonstiges_food"
                  : "sonstiges_other";

              setSubcategory(fallback as ItemRow["subcategory"]);
            }}
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select className="input" value={subcategory} onChange={(e) => setSubcategory(e.target.value as any)}>
            {SUBCATEGORY_OPTIONS[category].map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Packart */}
          <select className="input" value={unit} onChange={(e) => setUnit(e.target.value as any)}>
            {UNIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <input
            className="input"
            value={packSize}
            onChange={(e) => setPackSize(e.target.value)}
            placeholder="Anzahl (optional)"
            inputMode="numeric"
          />
        </div>

        <div className="row row-wrap gap-10">
          <button className="btn-pill" onClick={create} style={{ whiteSpace: "nowrap" }}>
            Artikel erstellen
          </button>
        </div>


        {error && <div className="bad-danger card">{error}</div>}
      </div>

      <div className="grid gap-10">
        {rows.map((it) => (
          <div key={it.id} className="card grid gap-8">
            <div className="row row-between row-wrap">
              <div>
                <div className="fw-900">{it.name}</div>
                <div className="small-muted">
                  {catLabel(it.category)} {">"} {subcatLabel(it.category, it.subcategory)} · {unitLabel(it.default_unit)}
                  {it.pack_size ? ` à ${it.pack_size} Stk` : ""}
                </div>
                {/* <div className="small-muted">
                  Kategorie: {catLabel(it.category)} · Unterkategorie: {subcatLabel(it.category, it.subcategory)} · Standard: {unitLabel(it.default_unit)}
                  {it.pack_size ? ` · Pack: ${it.pack_size}` : ""}
                  {" · "}
                  Aktiv: {it.active ? "Ja" : "Nein"}
                </div> */}
              </div>

              <div className="row row-end row-wrap">
                <button className="btn-pill" onClick={() => toggleActive(it.id, !it.active)}>
                  {it.active ? "Deaktivieren" : "Aktivieren"}
                </button>

                <button
                  className="btn-pill btn-danger"
                  type="button"
                  onClick={() => setConfirmDelete({ id: it.id, name: it.name })}
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Artikel löschen?"
        message={
          confirmDelete
            ? `Willst du diesen Artikel wirklich löschen?\n\n${confirmDelete.name}\n\nDas kann nicht rückgängig gemacht werden.`
            : ""
        }
        confirmText="Löschen"
        cancelText="Abbrechen"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          const id = confirmDelete.id;
          setConfirmDelete(null);
          await deleteItemConfirmed(id);
        }}
      />
    </div>
  );
}

/* ---------------- Assign ---------------- */

function AssignAdmin() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const [assignedRows, setAssignedRows] = useState<Array<{ itemId: string; sort: number; item: ItemRow }>>([]);
  const [availableFilter, setAvailableFilter] = useState<string>("all");

  const [error, setError] = useState<string | null>(null);

  async function loadBasics() {
    const [locRes, itemRes] = await Promise.all([
      fetch("/api/admin/locations", { cache: "no-store" }),
      fetch("/api/admin/items", { cache: "no-store" }),
    ]);

    const locText = await locRes.text();
    const itemText = await itemRes.text();

    let locData: any = null;
    let itemData: any = null;
    try {
      locData = JSON.parse(locText);
    } catch {
      locData = null;
    }
    try {
      itemData = JSON.parse(itemText);
    } catch {
      itemData = null;
    }

    if (!locRes.ok || !locData?.ok) {
      setError(locData?.message ?? `HTTP ${locRes.status}. Antwort: ${locText.slice(0, 160)}`);
      return;
    }
    if (!itemRes.ok || !itemData?.ok) {
      setError(itemData?.message ?? `HTTP ${itemRes.status}. Antwort: ${itemText.slice(0, 160)}`);
      return;
    }

    const locs = locData.locations ?? [];
    setLocations(locs);
    setItems(itemData.items ?? []);
    setError(null);

    if (!selectedLocationId && locs.length > 0) setSelectedLocationId(locs[0].id);
  }

  async function loadAssigned(locationId: string) {
    const res = await fetch(`/api/admin/location-items?locationId=${encodeURIComponent(locationId)}`, { cache: "no-store" });
    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 160)}`);
      return;
    }

    const rows = (data.rows ?? [])
      .map((r: any) => {
        const it = Array.isArray(r.items) ? r.items[0] : r.items;
        if (!it) return null;
        return { itemId: r.item_id, sort: r.sort ?? 0, item: it as ItemRow };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0));

    setAssignedRows(rows);
    setError(null);
  }

  useEffect(() => {
    loadBasics();
  }, []);

  useEffect(() => {
    if (selectedLocationId) loadAssigned(selectedLocationId);
  }, [selectedLocationId]);

  const assignedIds = useMemo(() => new Set(assignedRows.map((r) => r.itemId)), [assignedRows]);

  const availableItems = useMemo(() => {
    return items
      .filter((i) => i.active)
      .filter((i) => !assignedIds.has(i.id))
      .sort((a, b) => a.name.localeCompare(b.name, "de-CH"));
  }, [items, assignedIds]);

    const filteredAvailableItems = useMemo(() => {
      let list = availableItems;

      if (availableFilter === "all") return list;

      if (availableFilter.startsWith("cat:")) {
        const cat = availableFilter.slice(4) as ItemRow["category"];
        list = list.filter((i) => i.category === cat);
      } else if (availableFilter.startsWith("sub:")) {
        const sub = availableFilter.slice(4) as ItemRow["subcategory"];
        list = list.filter((i) => i.subcategory === sub);
      }

      return list;
    }, [availableItems, availableFilter]);


  async function upsertLocationItem(itemId: string, sort: number) {
    if (!selectedLocationId) return;

    const res = await fetch("/api/admin/location-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: selectedLocationId, itemId, active: true, sort }),
    });

    if (!res.ok) {
      setError(`Fehler beim Speichern (HTTP ${res.status})`);
      return;
    }
  }

  async function add(item: ItemRow) {
    const maxSort = assignedRows.reduce((m, r) => Math.max(m, r.sort ?? 0), 0);
    const sort = maxSort + 10;

    await upsertLocationItem(item.id, sort);
    await loadAssigned(selectedLocationId);
  }

  async function remove(itemId: string) {
    if (!selectedLocationId) return;

    const res = await fetch("/api/admin/location-items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: selectedLocationId, itemId }),
    });

    if (!res.ok) {
      setError(`Fehler beim Entfernen (HTTP ${res.status})`);
      return;
    }

    await loadAssigned(selectedLocationId);
  }

  async function move(itemId: string, dir: "up" | "down") {
    const idx = assignedRows.findIndex((r) => r.itemId === itemId);
    if (idx < 0) return;

    const otherIdx = dir === "up" ? idx - 1 : idx + 1;
    if (otherIdx < 0 || otherIdx >= assignedRows.length) return;

    const a = assignedRows[idx];
    const b = assignedRows[otherIdx];

    await upsertLocationItem(a.itemId, b.sort);
    await upsertLocationItem(b.itemId, a.sort);

    await loadAssigned(selectedLocationId);
  }

  return (
    <div className="mt-14 grid gap-10">
      {/* Location auswählen */}
      <div className="card grid gap-10">
        <h2 className="h2">Zuweisung</h2>

        <div className="row-nowrap">
          <div className="small-muted row-label">Location</div>

          <select className="input flex-1" value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.type === "bar" ? "Bar" : "Food"})
              </option>
            ))}
          </select>

          <button className="btn-pill" type="button" onClick={() => selectedLocationId && loadAssigned(selectedLocationId)}>
            Aktualisieren
          </button>
        </div>

        {error && <div className="bad-danger card">{error}</div>}
      </div>

      {/* Zugewiesen */}
      <div className="card grid gap-10">
        <div>
          <div className="h2">Zugewiesen</div>
          <div className="small-muted mt-10">Artikel, die diese Location bestellen kann</div>
        </div>

        {assignedRows.length === 0 ? (
          <div className="card">Noch keine Artikel zugewiesen.</div>
        ) : (
          <div className="grid gap-10">
            {assignedRows.map((r) => (
              <div key={r.itemId} className="card row row-between row-wrap">
                <div>
                  <div className="fw-900">{r.item.name}</div>
                  <div className="small-muted">
                    {catLabel(r.item.category)} · {unitLabel(r.item.default_unit)}
                    {r.item.pack_size ? ` · Pack: ${r.item.pack_size}` : ""}
                  </div>
                </div>

                <div className="row row-end row-wrap">
                  <button className="btn-pill" type="button" onClick={() => move(r.itemId, "up")} title="Nach oben">
                    <i className="fa-solid fa-angle-up" />
                  </button>
                  <button className="btn-pill" type="button" onClick={() => move(r.itemId, "down")} title="Nach unten">
                    <i className="fa-solid fa-angle-down" />
                  </button>
                  <button className="btn-pill" type="button" onClick={() => remove(r.itemId)} title="Entfernen">
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verfügbar */}
      <div className="card grid gap-10">
        <div>
          <div className="h2">Verfügbar</div>
          <div className="small-muted mt-10">Aktive Artikel, die noch nicht zugewiesen sind</div>
        </div>

        <div className="form-row" style={{ alignItems: "stretch" }}>
          <select
            className="input is-compact"
            value={availableFilter}
            onChange={(e) => setAvailableFilter(e.target.value)}
            title="Filter"
            aria-label="Filter"
          >
            <option value="all">Alle</option>

            <optgroup label="Kategorie">
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={`cat:${c.value}`}>
                  {c.label}
                </option>
              ))}
            </optgroup>

            <optgroup label="Unterkategorie - Getränke">
              {SUBCATEGORY_OPTIONS.drink.map((s) => (
                <option key={s.value} value={`sub:${s.value}`}>
                  {s.label}
                </option>
              ))}
            </optgroup>

            <optgroup label="Unterkategorie - Essen">
              {SUBCATEGORY_OPTIONS.food.map((s) => (
                <option key={s.value} value={`sub:${s.value}`}>
                  {s.label}
                </option>
              ))}
            </optgroup>

            <optgroup label="Unterkategorie - Anderes">
              {SUBCATEGORY_OPTIONS.other.map((s) => (
                <option key={s.value} value={`sub:${s.value}`}>
                  {s.label}
                </option>
              ))}
            </optgroup>
          </select>

          <div className="small-muted" style={{ alignSelf: "center" }}>
            {filteredAvailableItems.length} Treffer
          </div>

          {availableFilter !== "all" && (
            <button className="btn-pill" type="button" onClick={() => setAvailableFilter("all")}>
              Reset
            </button>
          )}
        </div>





        {filteredAvailableItems.map.length === 0 ? (
          <div className="card">Keine verfügbaren Artikel.</div>
        ) : (
          <div className="grid gap-10">
            {filteredAvailableItems.map((it) => (
              <div key={it.id} className="card row row-between row-wrap">
                <div>
                  <div className="fw-900">{it.name}</div>
                  <div className="small-muted">
                    {catLabel(it.category)} · {unitLabel(it.default_unit)}
                    {it.pack_size ? ` · Pack: ${it.pack_size}` : ""}
                  </div>
                </div>

                <button className="btn-pill" type="button" onClick={() => add(it)}>
                  Hinzufügen <i className="fa-solid fa-plus" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

}

/* ---------------- Settings ---------------- */

function SettingsAdmin() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [activeEventId, setActiveEventIdState] = useState<string>("");

  const [newEventName, setNewEventName] = useState("");

  const [archiveConfirm, setArchiveConfirm] = useState<null | { id: string; name: string }>(null);

  const [eventRename, setEventRename] = useState<null | { id: string; current: string }>(null);
  const [eventDupConfirm, setEventDupConfirm] = useState<null | { id: string; name: string }>(null);
  const [eventMenuModal, setEventMenuModal] = useState<null | { id: string; name: string; isActive: boolean }>(null);

  const [runners, setRunners] = useState<RunnerRow[]>([]);
  const [runnerName, setRunnerName] = useState("");
  const [runnerPin, setRunnerPin] = useState("");

  const [runnerPinEdit, setRunnerPinEdit] = useState<Record<string, string>>({});
  const [runnerDeleteConfirm, setRunnerDeleteConfirm] = useState<null | { id: string; name: string }>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!res.ok || !data?.ok) {
        setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
        setLoading(false);
        return;
      }

      setEvents(data.events ?? []);
      setActiveEventIdState(data.activeEventId ?? "");
      setError(null);

      await loadRunners();
      setLoading(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setError(`Fetch Fehler: ${msg}`);
      setLoading(false);
    }
  }

  async function loadRunners() {
    const res = await fetch("/api/admin/runners", { cache: "no-store" });
    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    setRunners(data.runners ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function setActive(evId: string) {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeEventId: evId }),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    setActiveEventIdState(evId);
    setError(null);
    await loadRunners();
  }

  async function createEvent() {
    const name = newEventName.trim();
    if (!name) {
      setError("Bitte einen Event Namen eingeben.");
      return;
    }

    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, setActive: true }),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    setNewEventName("");
    setError(null);
    await load();
  }

  async function archiveEventConfirmed(id: string) {
    const res = await fetch(`/api/admin/events/${id}/archive`, { method: "POST" });
    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    setError(null);
    await load();
  }

  async function renameEventSave(id: string, newName: string) {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    await load();
  }

  async function duplicateEventConfirmed(id: string) {
    const res = await fetch(`/api/admin/events/${id}/duplicate`, { method: "POST" });
    const text = await res.text();

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    await load();
  }

  async function createRunner() {
    const name = runnerName.trim();
    const pin = runnerPin.trim();

    if (!name) {
      setError("Runner Name fehlt.");
      return;
    }
    if (!/^\d{4,8}$/.test(pin)) {
      setError("PIN muss 4-8 Ziffern haben.");
      return;
    }

    const res = await fetch("/api/admin/runners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin, active: true }),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    setRunnerName("");
    setRunnerPin("");
    setError(null);
    await loadRunners();
  }

  async function toggleRunnerActive(id: string, active: boolean) {
    const res = await fetch(`/api/admin/runners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });

    if (!res.ok) {
      setError(`Fehler beim Speichern (HTTP ${res.status})`);
      return;
    }

    await loadRunners();
  }

  async function setRunnerPinSave(id: string) {
    const pin = (runnerPinEdit[id] ?? "").trim();
    if (!/^\d{4,8}$/.test(pin)) {
      setError("PIN muss 4-8 Ziffern haben.");
      return;
    }

    const res = await fetch(`/api/admin/runners/${id}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    setRunnerPinEdit((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    setError(null);
  }

  async function deleteRunnerConfirmed(id: string) {
    const res = await fetch(`/api/admin/runners/${id}`, { method: "DELETE" });
    const text = await res.text();

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message ?? `HTTP ${res.status}. Antwort: ${text.slice(0, 200)}`);
      return;
    }

    setError(null);
    await loadRunners();
  }

  const activeEvents = useMemo(() => events.filter((e) => e.status !== "archived"), [events]);
  const archivedEvents = useMemo(() => events.filter((e) => e.status === "archived"), [events]);

  if (loading) return <div className="card mt-14">Lade Settings…</div>;
  if (error) return <div className="card mt-14 bad-danger">{error}</div>;

  return (
    <div className="mt-14 grid gap-10">
      <div className="card grid gap-10">
        <h2 className="h2">Event</h2>

        <div className="row-nowrap">
          <div className="small-muted minw-120">Aktives Event</div>

          <select className="input settings-field" value={activeEventId} onChange={(e) => setActive(e.target.value)}>
            {activeEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>

          <button className="btn-pill" type="button" onClick={load}>
            Aktualisieren
          </button>
        </div>

        <div className="row-nowrap">
          <div className="small-muted minw-120">Neues Event</div>

          <input
            className="input settings-field"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            placeholder="Name des Events"
          />

          <button className="btn-pill" type="button" onClick={createEvent}>
            Neues Event <i className="fa-regular fa-calendar-plus" />
          </button>
        </div>


        <div className="hr-lg" aria-hidden="true" />

          <div className="grid gap-10" style={{ marginTop: 2 }}>
            <div className="small-muted">Archivierte Events: {archivedEvents.length} 
            </div>

            <div className="grid gap-8" style={{ marginTop: 6 }}>
              {activeEvents.map((ev) => {
                const isActive = ev.id === activeEventId;

                return (
                  <div
                    key={ev.id}
                    className={`event-row ${isActive ? "is-active" : ""}`}
                  >
                    <div className="row row-between row-wrap">
                      <div className="grid gap-6">
                        <div className="row row-wrap gap-8">
                          <div className="fw-900">{ev.name}</div>

                          {isActive && (
                            <span className="badge badge-success" title="Aktives Event">
                              <span className="badge-dot badge-dot-success" />
                              Aktiv
                            </span>
                          )}
                        </div>

                        <div className="small-muted">
                          {new Date(ev.created_at).toLocaleDateString("de-CH")}
                        </div>
                      </div>

                      <button
                        className="btn-icon"
                        type="button"
                        title="Aktionen"
                        aria-label="Aktionen"
                        onClick={() => setEventMenuModal({ id: ev.id, name: ev.name, isActive })}
                      >
                        <i className="fa-solid fa-gear" />
                      </button>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        
      </div>

      <ActionMenuModal
        open={!!eventMenuModal}
        title={eventMenuModal ? `Event: ${eventMenuModal.name}` : "Event"}
        onClose={() => setEventMenuModal(null)}
        actions={[
          {
            label: "Umbenennen",
            onClick: () => {
              if (!eventMenuModal) return;
              const { id, name } = eventMenuModal;
              setEventMenuModal(null);
              setEventRename({ id, current: name });
            },
          },
          {
            label: "Duplizieren",
            onClick: () => {
              if (!eventMenuModal) return;
              const { id, name } = eventMenuModal;
              setEventMenuModal(null);
              setEventDupConfirm({ id, name });
            },
          },
          {
            label: "Archivieren",
            danger: true,
            disabled: !!eventMenuModal?.isActive,
            onClick: () => {
              if (!eventMenuModal) return;
              const { id, name, isActive } = eventMenuModal;
              setEventMenuModal(null);
              if (isActive) return;
              setArchiveConfirm({ id, name });
            },
          },
        ]}
      />

      

      <div className="card grid gap-10">
        <h2 className="h2">Runner</h2>

        <div className="subhead">Läufer erstellen</div>

        <div className="row row-wrap gap-10">
          <input
            className="input"
            value={runnerName}
            onChange={(e) => setRunnerName(e.target.value)}
            placeholder="Runner Name"
          />
          <input
            className="input w-180"
            value={runnerPin}
            onChange={(e) => setRunnerPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="PIN (4-8 Ziffern)"
            inputMode="numeric"
          />
          <button className="btn-pill" type="button" onClick={createRunner}>
            Läufer erstellen
          </button>
        </div>

        <div className="hr-lg" aria-hidden="true" />

        <div className="subhead">Verfügbare Runner</div>

        <div className="grid gap-10">
          {runners.length === 0 && <div className="card">Noch keine Runner für dieses Event.</div>}

          {runners.map((r) => (
            <div key={r.id} className="card grid gap-8">
              <div className="row row-between row-wrap">
                <div>
                  <div className="fw-900">{r.name}</div>
                  <div className="small-muted">
                    Aktiv: {r.active ? "Ja" : "Nein"} · Erstellt: {new Date(r.created_at).toLocaleDateString("de-CH")}
                  </div>
                </div>

                <div className="row row-end row-wrap">
                  <button className="btn-pill" type="button" onClick={() => toggleRunnerActive(r.id, !r.active)}>
                    {r.active ? "Deaktivieren" : "Aktivieren"}
                  </button>

                  <button
                    className="btn-pill btn-danger"
                    type="button"
                    onClick={() => setRunnerDeleteConfirm({ id: r.id, name: r.name })}
                  >
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </div>
              </div>

              <div className="row row-wrap gap-10">
                <input
                  className="input w-180"
                  placeholder="Neuer PIN"
                  inputMode="numeric"
                  value={runnerPinEdit[r.id] ?? ""}
                  onChange={(e) =>
                    setRunnerPinEdit((prev) => ({
                      ...prev,
                      [r.id]: e.target.value.replace(/\D/g, "").slice(0, 8),
                    }))
                  }
                />

                <button className="btn-pill" type="button" onClick={() => setRunnerPinSave(r.id)}>
                  PIN setzen
                </button>

              </div>
            </div>
          ))}
        </div>
      </div>



      <PromptModal
        open={!!eventRename}
        title="Event umbenennen"
        message={eventRename ? `Aktuell: ${eventRename.current}` : ""}
        placeholder="Neuer Event Name"
        initialValue={eventRename?.current ?? ""}
        confirmText="Speichern"
        cancelText="Abbrechen"
        validate={(v) => (v.trim().length < 2 ? "Bitte mindestens 2 Zeichen eingeben." : null)}
        onCancel={() => setEventRename(null)}
        onConfirm={async (v) => {
          if (!eventRename) return;
          const id = eventRename.id;
          setEventRename(null);
          await renameEventSave(id, v);
        }}
      />

      <ConfirmDialog
        open={!!eventDupConfirm}
        title="Event duplizieren?"
        message={
          eventDupConfirm
            ? `Willst du dieses Event duplizieren?\n\n${eventDupConfirm.name}\n\nEs werden Locations, Artikel, Zuweisungen und Runner übernommen.\nBestellungen werden NICHT kopiert.\nDas neue Event wird aktiv gesetzt.`
            : ""
        }
        confirmText="Duplizieren"
        cancelText="Abbrechen"
        onCancel={() => setEventDupConfirm(null)}
        onConfirm={async () => {
          if (!eventDupConfirm) return;
          const id = eventDupConfirm.id;
          setEventDupConfirm(null);
          await duplicateEventConfirmed(id);
        }}
      />

      <ConfirmDialog
        open={!!archiveConfirm}
        title="Event archivieren?"
        message={
          archiveConfirm
            ? `Willst du dieses Event wirklich archivieren?\n\n${archiveConfirm.name}\n\nArchivierte Events sind nur noch Historie.`
            : ""
        }
        confirmText="Archivieren"
        cancelText="Abbrechen"
        onCancel={() => setArchiveConfirm(null)}
        onConfirm={async () => {
          if (!archiveConfirm) return;
          const id = archiveConfirm.id;
          setArchiveConfirm(null);
          await archiveEventConfirmed(id);
        }}
      />

      <ConfirmDialog
        open={!!runnerDeleteConfirm}
        title="Runner löschen?"
        message={
          runnerDeleteConfirm
            ? `Willst du diesen Runner wirklich löschen?\n\n${runnerDeleteConfirm.name}\n\nDas kann nicht rückgängig gemacht werden.`
            : ""
        }
        confirmText="Löschen"
        cancelText="Abbrechen"
        onCancel={() => setRunnerDeleteConfirm(null)}
        onConfirm={async () => {
          if (!runnerDeleteConfirm) return;
          const id = runnerDeleteConfirm.id;
          setRunnerDeleteConfirm(null);
          await deleteRunnerConfirmed(id);
        }}
      />
    </div>
  );
}

/* ---------------- Confirm Dialog ---------------- */

function ConfirmDialog(props: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!props.open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onCancel();
      }}
    >
      <div className="modal">
        <div className="grid gap-10">
          <div>
            <div className="fw-900 fs-18">{props.title}</div>
            <div className="small-muted mt-10 pre-line">{props.message}</div>
          </div>

          <div className="row row-end row-wrap">
            <button className="btn-pill" type="button" onClick={props.onCancel}>
              {props.cancelText ?? "Abbrechen"}
            </button>

            <button className="btn-pill btn-danger" type="button" onClick={props.onConfirm}>
              {props.confirmText ?? "OK"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Prompt Modal ---------------- */

function PromptModal(props: {
  open: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  validate?: (value: string) => string | null;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}) {
  const [value, setValue] = useState(props.initialValue ?? "");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (props.open) {
      setValue(props.initialValue ?? "");
      setErr(null);
    }
  }, [props.open, props.initialValue]);

  function doConfirm() {
    const v = value.trim();
    const msg = props.validate ? props.validate(v) : null;
    if (msg) {
      setErr(msg);
      return;
    }
    props.onConfirm(v);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!props.open) return;
      if (e.key === "Escape") props.onCancel();
      if (e.key === "Enter") doConfirm();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, value]);

  if (!props.open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onCancel();
      }}
    >
      <div className="modal">
        <div className="grid gap-10">
          <div>
            <div className="fw-900 fs-18">{props.title}</div>
            {props.message && <div className="small-muted mt-10 pre-line">{props.message}</div>}
          </div>

          <input
            className="input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setErr(null);
            }}
            placeholder={props.placeholder ?? ""}
            autoFocus
          />

          {err && <div className="bad-danger">{err}</div>}

          <div className="row row-end row-wrap">
            <button className="btn-pill" type="button" onClick={props.onCancel}>
              {props.cancelText ?? "Abbrechen"}
            </button>

            <button className="btn-pill" type="button" onClick={doConfirm}>
              {props.confirmText ?? "Speichern"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- QR Modal ---------------- */

function QrModal(props: { open: boolean; title: string; publicId: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function ensureQr() {
    if (!props.publicId) throw new Error("publicId fehlt");
    if (dataUrl) return dataUrl;
    const url = `${window.location.origin}/l/${props.publicId}`;
    const png = await QRCode.toDataURL(url, { margin: 1, width: 360 });
    setDataUrl(png);
    return png;
  }

  async function download() {
    try {
      const png = await ensureQr();
      const a = document.createElement("a");
      a.href = png;
      a.download = `qr-location-${props.publicId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setErr(msg);
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/l/${props.publicId}`;
    await navigator.clipboard.writeText(url);
  }

  useEffect(() => {
    if (!props.open) return;

    setErr(null);
    setDataUrl(null);

    (async () => {
      try {
        await ensureQr();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
        setErr(msg);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, props.publicId]);

  if (!props.open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="modal">
        <div className="grid gap-10">
          <div className="row row-between row-wrap">
            <div className="fw-900 fs-18">{props.title}</div>

            <div className="row row-end row-wrap gap-10">
              <button className="btn-icon" type="button" title="Link kopieren" aria-label="Link kopieren" onClick={copyLink}>
                <i className="fa-regular fa-copy" />
              </button>

              <button className="btn-icon" type="button" title="QR herunterladen" aria-label="QR herunterladen" onClick={download}>
                <i className="fa-solid fa-download" />
              </button>
            </div>
          </div>

          <div className="small-muted">
            Link: <code>/l/{props.publicId}</code>
          </div>

          {err && <div className="bad-danger">{err}</div>}

          {dataUrl && (
            <div className="card card-tight" style={{ width: "fit-content" }}>
              <img src={dataUrl} alt="QR Code" className="qr-img" style={{ maxWidth: 320 }} />
            </div>
          )}

          <div className="row row-end row-wrap">
            <button className="btn-pill" type="button" onClick={props.onClose}>
              Schliessen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Action Menu Modal ---------------- */

function ActionMenuModal(props: {
  open: boolean;
  title: string;
  actions: Array<{ label: string; onClick: () => void; danger?: boolean; disabled?: boolean }>;
  onClose: () => void;
}) {
  if (!props.open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="modal">
        <div className="grid gap-10">
          <div className="fw-900 fs-18">{props.title}</div>

          <div className="grid gap-8">
            {props.actions.map((a, idx) => (
              <button
                key={idx}
                className={`btn-pill btn-full ${a.danger ? "btn-danger" : ""}`}
                type="button"
                onClick={a.onClick}
                disabled={!!a.disabled}
                title={a.disabled ? "Nicht verfügbar" : undefined}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="row row-end row-wrap">
            <button className="btn-pill" type="button" onClick={props.onClose}>
              Schliessen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
