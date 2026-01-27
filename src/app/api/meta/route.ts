import { NextResponse } from "next/server";

export async function GET() {
  const version =
    process.env.APP_VERSION ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    "dev";

  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ||
    null;

  const vercelEnv =
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    null;

  const vercelUrl =
    process.env.VERCEL_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    null;

  const buildTime =
    process.env.BUILD_TIME ||
    process.env.NEXT_PUBLIC_BUILD_TIME ||
    null;

  return NextResponse.json({
    ok: true,
    version,
    commit,
    vercelEnv,
    vercelUrl,
    buildTime,
  });
}
