import { NextResponse, type NextRequest } from "next/server";

import {
  isBoardBalanceChoice,
  isUuid,
  type BoardBalanceChoice,
  type BoardBalanceCounts,
} from "@/lib/board-balance";
import {
  BOARD_VIEWER_COOKIE,
  BOARD_VIEWER_COOKIE_MAX_AGE,
} from "@/lib/board-viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type VoteBody = {
  gameId?: unknown;
  choice?: unknown;
};

type VoteRpcResult = {
  game_id?: unknown;
  choice?: unknown;
  counts?: {
    a?: unknown;
    b?: unknown;
    total?: unknown;
  };
};

function countValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function countsFromRpc(value: unknown): BoardBalanceCounts {
  const counts = value && typeof value === "object"
    ? (value as VoteRpcResult["counts"])
    : undefined;
  const a = countValue(counts?.a);
  const b = countValue(counts?.b);
  return { a, b, total: a + b };
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function responseWithViewerCookie(
  payload: Record<string, unknown>,
  viewerKey: string,
) {
  const response = NextResponse.json(payload);
  response.cookies.set(BOARD_VIEWER_COOKIE, viewerKey, {
    httpOnly: true,
    maxAge: BOARD_VIEWER_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

function rpcErrorResponse(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  if (/invalid_choice|invalid_identity|invalid_user/i.test(message)) {
    return errorResponse("invalid vote", 400);
  }
  if (/game_unavailable/i.test(message)) {
    return errorResponse("today's balance game is unavailable", 409);
  }
  if (/identity_conflict/i.test(message)) {
    return errorResponse("vote identity conflict", 409);
  }
  return errorResponse("balance game is not ready", 503);
}

export async function POST(request: NextRequest) {
  let body: VoteBody;
  try {
    const parsed: unknown = await request.json();
    body = parsed !== null && typeof parsed === "object" ? parsed as VoteBody : {};
  } catch {
    return errorResponse("invalid body", 400);
  }

  const gameId = typeof body.gameId === "string" ? body.gameId.trim() : "";
  const choice = body.choice;
  if (!isUuid(gameId)) return errorResponse("invalid game id", 400);
  if (!isBoardBalanceChoice(choice)) return errorResponse("invalid choice", 400);

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = isUuid(data.user?.id) ? data.user.id : null;
  } catch {
    // Anonymous voting remains available when Auth is not configured.
  }

  const existingViewerKey = request.cookies.get(BOARD_VIEWER_COOKIE)?.value;
  const hasValidViewerKey = isUuid(existingViewerKey);
  const admin = createAdminClient();
  if (!admin) return errorResponse("balance game is not configured", 503);

  let viewerKey = hasValidViewerKey ? existingViewerKey : crypto.randomUUID();
  if (hasValidViewerKey) {
    const { data: existingVote, error: existingVoteError } = await admin
      .from("board_balance_votes")
      .select("user_id")
      .eq("game_id", gameId)
      .eq("voter_key", viewerKey)
      .maybeSingle();
    if (existingVoteError) return errorResponse("balance game is not ready", 503);

    // A cookie can survive logout or be copied between accounts. Never let a
    // different account inherit the old browser's vote identity.
    if (
      existingVote
      && existingVote.user_id !== null
      && existingVote.user_id !== userId
    ) {
      viewerKey = crypto.randomUUID();
    }
  }

  let { data, error } = await admin.rpc("cast_board_balance_vote", {
    p_game_id: gameId,
    p_voter_key: viewerKey,
    p_user_id: userId,
    p_choice: choice as BoardBalanceChoice,
  });
  if (error && /identity_conflict/i.test(error.message ?? "")) {
    // The ownership check and RPC can race with another account on a shared
    // browser. Rotate once more and retry with an isolated identity.
    viewerKey = crypto.randomUUID();
    ({ data, error } = await admin.rpc("cast_board_balance_vote", {
      p_game_id: gameId,
      p_voter_key: viewerKey,
      p_user_id: userId,
      p_choice: choice as BoardBalanceChoice,
    }));
  }
  if (error) return rpcErrorResponse(error);

  const result = (data ?? {}) as VoteRpcResult;
  const resultChoice = isBoardBalanceChoice(result.choice)
    ? result.choice
    : (choice as BoardBalanceChoice);
  const payload: Record<string, unknown> = {
    ok: true,
    gameId,
    choice: resultChoice,
    viewerChoice: resultChoice,
    requiresLogin: !userId,
  };
  if (userId) payload.counts = countsFromRpc(result.counts);

  return responseWithViewerCookie(
    payload,
    viewerKey,
  );
}
