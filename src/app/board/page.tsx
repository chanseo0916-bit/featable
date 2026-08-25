import Link from "next/link";
import { redirect } from "next/navigation";
import { BoardBalanceGame } from "@/components/board-balance-game";
import { Header } from "@/components/site-shell";
import {
  BOARD_CATEGORIES,
  BOARD_BEST_LIKE_THRESHOLD,
  boardCategoryLabel,
  boardCategoryTitle,
  getBoardPostsPage,
  isBoardCategory,
  normalizeBoardSearch,
  type BoardCategory,
} from "@/lib/board";
import { getCurrentBoardBalanceGame } from "@/lib/board-balance";
import { createPageMetadata } from "@/lib/site";
import "@/styles/board.css";

export const metadata = createPageMetadata({
  title: "게시판",
  description:
    "창업 과정의 자유로운 이야기와 질문, 피드백, 팀 찾기를 나누는 피터블 게시판입니다.",
  path: "/board",
});

type BoardPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    filter?: string | string[];
    view?: string | string[];
    notice?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function boardHref({
  category,
  unanswered = false,
  best = false,
  search = "",
  page = 1,
}: {
  category?: BoardCategory;
  unanswered?: boolean;
  best?: boolean;
  search?: string;
  page?: number;
} = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (unanswered) params.set("filter", "unanswered");
  if (best) params.set("view", "best");
  if (search) params.set("q", search);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/board?${query}` : "/board";
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function BoardPage({ searchParams }: BoardPageProps) {
  const params = await searchParams;
  const best = firstParam(params.view) === "best";
  const categoryParam = firstParam(params.category);
  const activeCategory =
    !best && categoryParam && isBoardCategory(categoryParam) ? categoryParam : undefined;
  const unanswered = !best && firstParam(params.filter) === "unanswered";
  const search = normalizeBoardSearch(firstParam(params.q));
  const pageParam = Number.parseInt(firstParam(params.page) ?? "1", 10);
  const requestedPage = Number.isSafeInteger(pageParam) && pageParam > 0
    ? Math.min(pageParam, 10000)
    : 1;
  const notice = firstParam(params.notice) === "post-deleted"
    ? "게시글을 삭제했습니다."
    : undefined;
  const shouldShowBalanceGame = !activeCategory && !unanswered && !search;
  const [result, balanceGame] = await Promise.all([
    getBoardPostsPage({
      category: activeCategory,
      unanswered,
      best,
      search,
      page: requestedPage,
    }),
    shouldShowBalanceGame ? getCurrentBoardBalanceGame() : Promise.resolve(null),
  ]);
  if (result.totalPages > 0 && requestedPage > result.totalPages) {
    redirect(boardHref({
      category: activeCategory,
      unanswered,
      best,
      search,
      page: result.totalPages,
    }));
  }
  const posts = result.posts;

  return (
    <>
      <Header showChannels={false} />
      <main className="board-page-shell">
        <div className="board-page">
          <header className="board-heading">
            <h1>게시판</h1>
            <Link className="board-compose-link" href="/board/write">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 20h4l11-11-4-4L4 16v4Z" />
                <path d="m13.5 6.5 4 4" />
              </svg>
              <span>글쓰기</span>
            </Link>
          </header>

          {notice && <p className="board-action-notice" role="status">{notice}</p>}

          <nav className="board-categories" aria-label="게시판 카테고리">
            <Link
              className={!activeCategory && !best ? "active" : ""}
              href={boardHref({ unanswered, search })}
              aria-current={!activeCategory && !best ? "page" : undefined}
            >
              전체
            </Link>
            <Link
              className={best ? "active" : ""}
              href={boardHref({ best: true, search })}
              aria-current={best ? "page" : undefined}
            >
              베스트
            </Link>
            {BOARD_CATEGORIES.map((category) => (
              <Link
                className={activeCategory === category.value ? "active" : ""}
                href={boardHref({ category: category.value, unanswered, search })}
                aria-current={activeCategory === category.value ? "page" : undefined}
                key={category.value}
              >
                {category.label}
              </Link>
            ))}
          </nav>

          {balanceGame && <BoardBalanceGame game={balanceGame} />}

          <form className="board-search-form" action="/board" method="get" role="search">
            {best ? (
              <input type="hidden" name="view" value="best" />
            ) : (
              <>
                {activeCategory && (
                  <input type="hidden" name="category" value={activeCategory} />
                )}
                {unanswered && (
                  <input type="hidden" name="filter" value="unanswered" />
                )}
              </>
            )}
            <label className="sr-only" htmlFor="board-search-input">게시판 검색</label>
            <input
              id="board-search-input"
              name="q"
              type="search"
              defaultValue={search}
              maxLength={80}
              placeholder="제목과 내용 검색"
            />
            {search && (
              <Link
                href={boardHref({ category: activeCategory, unanswered, best })}
                aria-label="검색어 지우기"
              >
                지우기
              </Link>
            )}
            <button type="submit">검색</button>
          </form>

          <section className="board-feed" aria-labelledby="board-feed-title">
            <div className="board-feed-heading">
              <h2 id="board-feed-title">
                {best
                  ? "베스트 게시판"
                  : activeCategory
                    ? boardCategoryTitle(activeCategory)
                    : "전체 게시판"}
              </h2>
              {best ? (
                <span className="board-best-rule">
                  좋아요 {BOARD_BEST_LIKE_THRESHOLD}+
                </span>
              ) : (
                <div role="group" aria-label="게시글 필터">
                  <Link
                    className={!unanswered ? "active" : ""}
                    href={boardHref({ category: activeCategory, search })}
                    aria-current={!unanswered ? "page" : undefined}
                  >
                    최신
                  </Link>
                  <Link
                    className={unanswered ? "active" : ""}
                    href={boardHref({ category: activeCategory, unanswered: true, search })}
                    aria-current={unanswered ? "page" : undefined}
                  >
                    댓글 없는 글
                  </Link>
                </div>
              )}
            </div>

            {search && (
              <p className="board-search-summary">
                <strong>“{search}”</strong> 검색 결과 {result.total.toLocaleString("ko-KR")}개
              </p>
            )}

            {posts.length > 0 ? (
              <ul className="board-post-list">
                {posts.map((post) => (
                  <li key={post.id}>
                    <Link className="board-post-row" href={`/board/${post.id}`}>
                      <div className="board-post-copy">
                        {!activeCategory && (
                          <span className="board-post-category">
                            {boardCategoryLabel(post.category)}
                          </span>
                        )}
                        <h3>{post.title}</h3>
                        {post.excerpt && <p>{post.excerpt}</p>}
                        <div className="board-post-meta">
                          <time dateTime={post.createdAt}>{dateLabel(post.createdAt)}</time>
                          <span aria-hidden="true">·</span>
                          <span>{post.authorName}</span>
                        </div>
                      </div>
                      <span className="board-post-metrics">
                        <span
                          className="board-post-like-count"
                          aria-label={`좋아요 ${post.likeCount}개`}
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24">
                            <path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 6l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.3a5.5 5.5 0 0 0 0-7.8Z" />
                          </svg>
                          {post.likeCount}
                        </span>
                        <span
                          className="board-post-comment-count"
                          aria-label={`댓글 ${post.commentCount}개`}
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24">
                            <path d="M4 5h16v11H9l-5 4V5Z" />
                          </svg>
                          {post.commentCount}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="board-empty">
                <p>
                  <strong>
                    {search
                      ? "검색 결과가 없어요"
                      : best
                      ? "아직 베스트 글이 없어요"
                      : activeCategory || unanswered
                      ? "조건에 맞는 글이 아직 없어요"
                      : "아직 게시글이 없어요"}
                  </strong>
                  <span>
                    {search
                      ? "다른 검색어를 입력해보세요."
                      : best
                      ? `좋아요 ${BOARD_BEST_LIKE_THRESHOLD}개부터 베스트에 올라와요.`
                      : "첫 글을 남겨보세요."}
                  </span>
                </p>
                <Link className="board-empty-compose" href="/board/write">
                  첫 글 쓰기
                </Link>
              </div>
            )}

            {posts.length > 0 && result.totalPages > 1 && (
              <nav className="board-pagination" aria-label="게시판 페이지">
                {result.page > 1 ? (
                  <Link
                    href={boardHref({
                      category: activeCategory,
                      unanswered,
                      best,
                      search,
                      page: result.page - 1,
                    })}
                  >
                    이전
                  </Link>
                ) : (
                  <span aria-disabled="true">이전</span>
                )}
                <strong>{result.page} / {result.totalPages}</strong>
                {result.page < result.totalPages ? (
                  <Link
                    href={boardHref({
                      category: activeCategory,
                      unanswered,
                      best,
                      search,
                      page: result.page + 1,
                    })}
                  >
                    다음
                  </Link>
                ) : (
                  <span aria-disabled="true">다음</span>
                )}
              </nav>
            )}
          </section>

          {posts.length > 0 && (
            <Link className="board-compose-fab" href="/board/write" aria-label="게시글 쓰기">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 20h4l11-11-4-4L4 16v4Z" />
                <path d="m13.5 6.5 4 4" />
              </svg>
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
