import { cookies } from "next/headers";
import { LOCATION_COOKIE_NAME, verifyLocationSessionToken } from "@/lib/auth/session";

export async function requireLocationSession(publicId?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(LOCATION_COOKIE_NAME)?.value;

  if (!token) {
    throw new Error("Nicht freigeschaltet");
  }

  // Erwartet: { loc, pid } wobei pid = public_id
  const session = await verifyLocationSessionToken(token);

  if (publicId && session?.pid !== publicId) {
    throw new Error("Nicht freigeschaltet");
  }

  return session; // { loc, pid }
}
