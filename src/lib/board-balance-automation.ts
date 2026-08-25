import "server-only";

import { getAutoBoardBalancePrompt } from "@/lib/board-balance-prompts";
import { createAdminClient } from "@/lib/supabase/admin";

type DatabaseError = { code?: string; message?: string } | null;

type ExistingGame = {
  id: string;
  status: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export type EnsureDailyBoardBalanceGameResult = {
  gameDate: string;
  status: "created" | "existing";
  gameId: string;
  promptKey?: string;
};

export function getKstDateString(date = new Date()): string {
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

export function getNextKstDateString(date = new Date()): string {
  return getKstDateString(new Date(date.getTime() + DAY_MS));
}

function isUniqueConflict(error: DatabaseError) {
  return error?.code === "23505" || /duplicate key|unique constraint/i.test(error?.message ?? "");
}

async function findExistingGame(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  gameDate: string,
): Promise<ExistingGame | null> {
  const { data, error } = await admin
    .from("board_balance_games")
    .select("id,status")
    .eq("game_date", gameDate)
    .maybeSingle();
  if (error) throw new Error(error.message || "Failed to read the daily balance game.");
  if (!data || typeof data.id !== "string" || typeof data.status !== "string") return null;
  return { id: data.id, status: data.status };
}

/**
 * Ensures that the KST calendar day has one published game.
 *
 * A manually scheduled row always wins. The unique game_date index and the
 * second lookup after a conflict make retries and overlapping cron invocations
 * safe without creating orphaned discussion posts.
 */
export async function ensureDailyBoardBalanceGame(
  gameDate = getKstDateString(),
  createdBy?: string,
): Promise<EnsureDailyBoardBalanceGameResult> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client is not configured.");

  const existing = await findExistingGame(admin, gameDate);
  if (existing) {
    return { gameDate, status: "existing", gameId: existing.id };
  }

  let creatorId = createdBy;
  if (!creatorId) {
    const { data: adminProfile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message || "Failed to find an administrator profile.");
    if (!adminProfile || typeof adminProfile.id !== "string") {
      throw new Error("No administrator profile is available to create the daily balance game.");
    }
    creatorId = adminProfile.id;
  }

  const prompt = getAutoBoardBalancePrompt(gameDate);
  const { data: gameId, error: createError } = await admin.rpc("create_board_balance_game", {
    p_game_date: gameDate,
    p_question: prompt.question,
    p_option_a: prompt.optionA,
    p_option_b: prompt.optionB,
    p_option_a_reasons: prompt.optionAReasons,
    p_option_b_reasons: prompt.optionBReasons,
    p_status: "published",
    p_created_by: creatorId,
  });

  if (createError || typeof gameId !== "string") {
    // Two scheduled deliveries can race between the preflight read and the
    // RPC. The unique index is the arbiter; return the winner when it exists.
    if (isUniqueConflict(createError)) {
      const winner = await findExistingGame(admin, gameDate);
      if (winner) return { gameDate, status: "existing", gameId: winner.id };
    }
    throw new Error(createError?.message || "Failed to create the daily balance game.");
  }

  return { gameDate, status: "created", gameId, promptKey: prompt.key };
}
