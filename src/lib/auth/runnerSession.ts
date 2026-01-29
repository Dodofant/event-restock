import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const RUNNER_COOKIE_NAME = "runner_session";

type RunnerSessionPayload = {
  typ: "runner";
  rid?: string; // runner id
  rn?: string;  // runner name (optional)
  eid?: string; // event id (optional)
};

function getSecret(): Uint8Array {
  const secret = process.env.RUNNER_SESSION_SECRET;
  if (!secret) throw new Error("RUNNER_SESSION_SECRET fehlt in den Env-Variablen");
  return new TextEncoder().encode(secret);
}

function getTtlHours(): number {
  const raw = process.env.RUNNER_SESSION_TTL_HOURS ?? "12";
  const ttl = Number(raw);
  if (!Number.isFinite(ttl) || ttl <= 0) return 12;
  return ttl;
}

export async function createRunnerSessionToken(input?: {
  runnerId?: string;
  runnerName?: string;
  eventId?: string;
}) {
  const ttlHours = getTtlHours();
  const expSeconds = Math.floor(Date.now() / 1000) + ttlHours * 60 * 60;

  const payload: RunnerSessionPayload = {
    typ: "runner",
    rid: input?.runnerId,
    rn: input?.runnerName,
    eid: input?.eventId,
  };

  return new SignJWT(payload)
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
  if ((payload as any).typ !== "runner") throw new Error("Nicht freigeschaltet");

  return {
    runnerId: (payload as any).rid as string | undefined,
    runnerName: (payload as any).rn as string | undefined,
    eventId: (payload as any).eid as string | undefined,
  };
}