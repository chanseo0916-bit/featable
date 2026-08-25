import Link from "next/link";
import {
  BOARD_BEST_LIKE_THRESHOLD,
  BOARD_CATEGORIES,
  boardCategoryLabel,
  type BoardCategory,
  type BoardPostSummary,
} from "@/lib/board";
import styles from "@/components/board-split-panel.module.css";

function fullBoardHref({
  best = false,
  category,
}: {
  best?: boolean;
  category?: BoardCategory;
} = {}) {
  const params = new URLSearchParams();
  if (best) params.set("view", "best");
  if (category) params.set("category", category);
  const query = params.toString();
  return query ? `/board?${query}` : "/board";
}

function panelFeedHref({
  best = true,
  category,
}: {
  best?: boolean;
  category?: BoardCategory;
} = {}) {
  const params = new URLSearchParams();
  if (category) {
    params.set("category", category);
  } else if (!best) {
    params.set("view", "latest");
  }
  const query = params.toString();
  return query ? `/board/panel?${query}` : "/board/panel";
}

function relativeTimeLabel(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return "방금";
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}시간 전`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}일 전`;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

export function BoardSplitFeed({
  posts,
  best,
  activeCategory,
}: {
  posts: BoardPostSummary[];
  best: boolean;
  activeCategory?: BoardCategory;
}) {
  const fullBoardUrl = fullBoardHref({ best, category: activeCategory });

  return (
    <div className={styles.feed}>
      <nav className={styles.viewTabs} aria-label="게시판 보기">
        <Link
          className={best ? styles.active : ""}
          href={panelFeedHref()}
          replace
          scroll={false}
          aria-current={best ? "page" : undefined}
        >
          베스트
        </Link>
        <Link
          className={!best ? styles.active : ""}
          href={panelFeedHref({ best: false })}
          replace
          scroll={false}
          aria-current={!best ? "page" : undefined}
        >
          최신
        </Link>
      </nav>

      {!best && (
        <nav className={styles.categoryTabs} aria-label="게시판 카테고리">
          <Link
            className={!activeCategory ? styles.active : ""}
            href={panelFeedHref({ best: false })}
            replace
            scroll={false}
            aria-current={!activeCategory ? "page" : undefined}
          >
            전체
          </Link>
          {BOARD_CATEGORIES.map((category) => (
            <Link
              className={activeCategory === category.value ? styles.active : ""}
              href={panelFeedHref({ category: category.value })}
              replace
              scroll={false}
              aria-current={activeCategory === category.value ? "page" : undefined}
              key={category.value}
            >
              {category.label}
            </Link>
          ))}
        </nav>
      )}

      <section className={styles.listSection} aria-labelledby="board-split-feed-title">
        <h3 className="sr-only" id="board-split-feed-title">
          {best ? "베스트 게시글" : "최신 게시글"}
        </h3>

        {posts.length > 0 ? (
          <ul className={styles.postList}>
            {posts.slice(0, 8).map((post) => (
              <li key={post.id}>
                <Link className={styles.post} href={`/board/${post.id}`}>
                  <div className={styles.postTopline}>
                    <span>{boardCategoryLabel(post.category)}</span>
                    {post.likeCount >= BOARD_BEST_LIKE_THRESHOLD && <b>BEST</b>}
                    <time dateTime={post.createdAt}>{relativeTimeLabel(post.createdAt)}</time>
                  </div>
                  <h4>{post.title}</h4>
                  {post.excerpt && <p>{post.excerpt}</p>}
                  <div className={styles.postMeta}>
                    <span>{post.authorName}</span>
                    <span className={styles.metric}>
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M4 5h16v11H9l-5 4V5Z" />
                      </svg>
                      {post.commentCount}
                    </span>
                    <span className={styles.metric}>
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 6l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.3a5.5 5.5 0 0 0 0-7.8Z" />
                      </svg>
                      {post.likeCount}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>
            <strong>{best ? "아직 베스트 글이 없어요" : "아직 게시글이 없어요"}</strong>
            <p>{best ? "좋아요를 받은 글이 이곳에 모여요." : "첫 번째 이야기를 시작해보세요."}</p>
            <Link href="/board/write">첫 글 쓰기</Link>
          </div>
        )}

        {posts.length > 0 && (
          <Link className={styles.moreLink} href={fullBoardUrl}>
            이 조건으로 전체 글 보기
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m9 5 7 7-7 7" />
            </svg>
          </Link>
        )}
      </section>
    </div>
  );
}
