import { cookies } from "next/headers";
import { LOCATION_COOKIE_NAME, verifyLocationSessionToken } from "@/lib/auth/session";

export async function requireLocationSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(LOCATION_COOKIE_NAME)?.value;

  if (!token) {
    throw new Error("Nicht freigeschaltet");
  }

  const session = await verifyLocationSessionToken(token);
  return session; // { loc, pid }
}