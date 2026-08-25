"use server";

import { revalidatePath } from "next/cache";
import { getBoardAdminAccess } from "../access";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BalanceGameStatus = "draft" | "published" | "archived";

export type BalanceGameInput = {
  gameDate: string;
  question: string;
  optionA: string;
  optionB: string;
  optionAReasons: string[];
  optionBReasons: string[];
  status: BalanceGameStatus;
};

export type BalanceGameActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function reasons(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => text(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function validReasons(value: string[]) {
  if (value.length < 1 || value.length > 4) return false;
  if (value.some((reason) => reason.length < 1 || reason.length > 30)) return false;
  const normalized = value.map((reason) => reason.toLocaleLowerCase());
  return new Set(normalized).size === normalized.length;
}

function validStatus(value: unknown): value is BalanceGameStatus {
  return value === "draft" || value === "published" || value === "archived";
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function parseInput(input: unknown):
  | { ok: true; data: BalanceGameInput }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "밸런스 게임 입력값을 확인해 주세요." };
  }

  const value = input as Record<string, unknown>;
  const data: BalanceGameInput = {
    gameDate: text(value.gameDate),
    question: text(value.question),
    optionA: text(value.optionA),
    optionB: text(value.optionB),
    optionAReasons: reasons(value.optionAReasons),
    optionBReasons: reasons(value.optionBReasons),
    status: value.status as BalanceGameStatus,
  };

  if (!validDate(data.gameDate)) return { ok: false, error: "게임 날짜를 올바르게 입력해 주세요." };
  if (data.question.length < 2 || data.question.length > 240) return { ok: false, error: "질문은 2자 이상 240자 이하로 입력해 주세요." };
  if (data.optionA.length < 1 || data.optionA.length > 160) return { ok: false, error: "A 선택지는 1자 이상 160자 이하로 입력해 주세요." };
  if (data.optionB.length < 1 || data.optionB.length > 160) return { ok: false, error: "B 선택지는 1자 이상 160자 이하로 입력해 주세요." };
  if (data.optionA === data.optionB) return { ok: false, error: "두 선택지는 서로 다르게 입력해 주세요." };
  if (!validStatus(data.status)) return { ok: false, error: "공개 상태를 올바르게 선택해 주세요." };
  if (!validReasons(data.optionAReasons) || !validReasons(data.optionBReasons)) {
    return { ok: false, error: "각 선택지의 이유를 1~4개 입력해주세요. 이유는 30자 이내이며 중복할 수 없습니다." };
  }
  return { ok: true, data };
}

function revalidateBalanceGame() {
  revalidatePath("/admin/board/balance");
  revalidatePath("/admin/board");
  revalidatePath("/balance");
  revalidatePath("/board");
  revalidatePath("/board/panel");
}

function mutationErrorMessage(
  error: { code?: string; message?: string },
  fallback: string,
) {
  const message = error.message ?? "";
  if (error.code === "23505" || /duplicate key/i.test(message)) {
    return "같은 날짜의 밸런스 게임이 이미 있습니다.";
  }
  if (/board_balance_game_has_votes/i.test(message)) {
    return "투표가 시작된 게임은 날짜·질문·선택지·이유를 바꿀 수 없습니다. 공개 상태만 변경해 주세요.";
  }
  if (/board_balance_game_not_found/i.test(message)) {
    return "밸런스 게임을 찾지 못했습니다.";
  }
  if (/board_balance_game_(admin_required|invalid_input)/i.test(message)) {
    return "관리자 권한과 입력값을 다시 확인해 주세요.";
  }
  return fallback;
}

export async function createBalanceGame(input: unknown): Promise<BalanceGameActionResult> {
  const access = await getBoardAdminAccess();
  if (!access.ok) return { ok: false, error: access.error };
  const parsed = parseInput(input);
  if (!parsed.ok) return parsed;
  const game = parsed.data;

  const { data, error } = await access.admin.rpc("create_board_balance_game", {
    p_game_date: game.gameDate,
    p_question: game.question,
    p_option_a: game.optionA,
    p_option_b: game.optionB,
    p_option_a_reasons: game.optionAReasons,
    p_option_b_reasons: game.optionBReasons,
    p_status: game.status,
    p_created_by: access.userId,
  });
  if (error || typeof data !== "string" || !UUID_PATTERN.test(data)) {
    console.error("[admin/board/balance] Failed to create balance game.", error);
    return {
      ok: false,
      error: error
        ? mutationErrorMessage(error, "밸런스 게임과 연결 토론을 저장하지 못했습니다.")
        : "밸런스 게임 저장 결과를 확인하지 못했습니다.",
    };
  }

  revalidateBalanceGame();
  return { ok: true, message: "밸런스 게임이 등록되었습니다." };
}

export async function updateBalanceGame(id: unknown, input: unknown): Promise<BalanceGameActionResult> {
  const access = await getBoardAdminAccess();
  if (!access.ok) return { ok: false, error: access.error };
  if (typeof id !== "string" || !UUID_PATTERN.test(id.trim())) return { ok: false, error: "밸런스 게임 식별자를 확인해 주세요." };
  const parsed = parseInput(input);
  if (!parsed.ok) return parsed;
  const game = parsed.data;
  const gameId = id.trim();

  const { data, error } = await access.admin.rpc("update_board_balance_game", {
    p_game_id: gameId,
    p_game_date: game.gameDate,
    p_question: game.question,
    p_option_a: game.optionA,
    p_option_b: game.optionB,
    p_option_a_reasons: game.optionAReasons,
    p_option_b_reasons: game.optionBReasons,
    p_status: game.status,
    p_updated_by: access.userId,
  });
  if (error || data !== gameId) {
    console.error("[admin/board/balance] Failed to update balance game.", error);
    return {
      ok: false,
      error: error
        ? mutationErrorMessage(error, "밸런스 게임과 연결 토론을 수정하지 못했습니다.")
        : "밸런스 게임 수정 결과를 확인하지 못했습니다.",
    };
  }

  revalidateBalanceGame();
  return { ok: true, message: "밸런스 게임이 수정되었습니다." };
}
