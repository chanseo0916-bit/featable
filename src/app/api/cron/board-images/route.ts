import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processBoardImageCleanup } from "@/lib/board-images-admin";

function authorized(request: Request) {
  const secret = process.env.SYNC_CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(supplied));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    return NextResponse.json({ ok: true, ...(await processBoardImageCleanup()) });
  } catch (error) {
    console.error("[board-images] Scheduled cleanup failed.", error);
    return NextResponse.json({ error: "cleanup_failed" }, { status: 500 });
  }
}
