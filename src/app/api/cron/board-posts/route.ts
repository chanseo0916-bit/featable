import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureDailyAutomatedBoardPosts } from "@/lib/board-post-automation";

function authorized(request: Request) {
  const secret = process.env.SYNC_CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(supplied));
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await ensureDailyAutomatedBoardPosts();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[board-posts] Daily post automation failed.", error);
    return NextResponse.json({ error: "board_post_automation_failed" }, { status: 500 });
  }
}
