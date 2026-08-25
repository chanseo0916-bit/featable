"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBalanceGame, ensureTodayBalanceGame, updateBalanceGame, type BalanceGameInput, type BalanceGameStatus } from "./actions";

type BalanceGameFormProps = {
  mode: "create" | "edit";
  id?: string;
  initial?: BalanceGameInput;
  defaultGameDate?: string;
  contentLocked?: boolean;
};

function todayInKorea() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year") ?? ""}-${values.get("month") ?? ""}-${values.get("day") ?? ""}`;
}

function emptyForm(gameDate: string): BalanceGameInput {
  return {
    gameDate,
    question: "",
    optionA: "",
    optionB: "",
    optionAReasons: [""],
    optionBReasons: [""],
    status: "draft",
  };
}

const STATUS_OPTIONS: { value: BalanceGameStatus; label: string }[] = [
  { value: "draft", label: "초안" },
  { value: "published", label: "공개" },
  { value: "archived", label: "보관" },
];

export function BalanceGameForm({
  mode,
  id,
  initial,
  defaultGameDate,
  contentLocked = false,
}: BalanceGameFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<BalanceGameInput>(
    initial ?? emptyForm(defaultGameDate ?? todayInKorea()),
  );
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function set<K extends keyof BalanceGameInput>(key: K, value: BalanceGameInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setReasons(key: "optionAReasons" | "optionBReasons", value: string) {
    set(key, value.split(/\r?\n/).slice(0, 4));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setNotice(null);
      const result = mode === "create" ? await createBalanceGame(form) : await updateBalanceGame(id, form);
      if (!result.ok) {
        setNotice({ type: "error", text: result.error });
        return;
      }
      setNotice({ type: "success", text: result.message });
      if (mode === "create") setForm(emptyForm(form.gameDate));
      router.refresh();
    });
  }

  return (
    <form className="admin-balance-form" onSubmit={submit}>
      <div className="admin-balance-form-grid">
        <label>
          <span>게임 날짜</span>
          <input type="date" value={form.gameDate} onChange={(event) => set("gameDate", event.target.value)} disabled={contentLocked} required />
        </label>
        <label className="admin-balance-form-wide">
          <span>질문</span>
          <input value={form.question} onChange={(event) => set("question", event.target.value)} maxLength={240} placeholder="예: 투자받고 빠르게 성장 vs 매출로 천천히 성장" disabled={contentLocked} required />
        </label>
        <label>
          <span>A 선택지</span>
          <input value={form.optionA} onChange={(event) => set("optionA", event.target.value)} maxLength={160} placeholder="투자받고 빠르게 성장" disabled={contentLocked} required />
        </label>
        <label>
          <span>B 선택지</span>
          <input value={form.optionB} onChange={(event) => set("optionB", event.target.value)} maxLength={160} placeholder="매출로 천천히 성장" disabled={contentLocked} required />
        </label>
        <label>
          <span>A 이유 칩</span>
          <textarea
            value={form.optionAReasons.join("\n")}
            onChange={(event) => setReasons("optionAReasons", event.target.value)}
            placeholder="이유를 한 줄에 하나씩 입력"
            rows={4}
            disabled={contentLocked}
            required
          />
          <small>1~4개 · 한 줄 최대 30자</small>
        </label>
        <label>
          <span>B 이유 칩</span>
          <textarea
            value={form.optionBReasons.join("\n")}
            onChange={(event) => setReasons("optionBReasons", event.target.value)}
            placeholder="이유를 한 줄에 하나씩 입력"
            rows={4}
            disabled={contentLocked}
            required
          />
          <small>1~4개 · 한 줄 최대 30자</small>
        </label>
        <label>
          <span>상태</span>
          <select value={form.status} onChange={(event) => set("status", event.target.value as BalanceGameStatus)}>
            {STATUS_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      {contentLocked && (
        <p className="admin-balance-lock-notice">
          투표가 시작되어 날짜·질문·선택지·이유는 잠겼습니다. 공개 상태는 변경할 수 있습니다.
        </p>
      )}
      {notice && <p className={`admin-balance-notice ${notice.type}`} role="status">{notice.text}</p>}
      <button className="admin-balance-submit" type="submit" disabled={pending}>{pending ? "저장 중..." : mode === "create" ? "밸런스 게임 등록" : "변경사항 저장"}</button>
    </form>
  );
}

export function BalanceGameEditForm({
  id,
  initial,
  contentLocked,
}: {
  id: string;
  initial: BalanceGameInput;
  contentLocked: boolean;
}) {
  return (
    <details className="admin-balance-edit">
      <summary>내용 및 상태 수정</summary>
      <BalanceGameForm mode="edit" id={id} initial={initial} contentLocked={contentLocked} />
    </details>
  );
}

const AUTOMATION_STATUS_COPY: Record<BalanceGameStatus, { title: string; detail: string }> = {
  published: {
    title: "공개 게임 준비됨",
    detail: "직접 예약한 게임이 자동 생성보다 우선합니다.",
  },
  draft: {
    title: "초안이 예약됨",
    detail: "자동화는 덮어쓰지 않아요. 아래 목록에서 공개 상태로 바꿔주세요.",
  },
  archived: {
    title: "보관 게임이 예약됨",
    detail: "오늘은 공개되지 않아요. 아래 목록에서 상태를 수정해주세요.",
  },
};

export function BalanceAutomationControls({ status }: { status: BalanceGameStatus | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const hasGame = status !== null;
  const statusCopy = status ? AUTOMATION_STATUS_COPY[status] : null;

  function ensureToday() {
    startTransition(async () => {
      setNotice(null);
      const result = await ensureTodayBalanceGame();
      setNotice({ type: result.ok ? "success" : "error", text: result.ok ? result.message : result.error });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="admin-balance-automation-controls">
      <div className="admin-balance-automation-status">
        <span className="admin-balance-automation-label">오늘 KST 슬롯</span>
        <strong>{statusCopy?.title ?? "아직 비어 있음"}</strong>
        <span>{statusCopy?.detail ?? "자정 자동 생성 전, 지금 바로 채울 수 있습니다."}</span>
      </div>
      <button className="admin-balance-automation-button" type="button" onClick={ensureToday} disabled={pending || hasGame}>
        {pending ? "준비 중…" : hasGame ? "오늘 슬롯 예약됨" : "오늘 게임 자동 생성"}
      </button>
      {notice && <p className={`admin-balance-notice ${notice.type}`} role="status">{notice.text}</p>}
    </div>
  );
}
