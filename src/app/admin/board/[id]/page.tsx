import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BOARD_BEST_LIKE_THRESHOLD,
  boardCategoryLabel,
  isBoardCategory,
} from "@/lib/board";
import { boardReportReasonLabel } from "@/lib/board-reports";
import { AdminPageHeader, StatusBadge } from "../../admin-ui";
import { getBoardAdminAccess } from "../access";
import { BoardPostControls } from "../board-post-controls";
import { BoardReportControls } from "../board-report-controls";

export const metadata: Metadata = { title: "게시글 상세" };

interface BoardAdminPostDetail {
  id: string;
  author_id: string;
  display_name: string;
  author_visibility: "anonymous" | "profile";
  category: string;
  title: string;
  body: string;
  status: string;
  view_count: number | null;
  comment_count: number | null;
  like_count: number | null;
  created_at: string;
  updated_at: string;
}

interface BoardAdminAuthor {
  id: string;
  email: string | null;
  full_name: string | null;
  member_type: string | null;
  created_at: string;
}

interface BoardAdminComment {
  id: string;
  display_name: string;
  body: string;
  status: string;
  created_at: string;
}

interface BoardAdminImage {
  id: string;
  storage_path: string;
  sort_order: number;
}

interface BoardAdminReport {
  id: string;
  post_id: string;
  comment_id: string | null;
  reporter_id: string;
  reviewer_id: string | null;
  reason: string;
  details: string | null;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
  updated_at: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function dateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

function categoryLabel(value: string) {
  return isBoardCategory(value) ? boardCategoryLabel(value) : value;
}

function authorName(author: BoardAdminAuthor | null | undefined) {
  return (
    author?.full_name?.trim() ||
    author?.email?.split("@")[0] ||
    "탈퇴했거나 확인할 수 없는 사용자"
  );
}

export default async function AdminBoardPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const access = await getBoardAdminAccess();
  if (!access.ok) {
    return (
      <main className="admin-main shell">
        <AdminPageHeader
          eyebrow="COMMUNITY"
          title="게시글 상세"
          description="게시글 운영 권한을 확인합니다."
        />
        <section className="admin-list-panel admin-board-system-error">
          <strong>게시글을 확인할 수 없습니다.</strong>
          <p>{access.error}</p>
        </section>
      </main>
    );
  }

  const { admin } = access;
  const { data: postData, error: postError } = await admin
    .from("board_posts")
    .select(
      "id,author_id,display_name,author_visibility,category,title,body,status,view_count,comment_count,like_count,created_at,updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (postError) {
    return (
      <main className="admin-main shell">
        <AdminPageHeader
          eyebrow="COMMUNITY"
          title="게시글 상세"
          description="게시글 운영 데이터를 확인합니다."
        />
        <section className="admin-list-panel admin-board-system-error">
          <strong>게시글 데이터를 불러오지 못했습니다.</strong>
          <p>게시판 마이그레이션 적용 상태를 확인한 뒤 다시 시도해주세요.</p>
        </section>
      </main>
    );
  }
  if (!postData) notFound();

  const post = postData as BoardAdminPostDetail;
  const [authorResult, commentsResult, reportsResult, imagesResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id,email,full_name,member_type,created_at")
      .eq("id", post.author_id)
      .maybeSingle(),
    admin
      .from("board_comments")
      .select("id,display_name,body,status,created_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("board_reports")
      .select("id,post_id,comment_id,reporter_id,reviewer_id,reason,details,status,created_at,updated_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("board_post_images")
      .select("id,storage_path,sort_order")
      .eq("post_id", post.id)
      .order("sort_order", { ascending: true }),
  ]);
  const author = (authorResult.data as BoardAdminAuthor | null) ?? null;
  const comments = (commentsResult.data ?? []) as BoardAdminComment[];
  const images = ((imagesResult.data ?? []) as BoardAdminImage[]).map((image) => ({
    id: image.id,
    url: admin.storage.from("board-images").getPublicUrl(image.storage_path).data.publicUrl,
  }));
  let reportTargetComments = [...comments];
  const reports = ((reportsResult.data ?? []) as BoardAdminReport[]).sort((a, b) => {
    const statusRank = { pending: 0, resolved: 1, dismissed: 2 } as const;
    return statusRank[a.status] - statusRank[b.status]
      || Date.parse(b.created_at) - Date.parse(a.created_at);
  });
  const loadedCommentIds = new Set(comments.map((comment) => comment.id));
  const missingReportedCommentIds = [
    ...new Set(
      reports
        .map((report) => report.comment_id)
        .filter(
          (commentId): commentId is string =>
            Boolean(commentId) && !loadedCommentIds.has(commentId as string),
        ),
    ),
  ];
  if (missingReportedCommentIds.length) {
    const { data: missingCommentData } = await admin
      .from("board_comments")
      .select("id,display_name,body,status,created_at")
      .in("id", missingReportedCommentIds);
    reportTargetComments = [
      ...reportTargetComments,
      ...((missingCommentData ?? []) as BoardAdminComment[]),
    ];
  }
  const reportProfileIds = [
    ...new Set(
      reports
        .flatMap((report) => [report.reporter_id, report.reviewer_id])
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const { data: reportProfileData } = reportProfileIds.length
    ? await admin
        .from("profiles")
        .select("id,email,full_name,member_type,created_at")
        .in("id", reportProfileIds)
    : { data: [] };
  const reportProfiles = new Map(
    ((reportProfileData ?? []) as BoardAdminAuthor[]).map((profile) => [profile.id, profile]),
  );
  const commentsById = new Map(
    reportTargetComments.map((comment) => [comment.id, comment]),
  );
  const pendingReportCount = reports.filter((report) => report.status === "pending").length;
  const anonymous = post.author_visibility === "anonymous";

  return (
    <main className="admin-main shell admin-board-detail-page">
      <div className="admin-back-link">
        <Link href="/admin/board">← 게시글 목록</Link>
      </div>
      <AdminPageHeader
        eyebrow="COMMUNITY · POST"
        title="게시글 상세"
        description="내용과 실제 작성자를 확인하고 노출 상태를 관리합니다."
        publicHref={post.status === "published" ? `/board/${post.id}` : undefined}
      />

      <section className="admin-board-moderation-bar" aria-label="게시글 관리">
        <div>
          <span>현재 상태</span>
          <StatusBadge status={post.status} />
          <p>
            숨김 처리하면 일반 게시판과 상세 페이지에서 즉시 보이지 않습니다.
          </p>
        </div>
        <BoardPostControls
          id={post.id}
          title={post.title}
          status={post.status}
          redirectAfterDelete="/admin/board"
        />
      </section>

      <div className="admin-board-detail-layout">
        <article className="admin-board-detail-card admin-board-content-card">
          <header>
            <div>
              <span>{categoryLabel(post.category)}</span>
              {post.status === "published" &&
                (post.like_count ?? 0) >= BOARD_BEST_LIKE_THRESHOLD && (
                <span className="admin-board-best-badge">베스트</span>
              )}
            </div>
            <h2>{post.title}</h2>
            <p>
              {post.display_name} · {dateTime(post.created_at)}
            </p>
          </header>
          <div className="admin-board-post-body">{post.body}</div>
          {images.length > 0 && (
            <div className="admin-board-post-images" aria-label="게시글 첨부 이미지">
              {images.map((image, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image.id}
                  src={image.url}
                  alt={`게시글 첨부 이미지 ${index + 1}`}
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </article>

        <aside className="admin-board-detail-aside">
          <section className="admin-board-detail-card admin-board-author-card">
            <header>
              <span>운영자 전용</span>
              <h2>실제 작성자</h2>
            </header>
            {anonymous && (
              <p className="admin-board-privacy-note">
                공개 화면에는 익명으로 표시됩니다. 아래 정보는 신고 대응 등 운영 목적으로만 확인해주세요.
              </p>
            )}
            <strong>{authorName(author)}</strong>
            {author?.email ? (
              <a href={`mailto:${author.email}`}>{author.email}</a>
            ) : (
              <span className="admin-board-author-email">이메일 확인 불가</span>
            )}
            <Link href={`/admin/users/${post.author_id}`}>사용자 상세 보기 →</Link>
            <dl>
              <div>
                <dt>작성 방식</dt>
                <dd>{anonymous ? "익명" : "프로필 공개"}</dd>
              </div>
              <div>
                <dt>사용자 ID</dt>
                <dd className="admin-board-mono">{post.author_id}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-board-detail-card">
            <header><h2>게시글 정보</h2></header>
            <dl className="admin-board-facts">
              <div><dt>게시판</dt><dd>{categoryLabel(post.category)}</dd></div>
              <div><dt>조회</dt><dd>{Math.max(0, post.view_count ?? 0).toLocaleString("ko-KR")}</dd></div>
              <div><dt>좋아요</dt><dd>{Math.max(0, post.like_count ?? 0)}</dd></div>
              <div><dt>댓글</dt><dd>{Math.max(0, post.comment_count ?? 0)}</dd></div>
              <div><dt>작성</dt><dd>{dateTime(post.created_at)}</dd></div>
              <div><dt>수정</dt><dd>{dateTime(post.updated_at)}</dd></div>
              <div><dt>게시글 ID</dt><dd className="admin-board-mono">{post.id}</dd></div>
            </dl>
          </section>
        </aside>
      </div>

      <section className="admin-board-detail-card admin-board-reports-card" id="reports">
        <header>
          <div>
            <span>COMMUNITY SAFETY</span>
            <h2>신고 내역</h2>
            <p>신고만으로 자동 숨김되지 않습니다. 내용을 확인한 뒤 직접 처리해주세요.</p>
          </div>
          <strong>{pendingReportCount.toLocaleString("ko-KR")}건 대기</strong>
        </header>
        {reports.length ? (
          <ul>
            {reports.map((report) => {
              const reporter = reportProfiles.get(report.reporter_id);
              const reviewer = report.reviewer_id
                ? reportProfiles.get(report.reviewer_id)
                : undefined;
              const targetComment = report.comment_id
                ? commentsById.get(report.comment_id)
                : undefined;
              const statusLabel = report.status === "pending"
                ? "처리 대기"
                : report.status === "resolved"
                  ? "조치 완료"
                  : "기각";
              return (
                <li className={`admin-board-report-item ${report.status}`} key={report.id}>
                  <div className="admin-board-report-item-head">
                    <div>
                      <span>{report.comment_id ? "댓글 신고" : "게시글 신고"}</span>
                      <span className={`admin-board-report-status ${report.status}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <time dateTime={report.created_at}>{dateTime(report.created_at)}</time>
                  </div>
                  <h3>{boardReportReasonLabel(report.reason)}</h3>
                  <p>{report.details || "추가 설명이 없습니다."}</p>
                  {targetComment && (
                    <blockquote>{targetComment.body}</blockquote>
                  )}
                  <dl>
                    <div>
                      <dt>신고자</dt>
                      <dd>
                        {authorName(reporter)}
                        {reporter?.email ? ` · ${reporter.email}` : ""}
                      </dd>
                    </div>
                    {reviewer && (
                      <div>
                        <dt>처리자</dt>
                        <dd>{authorName(reviewer)} · {dateTime(report.updated_at)}</dd>
                      </div>
                    )}
                  </dl>
                  {report.status === "pending" && (
                    <BoardReportControls
                      reportId={report.id}
                      target={report.comment_id ? "comment" : "post"}
                      detail
                      redirectAfterDelete="/admin/board"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="admin-empty">접수된 신고가 없습니다.</p>
        )}
      </section>

      <section className="admin-board-detail-card admin-board-comments-card">
        <header>
          <h2>댓글</h2>
          <span>{Math.max(0, post.comment_count ?? comments.length).toLocaleString("ko-KR")}</span>
          {(post.comment_count ?? 0) > comments.length && <small>최신 100개 표시</small>}
        </header>
        {comments.length ? (
          <ul>
            {comments.map((comment) => (
              <li key={comment.id}>
                <div>
                  <strong>{comment.display_name}</strong>
                  <time dateTime={comment.created_at}>{dateTime(comment.created_at)}</time>
                  {comment.status !== "published" && <StatusBadge status={comment.status} />}
                </div>
                <p>{comment.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="admin-empty">댓글이 없습니다.</p>
        )}
      </section>
    </main>
  );
}
