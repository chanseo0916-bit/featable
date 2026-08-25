"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setBoardSplitPanelOpen } from "@/components/board-split-state";
import styles from "@/components/board-split-panel.module.css";

const CLOSE_ANIMATION_MS = 280;

export function BoardSplitPanel({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [phase, setPhase] = useState<"opening" | "open" | "closing">("opening");

  const closePanel = useCallback(() => {
    if (phase === "closing") return;
    setPhase("closing");
    closeTimerRef.current = setTimeout(() => {
      router.back();
      setTimeout(() => {
        document.getElementById("board-split-trigger")?.focus({ preventScroll: true });
      }, 80);
    }, CLOSE_ANIMATION_MS);
  }, [phase, router]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setPhase("open");
      closeButtonRef.current?.focus({ preventScroll: true });
    });
    setBoardSplitPanelOpen(true);
    return () => {
      cancelAnimationFrame(frame);
      setBoardSplitPanelOpen(false);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const competingDialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (competingDialog && !panelRef.current?.contains(competingDialog)) return;
      event.preventDefault();
      closePanel();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closePanel]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  return (
    <aside
      ref={panelRef}
      id="board-split-panel"
      className={styles.panel}
      data-phase={phase}
      aria-labelledby="board-split-title"
    >
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.liveMark} aria-hidden="true" />
          <div>
            <h2 id="board-split-title">게시판</h2>
            <p>지금 오가는 창업 이야기를 확인해보세요.</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Link
            className={styles.iconButton}
            href="/board"
            aria-label="게시판 전체화면으로 보기"
            title="전체화면"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />
            </svg>
          </Link>
          <button
            ref={closeButtonRef}
            className={styles.iconButton}
            type="button"
            onClick={closePanel}
            aria-label="게시판 패널 닫기"
            title="닫기"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </header>

      <div className={styles.scroller}>{children}</div>

      <footer className={styles.footer}>
        <Link className={styles.writeButton} href="/board/write">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
            <path d="m13.5 6.5 4 4" />
          </svg>
          글쓰기
        </Link>
        <Link className={styles.fullButton} href="/board">
          전체 게시판
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </Link>
      </footer>
    </aside>
  );
}
