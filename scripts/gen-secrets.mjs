// scripts/gen-secrets.mjs
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ENV_FILE = ".env.local";
const BACKUP_FILE = ".env.local.bak";

function gen(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function escapeValue(v) {
  // base64url ist safe, aber wir halten es robust
  if (/[ \t#"'\\]/.test(v)) return JSON.stringify(v);
  return v;
}

function updateOrAppendLine(lines, key, value, { replaceExisting }) {
  const re = new RegExp(`^\\s*${key}\\s*=`);
  const idx = lines.findIndex((l) => re.test(l));

  if (idx >= 0) {
    if (!replaceExisting) return { lines, changed: false, existed: true };
    lines[idx] = `${key}=${escapeValue(value)}`;
    return { lines, changed: true, existed: true };
  }

  // ans Ende anhängen (mit Leerzeile davor, wenn sinnvoll)
  if (lines.length && lines[lines.length - 1].trim() !== "") lines.push("");
  lines.push(`${key}=${escapeValue(value)}`);
  return { lines, changed: true, existed: false };
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

const args = new Set(process.argv.slice(2));
const replaceExisting = args.has("--replace"); // Default: NICHT ersetzen
const force = args.has("--force"); // falls du später doch mal bewusst rotieren willst

const envPath = path.resolve(process.cwd(), ENV_FILE);
const backupPath = path.resolve(process.cwd(), BACKUP_FILE);

const original = readFileSafe(envPath);
const lines = original ? original.replace(/\r\n/g, "\n").split("\n") : [];

if (original) {
  fs.writeFileSync(backupPath, original, "utf8");
}

const created = [];

function ensure(key) {
  // wenn nicht ersetzen: generiere nur, wenn fehlt
  // wenn ersetzen: generiere nur, wenn --force gesetzt (sonst lassen wir bestehendes stehen)
  const val = gen(32);

  const res = updateOrAppendLine(lines, key, val, {
    replaceExisting: replaceExisting && force,
  });

  if (!res.existed) created.push(key);
  return res.changed;
}

let changed = false;
changed = ensure("SESSION_SIGNING_SECRET") || changed;
changed = ensure("LOCATION_SESSION_SECRET") || changed;

if (!original) {
  // Header, wenn Datei neu ist
  lines.unshift(
    "# Local environment variables",
    "# Auto-updated by scripts/gen-secrets.mjs",
    "# Hinweis: Wenn du Secrets rotierst, sind bestehende Sessions ungueltig.",
    ""
  );
}

if (changed || !original) {
  fs.writeFileSync(envPath, lines.join("\n").replace(/\n{3,}/g, "\n\n") + "\n", "utf8");
}

console.log(`✅ ${ENV_FILE} aktualisiert`);
if (original) console.log(`🧾 Backup: ${BACKUP_FILE}`);

if (created.length) {
  console.log(`🆕 Neu hinzugefuegt: ${created.join(", ")}`);
} else {
  console.log("ℹ️ Nichts neu hinzugefuegt (Keys waren bereits vorhanden).");
}

if (replaceExisting && !force) {
  console.log("");
  console.log("⚠️ --replace wurde gesetzt, aber ohne --force werden bestehende Keys NICHT ueberschrieben.");
  console.log("   Wenn du wirklich rotieren willst: node scripts/gen-secrets.mjs --replace --force");
}