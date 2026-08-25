import { BoardSplitFeed } from "@/components/board-split-feed";
import { getBoardPostsPage, isBoardCategory } from "@/lib/board";
import { getCurrentBoardBalanceGame } from "@/lib/board-balance";

type BoardPanelPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    view?: string | string[];
  }>;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BoardPanelPage({ searchParams }: BoardPanelPageProps) {
  const params = await searchParams;
  const categoryParam = firstParam(params.category);
  const activeCategory = isBoardCategory(categoryParam)
    ? categoryParam
    : undefined;
  const best = !activeCategory && firstParam(params.view) !== "latest";
  const [result, balanceGame] = await Promise.all([
    getBoardPostsPage({
      best,
      category: activeCategory,
    }),
    best ? getCurrentBoardBalanceGame() : Promise.resolve(null),
  ]);

  return (
    <BoardSplitFeed
      posts={result.posts}
      best={best}
      activeCategory={activeCategory}
      balanceGame={balanceGame}
    />
  );
}
