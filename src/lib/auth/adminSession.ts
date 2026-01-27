import { cookies } from "next/headers";
import crypto from "crypto";

export const ADMIN_COOKIE_NAME = "admin_session";

function b64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function sign(payloadB64: string, secret: string) {
  return b64url(crypto.createHmac("sha256", secret).update(payloadB64).digest());
}

export async function createAdminSessionToken() {
  const ttlH = Number(process.env.ADMIN_SESSION_TTL_HOURS ?? "12");
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    typ: "admin",
    iat: now,
    exp: now + ttlH * 3600,
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const secret = process.env.SESSION_SIGNING_SECRET;
  if (!secret) throw new Error("SESSION_SIGNING_SECRET fehlt");

  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export async function requireAdminSession() {
  const c = await cookies();
  const token = c.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) throw new Error("Nicht freigeschaltet");

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) throw new Error("Nicht freigeschaltet");

  const secret = process.env.SESSION_SIGNING_SECRET;
  if (!secret) throw new Error("SESSION_SIGNING_SECRET fehlt");

  const expected = sign(payloadB64, secret);
  if (expected !== sig) throw new Error("Nicht freigeschaltet");

  const payload = JSON.parse(Buffer.from(payloadB64.replaceAll("-", "+").replaceAll("_", "/"), "base64").toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  if (!payload?.exp || now > payload.exp) throw new Error("Nicht freigeschaltet");
}
