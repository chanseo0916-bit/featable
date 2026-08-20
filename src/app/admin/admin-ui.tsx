import Link from "next/link";

export type PublishStatus = "draft" | "published" | "hidden";

export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { published: "공개", draft: "초안", hidden: "숨김" };
  return <span className={`admin-status admin-status-${status}`}>{labels[status] ?? status}</span>;
}

export function AdminPageHeader({ eyebrow, title, description, publicHref }: {
  eyebrow: string; title: string; description: string; publicHref?: string;
}) {
  return (
    <div className="admin-page-head">
      <div><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>
      {publicHref && <Link href={publicHref}>공개 페이지 보기 <span aria-hidden="true">↗</span></Link>}
    </div>
  );
}

export function formatAdminDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

export function toAdminDateTimeInput(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(value)).replace(" ", "T");
}

export const ADMIN_PAGE_SIZE = 12;

export interface AdminQuery {
  q: string;
  status: string;
  page: number;
}

export function parseAdminQuery(searchParams: Record<string, string | string[] | undefined>): AdminQuery {
  const rawPage = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const rawQuery = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const rawStatus = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;
  return {
    q: (rawQuery ?? "").trim().slice(0, 80),
    status: ["published", "draft", "hidden"].includes(rawStatus ?? "") ? rawStatus! : "all",
    page: Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1),
  };
}

export function AdminListTools({ query, placeholder = "이름으로 검색" }: { query: AdminQuery; placeholder?: string }) {
  return <form className="admin-list-tools" method="get">
    <label><span className="sr-only">검색</span><input name="q" defaultValue={query.q} placeholder={placeholder} /></label>
    <select name="status" defaultValue={query.status} aria-label="공개 상태">
      <option value="all">모든 상태</option><option value="published">공개</option><option value="draft">초안</option><option value="hidden">숨김</option>
    </select>
    <button type="submit">검색</button>
    {(query.q || query.status !== "all") && <Link href="?">초기화</Link>}
  </form>;
}

export function AdminPagination({ query, count }: { query: AdminQuery; count: number }) {
  const totalPages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));
  if (totalPages <= 1) return null;
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.status !== "all") params.set("status", query.status);
    params.set("page", String(page));
    return `?${params.toString()}`;
  };
  const start = Math.max(1, Math.min(query.page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
  return <nav className="admin-pagination" aria-label="페이지 이동">
    {query.page > 1 ? <Link href={href(query.page - 1)}>이전</Link> : <span>이전</span>}
    {pages.map((page) => <Link key={page} href={href(page)} className={page === query.page ? "active" : undefined}>{page}</Link>)}
    {query.page < totalPages ? <Link href={href(query.page + 1)}>다음</Link> : <span>다음</span>}
  </nav>;
}
