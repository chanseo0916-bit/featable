import { BoardSplitPanel } from "@/components/board-split-panel";

export default function BoardPanelLayout({ children }: { children: React.ReactNode }) {
  return <BoardSplitPanel>{children}</BoardSplitPanel>;
}
