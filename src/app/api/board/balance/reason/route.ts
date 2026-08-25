import { NextResponse, type NextRequest } from "next/server";

import {
  isMissingBalanceSchema,
  isUuid,
  sanitizeBoardBalanceReasonCounts,
} from "@/lib/board-balance";
import { BOARD_VIEWER_COOKIE } from "@/lib/board-viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ReasonBody = {
  gameId?: unknown;
  reasonIndex?: unknown;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  let body: ReasonBody;
  try {
    const parsed: unknown = await request.json();
    body = parsed !== null && typeof parsed === "object" ? parsed as ReasonBody : {};
  } catch {
    return errorResponse("invalid body", 400);
  }

  const gameId = typeof body.gameId === "string" ? body.gameId.trim() : "";
  const reasonIndex = body.reasonIndex;
  if (!isUuid(gameId)) return errorResponse("invalid game id", 400);
  if (typeof reasonIndex !== "number" || !Number.isInteger(reasonIndex) || reasonIndex < 0) {
    return errorResponse("invalid reason", 400);
  }

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = isUuid(data.user?.id) ? data.user.id : null;
  } catch {
    // The reason flow is intentionally unavailable to anonymous visitors.
  }
  if (!userId) return errorResponse("login required", 401);

  const admin = createAdminClient();
  if (!admin) return errorResponse("balance game is not configured", 503);

  const { data: game, error: gameError } = await admin
    .from("board_balance_games")
    .select("id,game_date,status,option_a_reasons,option_b_reasons")
    .eq("id", gameId)
    .maybeSingle();
  if (gameError || !game) return errorResponse("balance game is unavailable", 409);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  if (game.game_date !== today || game.status !== "published") {
    return errorResponse("balance game is unavailable", 409);
  }

  const { data: userVote, error: userVoteError } = await admin
    .from("board_balance_votes")
    .select("choice,voter_key")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();
  if (userVoteError) return errorResponse("balance game is not ready", 503);

  let vote = userVote as { choice?: unknown; voter_key?: unknown } | null;
  if (!vote) {
    const viewerKey = request.cookies.get(BOARD_VIEWER_COOKIE)?.value;
    if (isUuid(viewerKey)) {
      const { data: cookieVote, error: cookieVoteError } = await admin
        .from("board_balance_votes")
        .select("choice,voter_key,user_id")
        .eq("game_id", gameId)
        .eq("voter_key", viewerKey)
        .maybeSingle();
      if (cookieVoteError) return errorResponse("balance game is not ready", 503);
      const cookieVoteRow = cookieVote as {
        choice?: unknown;
        voter_key?: unknown;
        user_id?: unknown;
      } | null;
      if (cookieVoteRow?.user_id && cookieVoteRow.user_id !== userId) {
        vote = null;
      } else {
        vote = cookieVoteRow;
      }
    }
  }

  if (vote?.choice !== "a" && vote?.choice !== "b") {
    return errorResponse("vote required", 409);
  }

  const choice = vote.choice === "a" ? "a" : "b";
  const reasons = choice === "a" ? game.option_a_reasons : game.option_b_reasons;
  if (!Array.isArray(reasons) || reasonIndex >= reasons.length) {
    return errorResponse("invalid reason", 400);
  }

  const voterKey = vote && typeof vote.voter_key === "string" ? vote.voter_key : "";
  if (!isUuid(voterKey)) return errorResponse("vote required", 409);

  const { data: updatedVote, error: updateError } = await admin
    .from("board_balance_votes")
    .update({ reason_index: reasonIndex })
    .eq("game_id", gameId)
    .eq("voter_key", voterKey)
    .select("reason_index")
    .maybeSingle();
  if (updateError || updatedVote?.reason_index !== reasonIndex) {
    return errorResponse("could not save reason", updateError ? 503 : 409);
  }

  let reasonCounts: number[] | undefined;
  const { data: reasonSummaries, error: reasonSummaryError } = await admin.rpc(
    "get_board_balance_reason_counts",
    { p_game_id: gameId, p_choice: choice },
  );
  if (reasonSummaryError) {
    if (!isMissingBalanceSchema(reasonSummaryError)) {
      console.error("[board-balance] Failed to read updated reason totals.", reasonSummaryError);
    }
  } else {
    reasonCounts = sanitizeBoardBalanceReasonCounts(reasonSummaries, reasons.length);
  }

  return NextResponse.json({
    ok: true,
    gameId,
    reasonIndex,
    ...(reasonCounts ? { reasonCounts } : {}),
  });
}
