import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_PAGE_SIZE, AdminPageHeader, formatAdminDate } from "../admin-ui";
import { MEMBER_TYPES } from "@/lib/auth";

export const metadata: Metadata = { title: "사용자 관리" };

export const memberLabels: Record<string, string> = {
  founder: "창업가·대표",
  team: "팀 멤버",
  explorer: "예비 창업가",
  partner: "파트너",
  unknown: "역할 미설정",
};

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  member_type: string | null;
  onboarding_completed_at: string | null;
  marketing_agreed_at: string | null;
  created_at: string;
}

interface UsersQuery {
  q: string;
  role: string;
  page: number;
}

function parseUsersQuery(searchParams: Record<string, string | string[] | undefined>): UsersQuery {
  const pick = (key: string) => {
    const raw = searchParams[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const rawRole = pick("role") ?? "";
  return {
    q: (pick("q") ?? "").trim().slice(0, 80),
    role: [...MEMBER_TYPES, "unknown", "admin"].includes(rawRole) ? rawRole : "all",
    page: Math.max(1, Number.parseInt(pick("page") ?? "1", 10) || 1),
  };
}

function pageHref(query: UsersQuery, page: number) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.role !== "all") params.set("role", query.role);
  params.set("page", String(page));
  return `?${params.toString()}`;
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const query = parseUsersQuery(await searchParams);

  let request = supabase
    .from("profiles")
    .select("id,email,full_name,role,member_type,onboarding_completed_at,marketing_agreed_at,created_at", { count: "exact" });

  if (query.q) {
    const safe = query.q.replace(/[%_,]/g, "");
    if (safe) request = request.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }
  if (query.role === "admin") request = request.eq("role", "admin");
  else if (query.role === "unknown") request = request.is("member_type", null);
  else if (query.role !== "all") request = request.eq("member_type", query.role);

  const from = (query.page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await request
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  const rows = (data ?? []) as UserRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  return <main className="admin-main shell">
    <AdminPageHeader eyebrow="MEMBERS" title="사용자 관리" description="가입한 계정을 검색하고 역할·온보딩 상태와 활동 내역을 확인합니다." />

    <section className="admin-list-panel">
      <form className="admin-list-tools" method="get">
        <label><span className="sr-only">검색</span><input name="q" defaultValue={query.q} placeholder="이름 또는 이메일 검색" /></label>
        <select name="role" defaultValue={query.role} aria-label="역할">
          <option value="all">모든 역할</option>
          {MEMBER_TYPES.map((type) => <option key={type} value={type}>{memberLabels[type]}</option>)}
          <option value="unknown">역할 미설정</option>
          <option value="admin">관리자</option>
        </select>
        <button type="submit">검색</button>
        {(query.q || query.role !== "all") && <Link href="?">초기화</Link>}
      </form>

      <div className="admin-list-head"><h2>전체 사용자 <span>{total}</span></h2></div>

      <div className="admin-table-wrap"><table className="admin-table"><thead><tr>
        <th>사용자</th><th>역할</th><th>온보딩</th><th>가입일</th><th>관리</th>
      </tr></thead><tbody>
        {rows.map((row) => <tr key={row.id}>
          <td>
            <Link href={`/admin/users/${row.id}`}>{row.full_name?.trim() || "이름 미설정"}</Link>
            <p>{row.email || "이메일 없음"}</p>
          </td>
          <td>
            {memberLabels[row.member_type || "unknown"]}
            {row.role === "admin" && <span className="admin-status admin-status-published" style={{ marginLeft: 6 }}>관리자</span>}
          </td>
          <td>{row.onboarding_completed_at
            ? <span className="admin-status admin-status-published">완료</span>
            : <span className="admin-status admin-status-draft">미완료</span>}</td>
          <td>{formatAdminDate(row.created_at)}</td>
          <td><div className="admin-row-actions"><Link className="admin-row-link" href={`/admin/users/${row.id}`}>상세보기</Link></div></td>
        </tr>)}
        {!rows.length && <tr><td colSpan={5} className="admin-empty">조건에 맞는 사용자가 없습니다.</td></tr>}
      </tbody></table></div>

      {totalPages > 1 && <nav className="admin-pagination" aria-label="페이지 이동">
        {query.page > 1 ? <Link href={pageHref(query, query.page - 1)}>이전</Link> : <span>이전</span>}
        {Array.from({ length: Math.min(5, totalPages) }, (_, index) => Math.max(1, Math.min(query.page - 2, totalPages - 4)) + index)
          .map((page) => <Link key={page} href={pageHref(query, page)} className={page === query.page ? "active" : undefined}>{page}</Link>)}
        {query.page < totalPages ? <Link href={pageHref(query, query.page + 1)}>다음</Link> : <span>다음</span>}
      </nav>}
    </section>
  </main>;
}
