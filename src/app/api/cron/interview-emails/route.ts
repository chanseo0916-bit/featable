import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processInterviewEmailQueue } from "@/lib/interview-campaigns";

function authorized(request: Request) {
  const secret = process.env.SYNC_CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(supplied));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await processInterviewEmailQueue(100)) });
  } catch (error) {
    console.error("[interview-email] Scheduled delivery failed.", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "delivery_failed" }, { status: 500 });
  }
}
