import { NextResponse } from "next/server";
import { RUNNER_COOKIE_NAME } from "@/lib/auth/runnerSession";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: RUNNER_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return res;
}