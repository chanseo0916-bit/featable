import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";

import type {
  BoardBalanceChoice,
  BoardBalanceCounts,
  BoardBalanceGame,
} from "@/lib/board-balance-types";
import { BOARD_VIEWER_COOKIE } from "@/lib/board-viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type {
  BoardBalanceChoice,
  BoardBalanceCounts,
  BoardBalanceGame,
} from "@/lib/board-balance-types";

type DatabaseRow = Record<string, unknown>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isBoardBalanceChoice(value: unknown): value is BoardBalanceChoice {
  return value === "a" || value === "b";
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

function textValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function reasonValues(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 4);
}

function reasonIndexValue(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function nullableUuid(value: unknown): string | null {
  return isUuid(value) ? value.trim() : null;
}

function kstDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function emptyCounts(): BoardBalanceCounts {
  return { a: 0, b: 0, total: 0 };
}

function countValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function isMissingBalanceSchema(error: { code?: string; message?: string } | null | undefined): boolean {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /relation .* does not exist/i.test(error?.message ?? "")
  );
}

async function currentViewerId(): Promise<{ userId: string | null; viewerKey: string | null }> {
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = isUuid(data.user?.id) ? data.user.id : null;
  } catch {
    // Public visitors and deployments without Auth configuration are valid.
  }

  try {
    const viewerKey = (await cookies()).get(BOARD_VIEWER_COOKIE)?.value;
    return { userId, viewerKey: isUuid(viewerKey) ? viewerKey.trim() : null };
  } catch {
    return { userId, viewerKey: null };
  }
}

export async function getCurrentBoardBalanceGame(): Promise<BoardBalanceGame | null> {
  // This result depends on the incoming viewer even when today's game is
  // absent, so never let a build-time empty lookup freeze the whole page.
  await connection();
  const admin = createAdminClient();
  if (!admin) return null;

  const today = kstDateString();
  try {
    const { data: game, error: gameError } = await admin
      .from("board_balance_games")
      .select("id,game_date,question,option_a,option_b,status,discussion_post_id,option_a_reasons,option_b_reasons")
      .eq("game_date", today)
      .eq("status", "published")
      .maybeSingle();
    if (gameError || !game) {
      if (!isMissingBalanceSchema(gameError)) {
        console.error("[board-balance] Failed to read today's game.", gameError);
      }
      return null;
    }

    const gameRow = game as unknown as DatabaseRow;
    const gameId = nullableUuid(gameRow.id);
    if (!gameId) return null;

    const { userId, viewerKey } = await currentViewerId();
    let viewerChoice: BoardBalanceChoice | null = null;
    let viewerReasonIndex: number | null = null;

    if (userId) {
      const { data: userVote, error: userVoteError } = await admin
        .from("board_balance_votes")
        .select("choice,reason_index")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();
      if (userVoteError) return null;
      if (isBoardBalanceChoice((userVote as DatabaseRow | null)?.choice)) {
        viewerChoice = (userVote as DatabaseRow).choice as BoardBalanceChoice;
        viewerReasonIndex = reasonIndexValue((userVote as DatabaseRow).reason_index);
      }
    }

    if (!viewerChoice && viewerKey) {
      const { data: cookieVote, error: cookieVoteError } = await admin
        .from("board_balance_votes")
        .select("choice,reason_index,user_id")
        .eq("game_id", gameId)
        .eq("voter_key", viewerKey)
        .maybeSingle();
      if (cookieVoteError) return null;
      const cookieVoteRow = cookieVote as DatabaseRow | null;
      const cookieUserId = nullableUuid(cookieVoteRow?.user_id);
      if (
        (!cookieUserId || cookieUserId === userId)
        && isBoardBalanceChoice(cookieVoteRow?.choice)
      ) {
        viewerChoice = cookieVoteRow.choice as BoardBalanceChoice;
        if (userId) {
          viewerReasonIndex = reasonIndexValue(cookieVoteRow.reason_index);
        }
      }
    }

    // Do not include live totals in the RSC payload before this viewer votes;
    // otherwise the hidden result could still bias a technically curious user.
    const counts = emptyCounts();
    if (userId && viewerChoice) {
      const { data: summaries, error: summaryError } = await admin.rpc(
        "get_board_balance_vote_summaries",
        { p_game_ids: [gameId] },
      );
      if (summaryError) {
        if (!isMissingBalanceSchema(summaryError)) {
          console.error("[board-balance] Failed to read vote totals.", summaryError);
        }
        return null;
      }

      const summary = Array.isArray(summaries)
        ? summaries[0] as DatabaseRow | undefined
        : undefined;
      counts.a = countValue(summary?.option_a_count);
      counts.b = countValue(summary?.option_b_count);
      counts.total = counts.a + counts.b;
    }

    return {
      id: gameId,
      gameDate: textValue(gameRow.game_date, today),
      question: textValue(gameRow.question),
      optionA: textValue(gameRow.option_a),
      optionB: textValue(gameRow.option_b),
      status: "published",
      discussionPostId: nullableUuid(gameRow.discussion_post_id),
      viewerAuthenticated: Boolean(userId),
      optionAReasons: reasonValues(gameRow.option_a_reasons),
      optionBReasons: reasonValues(gameRow.option_b_reasons),
      viewerReasonIndex,
      counts,
      viewerChoice,
    };
  } catch (error) {
    console.error("[board-balance] Failed to load today's game.", error);
    return null;
  }
}
