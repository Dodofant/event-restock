import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const RUNNER_COOKIE_NAME = "runner_session";

function getSecret(): Uint8Array {
  const secret = process.env.LOCATION_SESSION_SECRET;
  if (!secret) throw new Error("LOCATION_SESSION_SECRET fehlt in .env.local");
  return new TextEncoder().encode(secret);
}

function getTtlHours(): number {
  const raw = process.env.RUNNER_SESSION_TTL_HOURS ?? "12";
  const ttl = Number(raw);
  if (!Number.isFinite(ttl) || ttl <= 0) return 12;
  return ttl;
}

export async function createRunnerSessionToken() {
  const ttlHours = getTtlHours();
  const expSeconds = Math.floor(Date.now() / 1000) + ttlHours * 60 * 60;

  return new SignJWT({ typ: "runner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(getSecret());
}

export async function requireRunnerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(RUNNER_COOKIE_NAME)?.value;

  if (!token) throw new Error("Nicht freigeschaltet");

  const { payload } = await jwtVerify(token, getSecret());
  if (payload.typ !== "runner") throw new Error("Nicht freigeschaltet");
}
