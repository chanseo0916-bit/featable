import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createBoardComment, setBoardPostLike } from "@/app/board/actions";
import {
  BoardReportButton,
  BoardReportProvider,
} from "@/components/board-report-button";
import { BoardOwnerMenu } from "@/components/board-owner-menu";
import { BoardViewTracker } from "@/components/board-view-tracker";
import { Header } from "@/components/site-shell";
import {
  BOARD_AUTHOR_VISIBILITIES,
  boardCategoryTitle,
  getBoardComments,
  getBoardPost,
} from "@/lib/board";
import { createClient } from "@/lib/supabase/server";
import { BoardLikeSubmit } from "./board-like-submit";
import "@/styles/board.css";
import { formatDateKst, formatRelativeKst } from "@/lib/datetime";

export const metadata: Metadata = {
  title: "게시판 글",
  robots: { index: false, follow: true },
};

type BoardDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string | string[];
    likeError?: string | string[];
    notice?: string | string[];
  }>;
};

function ownershipFromPayload(value: unknown) {
  if (!value || typeof value !== "object") {
    return { ownsPost: false, commentIds: new Set<string>() };
  }

  const payload = value as Record<string, unknown>;
  const commentIds = Array.isArray(payload.comment_ids)
    ? payload.comment_ids.filter((id): id is string => typeof id === "string")
    : [];
  return {
    ownsPost: payload.owns_post === true,
    commentIds: new Set(commentIds),
  };
}

export default async function BoardDetailPage({
  params,
  searchParams,
}: BoardDetailPageProps) {
  const { id } = await params;
  const [post, comments, supabase, query] = await Promise.all([
    getBoardPost(id),
    getBoardComments(id),
    createClient(),
    searchParams,
  ]);

  if (!post) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [likedResult, ownershipResult] = user
    ? await Promise.all([
        supabase
          .from("board_post_likes")
          .select("post_id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.rpc("get_my_board_ownership", { p_post_id: post.id }),
      ])
    : [{ data: null }, { data: null }];
  const likedRow = likedResult.data;
  const liked = Boolean(likedRow);
  const ownership = ownershipFromPayload(ownershipResult.data);
  const error =
    typeof query.error === "string" ? query.error.slice(0, 200) : undefined;
  const likeError =
    typeof query.likeError === "string" ? query.likeError.slice(0, 200) : undefined;
  const notice = query.notice === "comment-deleted"
    ? "댓글을 삭제했습니다."
    : undefined;
  const loginHref = `/login?next=${encodeURIComponent(`/board/${post.id}#comments`)}`;
  const likeLoginHref = `/login?next=${encodeURIComponent(`/board/${post.id}#board-post-reactions`)}`;
  const reportLoginHref = `/login?next=${encodeURIComponent(`/board/${post.id}`)}`;

  return (
    <>
      <BoardViewTracker postId={post.id} />
      <Header showChannels={false} />
      <BoardReportProvider>
        <main className="board-page-shell">
          <div className="board-page board-detail-page">
          <Link className="board-back-link" href="/board">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m15 5-7 7 7 7" />
            </svg>
            <span>게시판</span>
          </Link>

          <article className="board-post-detail">
            <header>
              <div className="board-detail-topline">
                <span className="board-detail-category">
                  {boardCategoryTitle(post.category)}
                </span>
                <div className="board-detail-actions">
                  {ownership.ownsPost ? (
                    <BoardOwnerMenu
                      kind="post"
                      postId={post.id}
                      editHref={`/board/${post.id}/edit`}
                    />
                  ) : (
                    <BoardReportButton
                      postId={post.id}
                      loginHref={user ? undefined : reportLoginHref}
                      compact
                    />
                  )}
                </div>
              </div>
              <h1>{post.title}</h1>
              <div className="board-author-row">
                {post.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.authorAvatarUrl} alt="" />
                ) : (
                  <span aria-hidden="true">{post.authorName.slice(0, 1)}</span>
                )}
                <div>
                  <strong>{post.authorName}</strong>
                  <span className="board-detail-meta">
                    <time dateTime={post.createdAt}>{formatDateKst(post.createdAt)}</time>
                    <span aria-hidden="true">·</span>
                    <span>조회 {post.viewCount.toLocaleString("ko-KR")}</span>
                  </span>
                </div>
              </div>
            </header>
            <div className="board-post-body">{post.body}</div>
            {post.images.length > 0 && (
              <div className="board-post-images" aria-label="게시글 첨부 이미지">
                {post.images.map((image, index) => (
                  <figure key={image.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={`게시글 첨부 이미지 ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                ))}
              </div>
            )}
            <footer className="board-post-reactions" id="board-post-reactions">
              {user ? (
                <form action={setBoardPostLike}>
                  <input type="hidden" name="postId" value={post.id} />
                  <input type="hidden" name="intent" value={liked ? "unlike" : "like"} />
                  <BoardLikeSubmit liked={liked} count={post.likeCount} />
                </form>
              ) : (
                <Link className="board-like-button" href={likeLoginHref}>
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 6l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.3a5.5 5.5 0 0 0 0-7.8Z" />
                  </svg>
                  <span>좋아요</span>
                  <strong>{post.likeCount}</strong>
                </Link>
              )}
              {likeError && <p role="alert">{likeError}</p>}
            </footer>
          </article>

          <section className="board-comments" id="comments" aria-labelledby="board-comments-title">
            <div className="board-comments-heading">
              <h2 id="board-comments-title">댓글</h2>
              <span>{post.commentCount}</span>
            </div>

            {notice && <p className="board-action-notice" role="status">{notice}</p>}

            {user ? (
              <form className="board-comment-form" action={createBoardComment}>
                <input type="hidden" name="postId" value={post.id} />
                <label className="sr-only" htmlFor="board-comment-body">댓글 내용</label>
                <textarea
                  id="board-comment-body"
                  name="body"
                  required
                  maxLength={1000}
                  placeholder="댓글을 남겨보세요."
                />
                {error && <p role="alert">{error}</p>}
                <div>
                  <fieldset className="board-comment-identity">
                    <legend className="sr-only">댓글 작성자 표시</legend>
                    {BOARD_AUTHOR_VISIBILITIES.map((visibility) => (
                      <label key={visibility.value}>
                        <input
                          type="radio"
                          name="authorVisibility"
                          value={visibility.value}
                          defaultChecked={visibility.value === "anonymous"}
                          required
                        />
                        <span>{visibility.label}</span>
                      </label>
                    ))}
                  </fieldset>
                  <button className="button button-small" type="submit">등록</button>
                </div>
              </form>
            ) : (
              <div className="board-comment-login">
                <p>로그인하고 댓글을 남겨보세요.</p>
                <Link className="button button-small button-secondary" href={loginHref}>
                  로그인
                </Link>
              </div>
            )}

            {comments.length > 0 ? (
              <ul className="board-comment-list">
                {comments.map((comment) => (
                  <li id={`comment-${comment.id}`} key={comment.id}>
                    {comment.authorAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={comment.authorAvatarUrl} alt="" />
                    ) : (
                      <span aria-hidden="true">{comment.authorName.slice(0, 1)}</span>
                    )}
                    <div>
                      <header>
                        <strong>{comment.authorName}</strong>
                        <time dateTime={comment.createdAt}>{formatRelativeKst(comment.createdAt)}</time>
                        <div className="board-comment-actions">
                          {ownership.commentIds.has(comment.id) ? (
                            <BoardOwnerMenu
                              kind="comment"
                              postId={post.id}
                              commentId={comment.id}
                            />
                          ) : (
                            <BoardReportButton
                              postId={post.id}
                              commentId={comment.id}
                              loginHref={user ? undefined : reportLoginHref}
                              compact
                            />
                          )}
                        </div>
                      </header>
                      <p>{comment.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="board-comments-empty">아직 댓글이 없어요.</p>
            )}
          </section>
          </div>
        </main>
      </BoardReportProvider>
    </>
  );
}
