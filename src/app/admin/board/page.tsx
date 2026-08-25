import type { Metadata } from "next";
import Link from "next/link";
import {
  BOARD_BEST_LIKE_THRESHOLD,
  BOARD_CATEGORIES,
  boardCategoryLabel,
  isBoardCategory,
  type BoardCategory,
} from "@/lib/board";
import {
  ADMIN_PAGE_SIZE,
  AdminPageHeader,
  formatAdminDate,
  StatusBadge,
} from "../admin-ui";
import { getBoardAdminAccess } from "./access";
import { BoardPostControls } from "./board-post-controls";

export const metadata: Metadata = { title: "게시글 관리" };

type BoardAdminStatus = "all" | "published" | "draft" | "hidden";
type BoardAdminSort = "latest" | "views" | "likes" | "comments";
type BoardAdminReportFilter = "all" | "pending";

interface BoardAdminQuery {
  q: string;
  status: BoardAdminStatus;
  category: "all" | BoardCategory;
  sort: BoardAdminSort;
  reports: BoardAdminReportFilter;
  page: number;
}

interface BoardAdminPostRow {
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

interface BoardAdminAuthorRow {
  id: string;
  email: string | null;
  full_name: string | null;
  member_type: string | null;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseBoardAdminQuery(
  searchParams: Record<string, string | string[] | undefined>,
): BoardAdminQuery {
  const rawStatus = firstParam(searchParams.status);
  const rawCategory = firstParam(searchParams.category);
  const rawSort = firstParam(searchParams.sort);
  const rawReports = firstParam(searchParams.reports);
  const rawPage = firstParam(searchParams.page);
  const status = ["published", "draft", "hidden"].includes(rawStatus ?? "")
    ? (rawStatus as BoardAdminStatus)
    : "all";
  const category = isBoardCategory(rawCategory) ? rawCategory : "all";

  return {
    q: (firstParam(searchParams.q) ?? "").trim().slice(0, 80),
    status,
    category,
    sort: ["views", "likes", "comments"].includes(rawSort ?? "")
      ? (rawSort as BoardAdminSort)
      : "latest",
    reports: rawReports === "pending" ? "pending" : "all",
    page: Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1),
  };
}

function safeSearchTerm(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pageHref(query: BoardAdminQuery, page: number) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status !== "all") params.set("status", query.status);
  if (query.category !== "all") params.set("category", query.category);
  if (query.sort !== "latest") params.set("sort", query.sort);
  if (query.reports !== "all") params.set("reports", query.reports);
  params.set("page", String(page));
  return `?${params.toString()}`;
}

function excerpt(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 90 ? `${normalized.slice(0, 90)}…` : normalized;
}

function categoryLabel(value: string) {
  return isBoardCategory(value) ? boardCategoryLabel(value) : value;
}

function authorName(author: BoardAdminAuthorRow | undefined) {
  return (
    author?.full_name?.trim() ||
    author?.email?.split("@")[0] ||
    "탈퇴했거나 확인할 수 없는 사용자"
  );
}

export default async function AdminBoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseBoardAdminQuery(await searchParams);
  const access = await getBoardAdminAccess();

  if (!access.ok) {
    return (
      <main className="admin-main shell">
        <AdminPageHeader
          eyebrow="COMMUNITY"
          title="게시글 관리"
          description="게시판 운영에 필요한 서버 권한을 확인합니다."
        />
        <section className="admin-list-panel admin-board-system-error">
          <strong>게시글 관리 화면을 열 수 없습니다.</strong>
          <p>{access.error}</p>
        </section>
      </main>
    );
  }

  const { admin } = access;
  const from = (query.page - 1) * ADMIN_PAGE_SIZE;
  const searchTerm = safeSearchTerm(query.q);
  const pendingReportsResult = await admin
    .from("board_reports")
    .select("post_id", { count: "exact" })
    .eq("status", "pending")
    .limit(10000);
  const pendingReportCounts = new Map<string, number>();
  for (const report of pendingReportsResult.data ?? []) {
    if (typeof report.post_id !== "string") continue;
    pendingReportCounts.set(
      report.post_id,
      (pendingReportCounts.get(report.post_id) ?? 0) + 1,
    );
  }
  const reportedPostIds = [...pendingReportCounts.keys()];
  let postsRequest = admin
    .from("board_posts")
    .select(
      "id,author_id,display_name,author_visibility,category,title,body,status,view_count,comment_count,like_count,created_at,updated_at",
      { count: "exact" },
    );

  if (searchTerm) {
    postsRequest = postsRequest.or(
      `title.ilike.%${searchTerm}%,body.ilike.%${searchTerm}%`,
    );
  }
  if (query.status !== "all") postsRequest = postsRequest.eq("status", query.status);
  if (query.category !== "all") postsRequest = postsRequest.eq("category", query.category);
  if (query.reports === "pending") {
    postsRequest = reportedPostIds.length
      ? postsRequest.in("id", reportedPostIds)
      : postsRequest.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const sortColumns: Record<BoardAdminSort, string> = {
    latest: "created_at",
    views: "view_count",
    likes: "like_count",
    comments: "comment_count",
  };
  let orderedPostsRequest = postsRequest.order(sortColumns[query.sort], {
    ascending: false,
  });
  if (query.sort !== "latest") {
    orderedPostsRequest = orderedPostsRequest.order("created_at", { ascending: false });
  }

  const [postsResult, totalResult, bestResult, hiddenResult] = await Promise.all([
    orderedPostsRequest.range(from, from + ADMIN_PAGE_SIZE - 1),
    admin.from("board_posts").select("id", { count: "exact", head: true }),
    admin
      .from("board_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("like_count", BOARD_BEST_LIKE_THRESHOLD),
    admin
      .from("board_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "hidden"),
  ]);

  if (postsResult.error) {
    return (
      <main className="admin-main shell">
        <AdminPageHeader
          eyebrow="COMMUNITY"
          title="게시글 관리"
          description="게시판 글을 검토하고 공개 상태를 관리합니다."
          publicHref="/board"
        />
        <section className="admin-list-panel admin-board-system-error">
          <strong>게시판 데이터베이스 준비가 필요합니다.</strong>
          <p>게시판 마이그레이션 적용 상태를 확인한 뒤 다시 시도해주세요.</p>
        </section>
      </main>
    );
  }

  const rows = (postsResult.data ?? []) as BoardAdminPostRow[];
  const authorIds = [...new Set(rows.map((row) => row.author_id).filter(Boolean))];
  const { data: authorData } = authorIds.length
    ? await admin
        .from("profiles")
        .select("id,email,full_name,member_type")
        .in("id", authorIds)
    : { data: [] };
  const authors = new Map(
    ((authorData ?? []) as BoardAdminAuthorRow[]).map((author) => [author.id, author]),
  );
  const filteredCount = postsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredCount / ADMIN_PAGE_SIZE));
  const pageStart = Math.max(1, Math.min(query.page - 2, totalPages - 4));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => pageStart + index,
  );

  return (
    <main className="admin-main shell admin-board-page">
      <AdminPageHeader
        eyebrow="COMMUNITY"
        title="게시글 관리"
        description="게시글을 검색하고 상세 내용을 확인한 뒤 공개·숨김 또는 삭제 처리합니다."
        publicHref="/board"
      />

      <section className="admin-board-summary" aria-label="게시판 현황">
        <article>
          <span>전체 게시글</span>
          <strong>{(totalResult.count ?? 0).toLocaleString("ko-KR")}</strong>
        </article>
        <article>
          <span>베스트 게시글</span>
          <strong>{(bestResult.count ?? 0).toLocaleString("ko-KR")}</strong>
          <small>좋아요 {BOARD_BEST_LIKE_THRESHOLD}개 이상</small>
        </article>
        <article>
          <span>숨김 처리</span>
          <strong>{(hiddenResult.count ?? 0).toLocaleString("ko-KR")}</strong>
        </article>
        <article>
          <span>처리 대기 신고</span>
          <strong>{(pendingReportsResult.count ?? 0).toLocaleString("ko-KR")}</strong>
        </article>
      </section>

      <section className="admin-list-panel">
        <form className="admin-list-tools admin-board-tools" method="get">
          <label>
            <span className="sr-only">게시글 검색</span>
            <input
              name="q"
              defaultValue={query.q}
              placeholder="제목 또는 본문 검색"
            />
          </label>
          <select name="category" defaultValue={query.category} aria-label="게시판">
            <option value="all">모든 게시판</option>
            {BOARD_CATEGORIES.map((category) => (
              <option value={category.value} key={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={query.status} aria-label="공개 상태">
            <option value="all">모든 상태</option>
            <option value="published">공개</option>
            <option value="draft">초안</option>
            <option value="hidden">숨김</option>
          </select>
          <select name="sort" defaultValue={query.sort} aria-label="정렬">
            <option value="latest">최신순</option>
            <option value="views">조회순</option>
            <option value="likes">좋아요순</option>
            <option value="comments">댓글순</option>
          </select>
          <select name="reports" defaultValue={query.reports} aria-label="신고 상태">
            <option value="all">모든 신고 상태</option>
            <option value="pending">신고 대기만</option>
          </select>
          <button type="submit">검색</button>
          {(query.q ||
            query.status !== "all" ||
            query.category !== "all" ||
            query.sort !== "latest" ||
            query.reports !== "all") && (
            <Link href="?">초기화</Link>
          )}
        </form>

        <div className="admin-list-head">
          <h2>
            검색 결과 <span>{filteredCount.toLocaleString("ko-KR")}</span>
          </h2>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table admin-board-table">
            <thead>
              <tr>
                <th>게시글</th>
                <th>게시판</th>
                <th>실제 작성자</th>
                <th>반응</th>
                <th>상태</th>
                <th>작성일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const author = authors.get(row.author_id);
                const views = Math.max(0, row.view_count ?? 0);
                const likes = Math.max(0, row.like_count ?? 0);
                const comments = Math.max(0, row.comment_count ?? 0);
                const pendingReports = pendingReportCounts.get(row.id) ?? 0;
                return (
                  <tr key={row.id}>
                    <td className="admin-board-post-cell">
                      <Link href={`/admin/board/${row.id}`}>{row.title}</Link>
                      <p>{excerpt(row.body) || "본문 없음"}</p>
                      {row.status === "published" && likes >= BOARD_BEST_LIKE_THRESHOLD && (
                        <span className="admin-board-best-badge">베스트</span>
                      )}
                    </td>
                    <td>{categoryLabel(row.category)}</td>
                    <td className="admin-board-author-cell">
                      <Link href={`/admin/users/${row.author_id}`}>
                        {authorName(author)}
                      </Link>
                      <p>{author?.email || "이메일 확인 불가"}</p>
                      <span>
                        {row.author_visibility === "anonymous"
                          ? "익명으로 공개"
                          : "프로필로 공개"}
                      </span>
                    </td>
                    <td>
                      <span className="admin-board-reaction">조회 {views.toLocaleString("ko-KR")}</span>
                      <span className="admin-board-reaction">좋아요 {likes.toLocaleString("ko-KR")}</span>
                      <span className="admin-board-reaction">댓글 {comments.toLocaleString("ko-KR")}</span>
                      {pendingReports > 0 && (
                        <span className="admin-board-report-badge">
                          신고 {pendingReports.toLocaleString("ko-KR")}
                        </span>
                      )}
                    </td>
                    <td><StatusBadge status={row.status} /></td>
                    <td>{formatAdminDate(row.created_at)}</td>
                    <td>
                      <div className="admin-row-actions admin-board-row-actions">
                        <Link className="admin-row-link" href={`/admin/board/${row.id}`}>
                          상세
                        </Link>
                        <BoardPostControls
                          id={row.id}
                          title={row.title}
                          status={row.status}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="admin-empty">
                    조건에 맞는 게시글이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <nav className="admin-pagination" aria-label="페이지 이동">
            {query.page > 1 ? (
              <Link href={pageHref(query, query.page - 1)}>이전</Link>
            ) : (
              <span>이전</span>
            )}
            {pages.map((page) => (
              <Link
                href={pageHref(query, page)}
                className={page === query.page ? "active" : undefined}
                key={page}
              >
                {page}
              </Link>
            ))}
            {query.page < totalPages ? (
              <Link href={pageHref(query, query.page + 1)}>다음</Link>
            ) : (
              <span>다음</span>
            )}
          </nav>
        )}
      </section>
    </main>
  );
}
