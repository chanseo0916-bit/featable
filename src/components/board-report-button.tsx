"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { reportBoardContent } from "@/app/board/report-actions";
import {
  BOARD_REPORT_DETAIL_MAX_LENGTH,
  BOARD_REPORT_REASONS,
  isBoardReportReason,
  type BoardReportReason,
} from "@/lib/board-reports";

interface BoardReportTarget {
  postId: string;
  commentId?: string;
}

interface BoardReportButtonProps extends BoardReportTarget {
  loginHref?: string;
  label?: string;
  compact?: boolean;
}

const BoardReportContext = createContext<{
  openReport: (target: BoardReportTarget) => void;
  dialogId: string;
} | null>(null);

/** 한 상세 페이지에 신고 dialog를 하나만 두고 모든 게시글·댓글 버튼이 공유합니다. */
export function BoardReportProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const [target, setTarget] = useState<BoardReportTarget | null>(null);
  const [reason, setReason] = useState<BoardReportReason>(BOARD_REPORT_REASONS[0].value);
  const [details, setDetails] = useState("");
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTarget(null);
    setReason(BOARD_REPORT_REASONS[0].value);
    setDetails("");
    setNotice(null);
  }

  function openReport(nextTarget: BoardReportTarget) {
    setTarget(nextTarget);
    setReason(BOARD_REPORT_REASONS[0].value);
    setDetails("");
    setNotice(null);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (pending) return;
    dialogRef.current?.close();
  }

  function cancelDialog(event: SyntheticEvent<HTMLDialogElement>) {
    if (pending) event.preventDefault();
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !target) return;
    setNotice(null);
    startTransition(async () => {
      const result = await reportBoardContent({
        postId: target.postId,
        commentId: target.commentId,
        reason,
        details,
      });
      setNotice(
        result.ok
          ? { type: "success", text: result.message }
          : { type: "error", text: result.error },
      );
    });
  }

  return (
    <BoardReportContext.Provider value={{ openReport, dialogId }}>
      {children}
      <dialog
        ref={dialogRef}
        id={dialogId}
        className="board-report-dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={reset}
        onCancel={cancelDialog}
      >
        <form className="board-report-form" onSubmit={submit}>
          <div className="board-report-dialog__head">
            <div>
              <p className="board-report-dialog__eyebrow">COMMUNITY SAFETY</p>
              <h2 id={titleId}>{target?.commentId ? "댓글 신고" : "게시글 신고"}</h2>
              <p id={descriptionId}>신고 내용을 확인한 뒤 운영팀이 검토합니다.</p>
            </div>
            <button
              type="button"
              className="board-report-dialog__close"
              onClick={closeDialog}
              disabled={pending}
              aria-label="신고 창 닫기"
            >
              ×
            </button>
          </div>

          <label className="board-report-field">
            <span>신고 사유</span>
            <select
              autoFocus
              value={reason}
              onChange={(event) => {
                if (isBoardReportReason(event.target.value)) setReason(event.target.value);
              }}
              disabled={pending}
            >
              {BOARD_REPORT_REASONS.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="board-report-field">
            <span>추가 설명 <small>(선택)</small></span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={BOARD_REPORT_DETAIL_MAX_LENGTH}
              disabled={pending}
              placeholder="신고 내용을 구체적으로 알려주세요."
              rows={4}
            />
            <small className="board-report-counter">
              {details.length}/{BOARD_REPORT_DETAIL_MAX_LENGTH}
            </small>
          </label>

          {notice && (
            <p
              className={`board-report-notice board-report-notice--${notice.type}`}
              role={notice.type === "error" ? "alert" : "status"}
            >
              {notice.text}
            </p>
          )}

          <div className="board-report-dialog__actions">
            <button type="button" onClick={closeDialog} disabled={pending}>
              {notice?.type === "success" ? "닫기" : "취소"}
            </button>
            <button type="submit" disabled={pending || notice?.type === "success"}>
              {pending ? "접수 중" : notice?.type === "success" ? "접수 완료" : "신고 접수"}
            </button>
          </div>
        </form>
      </dialog>
    </BoardReportContext.Provider>
  );
}

export function BoardReportButton({
  postId,
  commentId,
  loginHref,
  label = "신고",
  compact = false,
}: BoardReportButtonProps) {
  const context = useContext(BoardReportContext);
  const buttonClassName = `board-report-button${compact ? " board-report-button--compact" : ""}`;

  if (loginHref) {
    return (
      <Link className={buttonClassName} href={loginHref} aria-label={`${label}하려면 로그인`}>
        {label}
      </Link>
    );
  }

  if (!context) {
    throw new Error("BoardReportButton must be rendered inside BoardReportProvider.");
  }

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={() => context.openReport({ postId, commentId })}
      aria-haspopup="dialog"
      aria-controls={context.dialogId}
    >
      {label}
    </button>
  );
}
