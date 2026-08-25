"use client";

import Link from "next/link";
import { useState } from "react";
import { BoardBalanceCountdown } from "@/components/board-balance-countdown";
import type {
  BoardBalanceChoice,
  BoardBalanceGame as BoardBalanceGameData,
} from "@/lib/board-balance-types";
import styles from "@/styles/board-balance-game.module.css";

type VoteResponse = {
  choice?: BoardBalanceChoice;
  counts?: BoardBalanceGameData["counts"];
  requiresLogin?: boolean;
};

type ReasonResponse = {
  reasonIndex?: number;
};

function isChoice(value: unknown): value is BoardBalanceChoice {
  return value === "a" || value === "b";
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function readVoteResponse(value: unknown): VoteResponse | null {
  if (!value || typeof value !== "object") return null;

  const payload = value as Record<string, unknown>;
  const nested = payload.result && typeof payload.result === "object"
    ? payload.result as Record<string, unknown>
    : payload;
  const counts = nested.counts && typeof nested.counts === "object"
    ? nested.counts as Record<string, unknown>
    : null;

  return {
    choice: isChoice(nested.choice) ? nested.choice : undefined,
    counts: counts && isCount(counts.a) && isCount(counts.b) && isCount(counts.total)
      ? { a: counts.a, b: counts.b, total: counts.total }
      : undefined,
    requiresLogin: payload.requiresLogin === true,
  };
}

function readReasonResponse(value: unknown): ReasonResponse | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  return typeof payload.reasonIndex === "number"
    && Number.isSafeInteger(payload.reasonIndex)
    && payload.reasonIndex >= 0
    ? { reasonIndex: payload.reasonIndex }
    : null;
}

function resultPercentages(counts: BoardBalanceGameData["counts"]) {
  if (counts.total <= 0) return { a: 0, b: 0 };

  const a = Math.round((counts.a / counts.total) * 100);
  return { a, b: 100 - a };
}

export function BoardBalanceGame({
  game,
  compact = false,
}: {
  game: BoardBalanceGameData;
  compact?: boolean;
}) {
  const [choice, setChoice] = useState<BoardBalanceChoice | null>(game.viewerChoice);
  const [counts, setCounts] = useState(game.counts);
  const [pendingChoice, setPendingChoice] = useState<BoardBalanceChoice | null>(null);
  const [reasonIndex, setReasonIndex] = useState<number | null>(game.viewerReasonIndex);
  const [pendingReasonIndex, setPendingReasonIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [reasonError, setReasonError] = useState("");
  const percentages = resultPercentages(counts);
  const hasVote = choice !== null;
  const hasResult = hasVote && game.viewerAuthenticated;
  const selectedReasons = choice === "a" ? game.optionAReasons : game.optionBReasons;

  async function vote(nextChoice: BoardBalanceChoice) {
    if (hasVote || pendingChoice) return;

    setError("");
    setPendingChoice(nextChoice);

    try {
      const response = await fetch("/api/board/balance/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gameId: game.id, choice: nextChoice }),
      });
      const payload = readVoteResponse(await response.json().catch(() => null));

      if (!response.ok || !payload?.choice) {
        throw new Error(
          response.status === 409
            ? "오늘의 투표가 마감됐어요. 새로고침해 주세요."
            : "투표를 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
        );
      }

      if (!payload.requiresLogin && !payload.counts) {
        throw new Error("투표 결과를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
      }
      setChoice(payload.choice);
      if (payload.counts) setCounts(payload.counts);
    } catch (voteError) {
      setError(
        voteError instanceof Error
          ? voteError.message
          : "투표를 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setPendingChoice(null);
    }
  }

  async function selectReason(nextReasonIndex: number) {
    if (!hasResult || pendingReasonIndex !== null) return;

    setReasonError("");
    setPendingReasonIndex(nextReasonIndex);

    try {
      const response = await fetch("/api/board/balance/reason", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gameId: game.id, reasonIndex: nextReasonIndex }),
      });
      const payload = readReasonResponse(await response.json().catch(() => null));
      if (!response.ok || payload?.reasonIndex === undefined) {
        throw new Error(
          response.status === 401
            ? "로그인 상태를 다시 확인해 주세요."
            : "선택한 이유를 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
        );
      }
      setReasonIndex(payload.reasonIndex);
    } catch (reasonSaveError) {
      setReasonError(
        reasonSaveError instanceof Error
          ? reasonSaveError.message
          : "선택한 이유를 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setPendingReasonIndex(null);
    }
  }

  return (
    <section
      className={`${styles.game}${compact ? ` ${styles.compact}` : ""}`}
      aria-labelledby={`board-balance-${game.id}`}
    >
      <div className={styles.heading}>
        <p>오늘의 밸런스</p>
        <BoardBalanceCountdown />
      </div>

      <h2 id={`board-balance-${game.id}`}>{game.question}</h2>

      <fieldset className={styles.fieldset} disabled={pendingChoice !== null || hasVote}>
        <legend className="sr-only">두 선택지 중 하나를 골라주세요</legend>
        <div className={styles.choices}>
          <button
            type="button"
            className={styles.choice}
            data-selected={choice === "a"}
            aria-pressed={choice === "a"}
            onClick={() => vote("a")}
          >
            <span className={styles.choiceTopline}>
              <span className={styles.choiceLabel}>A</span>
              {choice === "a" ? (
                <span className={styles.selectedChoiceBadge}>
                  <svg aria-hidden="true" viewBox="0 0 20 20">
                    <path d="m5 10 3 3 7-7" />
                  </svg>
                  내 선택
                </span>
              ) : null}
            </span>
            <span className={styles.choiceText}>{game.optionA}</span>
            {pendingChoice === "a" && <span className={styles.pending}>투표 중...</span>}
          </button>

          <button
            type="button"
            className={styles.choice}
            data-selected={choice === "b"}
            aria-pressed={choice === "b"}
            onClick={() => vote("b")}
          >
            <span className={styles.choiceTopline}>
              <span className={styles.choiceLabel}>B</span>
              {choice === "b" ? (
                <span className={styles.selectedChoiceBadge}>
                  <svg aria-hidden="true" viewBox="0 0 20 20">
                    <path d="m5 10 3 3 7-7" />
                  </svg>
                  내 선택
                </span>
              ) : null}
            </span>
            <span className={styles.choiceText}>{game.optionB}</span>
            {pendingChoice === "b" && <span className={styles.pending}>투표 중...</span>}
          </button>
        </div>
      </fieldset>

      {!hasVote && (
        <div className={styles.status} aria-live="polite">
          {!error && (
            <p>
              투표는 로그인 없이 할 수 있어요. 결과 확인은 로그인 후 가능해요.
            </p>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}

      {hasVote && (
        <div className={styles.resultGate} aria-live="polite">
          <div className={styles.lockedResultPreview} aria-hidden={!hasResult}>
            <div className={styles.lockedResultTopline}>
              <span>실시간 투표 결과</span>
              {hasResult && <strong>{counts.total.toLocaleString("ko-KR")}명 참여</strong>}
            </div>
            <div className={styles.lockedResultRows} data-locked={!hasResult}>
              <div className={styles.lockedResultRow}>
                <b>A</b>
                {hasResult ? (
                  <progress
                    className={styles.resultBar}
                    max="100"
                    value={percentages.a}
                    aria-label={`${game.optionA} ${percentages.a}%`}
                  />
                ) : (
                  <span><i /></span>
                )}
                <em>{hasResult ? `${percentages.a}%` : "••%"}</em>
              </div>
              <div className={styles.lockedResultRow}>
                <b>B</b>
                {hasResult ? (
                  <progress
                    className={styles.resultBar}
                    max="100"
                    value={percentages.b}
                    aria-label={`${game.optionB} ${percentages.b}%`}
                  />
                ) : (
                  <span><i /></span>
                )}
                <em>{hasResult ? `${percentages.b}%` : "••%"}</em>
              </div>
            </div>
          </div>

          {!game.viewerAuthenticated && (
            <Link href="/login?next=%2Fbalance">
              내 선택 결과 확인하기
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      )}

      {hasResult && selectedReasons.length > 0 && (
        <fieldset className={styles.reasons} disabled={pendingReasonIndex !== null}>
          <legend>이 선택을 한 가장 큰 이유는?</legend>
          <div>
            {selectedReasons.map((reason, index) => (
              <button
                type="button"
                data-selected={reasonIndex === index}
                aria-pressed={reasonIndex === index}
                onClick={() => selectReason(index)}
                key={`${index}-${reason}`}
              >
                <span>{reason}</span>
                {pendingReasonIndex === index && <small>저장 중...</small>}
              </button>
            ))}
          </div>
          {reasonError && <p className={styles.error} role="alert">{reasonError}</p>}
        </fieldset>
      )}

      {hasResult && (
        <div className={styles.status} aria-live="polite">
          <p>내 선택은 <strong>{choice === "a" ? "A" : "B"}</strong>예요.</p>
          {game.discussionPostId && (
            <Link href={`/board/${game.discussionPostId}#comments`}>
              다른 의견도 보기
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
