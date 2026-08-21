import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncBizinfoSupportPrograms } from "@/lib/bizinfo-sync";

function authorized(request: Request) {
  const secret = process.env.SYNC_CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(supplied));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await syncBizinfoSupportPrograms()) });
  } catch (error) {
    console.error("[bizinfo] Scheduled synchronization failed.", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "sync_failed" }, { status: 500 });
  }
}
