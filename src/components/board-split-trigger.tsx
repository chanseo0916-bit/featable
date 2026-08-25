"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getBoardSplitPanelServerSnapshot,
  getBoardSplitPanelSnapshot,
  subscribeToBoardSplitPanel,
} from "@/components/board-split-state";
import styles from "@/components/site-header.module.css";

export function BoardSplitTrigger() {
  const router = useRouter();
  const pathname = usePathname();
  const expanded = useSyncExternalStore(
    subscribeToBoardSplitPanel,
    getBoardSplitPanelSnapshot,
    getBoardSplitPanelServerSnapshot,
  );
  const onFullBoardPage = !expanded && (
    pathname === "/board" ||
    (pathname.startsWith("/board/") && pathname !== "/board/panel")
  );

  return (
    <Link
      id="board-split-trigger"
      className={`${styles.boardTrigger}${expanded ? ` ${styles.boardTriggerOpen}` : onFullBoardPage ? ` ${styles.boardTriggerCurrent}` : ""}`}
      href={onFullBoardPage ? "/board" : "/board/panel"}
      scroll={false}
      aria-controls="board-split-panel"
      aria-expanded={expanded}
      aria-current={onFullBoardPage ? "page" : undefined}
      onClick={(event) => {
        if (!document.getElementById("board-split-panel")) return;
        event.preventDefault();
        router.back();
      }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 5.5h16v11H9l-5 4v-15Z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
      <span>게시판</span>
      <i aria-hidden="true" />
    </Link>
  );
}
