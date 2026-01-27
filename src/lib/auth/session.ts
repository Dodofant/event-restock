import { SignJWT, jwtVerify } from "jose";

type LocationSessionPayload = {
  loc: string; // location_id (uuid)
  pid: string; // public_id
};

function getSecret(): Uint8Array {
  const secret = process.env.LOCATION_SESSION_SECRET;
  if (!secret) throw new Error("LOCATION_SESSION_SECRET fehlt in .env.local");
  return new TextEncoder().encode(secret);
}

function getTtlHours(): number {
  const raw = process.env.LOCATION_SESSION_TTL_HOURS ?? "12";
  const ttl = Number(raw);
  if (!Number.isFinite(ttl) || ttl <= 0) return 12;
  return ttl;
}

export const LOCATION_COOKIE_NAME = "loc_session";

export async function createLocationSessionToken(payload: LocationSessionPayload) {
  const ttlHours = getTtlHours();
  const expSeconds = Math.floor(Date.now() / 1000) + ttlHours * 60 * 60;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(getSecret());
}

export async function verifyLocationSessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  const loc = payload.loc;
  const pid = payload.pid;

  if (typeof loc !== "string" || typeof pid !== "string") {
    throw new Error("Ungültiger Session Token");
  }

  return { loc, pid };
}