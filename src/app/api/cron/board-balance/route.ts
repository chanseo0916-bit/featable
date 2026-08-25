import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  ensureDailyBoardBalanceGame,
  getKstDateString,
  getNextKstDateString,
} from "@/lib/board-balance-automation";

function authorized(request: Request) {
  const secret = process.env.SYNC_CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(supplied));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const target = new URL(request.url).searchParams.get("target") ?? "today";
  if (target !== "today" && target !== "tomorrow") {
    return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  }

  try {
    const gameDate = target === "tomorrow"
      ? getNextKstDateString()
      : getKstDateString();
    const result = await ensureDailyBoardBalanceGame(gameDate);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[board-balance] Daily game automation failed.", error);
    return NextResponse.json(
      { error: "balance_game_sync_failed" },
      { status: 500 },
    );
  }
}
