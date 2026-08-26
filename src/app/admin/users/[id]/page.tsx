import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, formatAdminDate, StatusBadge } from "../../admin-ui";
import { memberLabels } from "../member-labels";
import { FounderNumberEditor } from "../founder-number-editor";

export const metadata: Metadata = { title: "사용자 상세" };

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  member_type: string | null;
  terms_agreed_at: string | null;
  privacy_agreed_at: string | null;
  marketing_agreed_at: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
}

interface FounderRow { id: string; slug: string; name: string; role_title: string | null; headline: string | null; founder_number: number | null; created_at: string }
interface BrandRow { id: string; slug: string; name: string; status: string; created_at: string }
interface ProductRow { id: string; slug: string; name: string; status: string; brand_id: string; view_count: number | null }
interface MembershipRow { member_role: string; joined_at: string; brand: { slug: string; name: string } | null }
interface SavedRow { item_type: string; item_slug: string; created_at: string }
interface CommentRow { id: string; body: string; created_at: string }
interface RegistrationRow { status: string; applied_at: string; event: { slug: string; name: string } | null }
interface SubmissionRow { id: string; submission_type: string; status: string; title: string; submitted_at: string | null }

const dateTime = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul", hour12: false }).format(new Date(value));
const savedTypeLabel: Record<string, string> = { product: "프로덕트", feature: "스토리", event: "행사", support: "지원사업" };
const submissionTypeLabel: Record<string, string> = { event: "행사", support: "지원사업", community: "커뮤니티" };
const registrationLabel: Record<string, string> = {
  verification_pending: "인증 대기", pending: "승인 대기", confirmed: "확정",
  waitlisted: "대기자", rejected: "거절", cancelled: "취소",
};
const submissionStatusLabel: Record<string, string> = {
  draft: "작성 중", submitted: "검수 대기", in_review: "검수 중", approved: "승인", rejected: "보완 필요",
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,member_type,terms_agreed_at,privacy_agreed_at,marketing_agreed_at,onboarding_completed_at,created_at")
    .eq("id", id)
    .maybeSingle();
  if (!profileData) notFound();
  const profile = profileData as ProfileRow;

  const { data: founderData } = await supabase
    .from("founders")
    .select("id,slug,name,role_title,headline,founder_number,created_at")
    .eq("user_id", id)
    .maybeSingle();
  const founder = founderData as FounderRow | null;

  // 소유 브랜드는 파운더 프로필을 통해서만 연결된다.
  let brands: BrandRow[] = [];
  let products: ProductRow[] = [];
  if (founder) {
    const { data: brandRows } = await supabase
      .from("brands")
      .select("id,slug,name,status,created_at")
      .eq("founder_id", founder.id)
      .order("created_at", { ascending: false });
    brands = (brandRows ?? []) as BrandRow[];
    if (brands.length) {
      const { data: productRows } = await supabase
        .from("products")
        .select("id,slug,name,status,brand_id,view_count")
        .in("brand_id", brands.map((brand) => brand.id));
      products = (productRows ?? []) as ProductRow[];
    }
  }

  const [{ data: membershipRows }, { data: savedRows }, { data: commentRows }, { data: registrationRows }, { data: submissionRows }] = await Promise.all([
    supabase.from("brand_members").select("member_role,joined_at,brand:brands(slug,name)").eq("user_id", id),
    supabase.from("saved_items").select("item_type,item_slug,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("comments").select("id,body,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("event_registrations").select("status,applied_at,event:events(slug,name)").eq("user_id", id).order("applied_at", { ascending: false }).limit(20),
    supabase.from("partner_submissions").select("id,submission_type,status,title,submitted_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  const memberships = (membershipRows ?? []) as unknown as MembershipRow[];
  const saved = (savedRows ?? []) as SavedRow[];
  const comments = (commentRows ?? []) as CommentRow[];
  const registrations = (registrationRows ?? []) as unknown as RegistrationRow[];
  const submissions = (submissionRows ?? []) as SubmissionRow[];
  const totalViews = products.reduce((sum, product) => sum + (product.view_count ?? 0), 0);
  const displayName = profile.full_name?.trim() || "이름 미설정";

  return <main className="admin-main shell">
    <AdminPageHeader
      eyebrow="MEMBER DETAIL"
      title={displayName}
      description={`${profile.email || "이메일 없음"} · ${memberLabels[profile.member_type || "unknown"]}${profile.role === "admin" ? " · 관리자" : ""}`}
      publicHref={founder ? `/founders/${founder.slug}` : undefined}
    />

    <p className="admin-back-link"><Link href="/admin/users">← 사용자 목록</Link></p>

    <section className="admin-growth-metrics" aria-label="사용자 활동 요약">
      <article className="primary"><span>보유 브랜드</span><strong>{brands.length}<em>개</em></strong><p>프로덕트 {products.length}개</p></article>
      <article><span>누적 조회수</span><strong>{totalViews.toLocaleString("ko-KR")}</strong><p>보유 프로덕트 합계</p></article>
      <article><span>저장·응원</span><strong>{saved.length}<em>건</em></strong><p>최근 20건 기준</p></article>
      <article><span>가입일</span><strong>{formatAdminDate(profile.created_at)}</strong><p>{profile.onboarding_completed_at ? "온보딩 완료" : "온보딩 미완료"}</p></article>
    </section>

    <section className="admin-list-panel">
      <div className="admin-list-head"><h2>계정 정보</h2></div>
      <dl className="admin-detail-grid">
        <div><dt>이름</dt><dd>{displayName}</dd></div>
        <div><dt>이메일</dt><dd>{profile.email || "-"}</dd></div>
        <div><dt>역할</dt><dd>{memberLabels[profile.member_type || "unknown"]}</dd></div>
        <div><dt>권한</dt><dd>{profile.role === "admin" ? "관리자" : "일반"}</dd></div>
        <div><dt>가입일</dt><dd>{dateTime(profile.created_at)}</dd></div>
        <div><dt>온보딩</dt><dd>{profile.onboarding_completed_at ? dateTime(profile.onboarding_completed_at) : "미완료"}</dd></div>
        <div><dt>약관 동의</dt><dd>{profile.terms_agreed_at ? dateTime(profile.terms_agreed_at) : "-"}</dd></div>
        <div><dt>개인정보 동의</dt><dd>{profile.privacy_agreed_at ? dateTime(profile.privacy_agreed_at) : "-"}</dd></div>
        <div><dt>마케팅 수신</dt><dd>{profile.marketing_agreed_at ? `동의 · ${dateTime(profile.marketing_agreed_at)}` : "미동의"}</dd></div>
        <div><dt>사용자 ID</dt><dd className="admin-detail-mono">{profile.id}</dd></div>
      </dl>
    </section>

    <section className="admin-list-panel">
      <div className="admin-list-head"><h2>Founder 프로필</h2></div>
      {founder ? <dl className="admin-detail-grid">
        <div><dt>Founder 번호</dt><dd>{founder.founder_number ?? "-"}<FounderNumberEditor userId={id} initialValue={founder.founder_number} /></dd></div>
        <div><dt>공개 이름</dt><dd>{founder.name}</dd></div>
        <div><dt>역할</dt><dd>{founder.role_title || "-"}</dd></div>
        <div><dt>한 줄 소개</dt><dd>{founder.headline || "-"}</dd></div>
        <div><dt>공개 주소</dt><dd><Link href={`/founders/${founder.slug}`}>/founders/{founder.slug}</Link></dd></div>
        <div><dt>생성일</dt><dd>{dateTime(founder.created_at)}</dd></div>
      </dl> : <p className="admin-empty">아직 Founder 프로필을 만들지 않았습니다.</p>}
    </section>

    <section className="admin-list-panel">
      <div className="admin-list-head"><h2>보유 브랜드 <span>{brands.length}</span></h2></div>
      {brands.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr>
        <th>브랜드</th><th>상태</th><th>프로덕트</th><th>등록일</th>
      </tr></thead><tbody>
        {brands.map((brand) => {
          const brandProducts = products.filter((product) => product.brand_id === brand.id);
          return <tr key={brand.id}>
            <td><Link href={`/brands/${brand.slug}`}>{brand.name}</Link></td>
            <td><StatusBadge status={brand.status} /></td>
            <td>{brandProducts.length ? brandProducts.map((product) => product.name).join(", ") : "등록 전"}</td>
            <td>{formatAdminDate(brand.created_at)}</td>
          </tr>;
        })}
      </tbody></table></div> : <p className="admin-empty">보유한 브랜드가 없습니다.</p>}
    </section>

    {memberships.length > 0 && <section className="admin-list-panel">
      <div className="admin-list-head"><h2>참여 중인 팀 <span>{memberships.length}</span></h2></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr>
        <th>브랜드</th><th>권한</th><th>참여일</th>
      </tr></thead><tbody>
        {memberships.map((membership, index) => <tr key={`${membership.brand?.slug ?? index}`}>
          <td>{membership.brand ? <Link href={`/brands/${membership.brand.slug}`}>{membership.brand.name}</Link> : "-"}</td>
          <td>{membership.member_role === "editor" ? "편집" : "보기"}</td>
          <td>{formatAdminDate(membership.joined_at)}</td>
        </tr>)}
      </tbody></table></div>
    </section>}

    {submissions.length > 0 && <section className="admin-list-panel">
      <div className="admin-list-head"><h2>파트너 제안 <span>{submissions.length}</span></h2></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr>
        <th>제안</th><th>유형</th><th>상태</th><th>제출일</th>
      </tr></thead><tbody>
        {submissions.map((submission) => <tr key={submission.id}>
          <td>{submission.title || "제목 없는 제안"}</td>
          <td>{submissionTypeLabel[submission.submission_type] ?? submission.submission_type}</td>
          <td>{submissionStatusLabel[submission.status] ?? submission.status}</td>
          <td>{submission.submitted_at ? formatAdminDate(submission.submitted_at) : "-"}</td>
        </tr>)}
      </tbody></table></div>
    </section>}

    {registrations.length > 0 && <section className="admin-list-panel">
      <div className="admin-list-head"><h2>행사 신청 <span>{registrations.length}</span></h2></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr>
        <th>행사</th><th>상태</th><th>신청일</th>
      </tr></thead><tbody>
        {registrations.map((registration, index) => <tr key={`${registration.event?.slug ?? index}`}>
          <td>{registration.event ? <Link href={`/events/${registration.event.slug}`}>{registration.event.name}</Link> : "-"}</td>
          <td>{registrationLabel[registration.status] ?? registration.status}</td>
          <td>{formatAdminDate(registration.applied_at)}</td>
        </tr>)}
      </tbody></table></div>
    </section>}

    <section className="admin-list-panel">
      <div className="admin-list-head"><h2>저장한 콘텐츠 <span>{saved.length}</span></h2></div>
      {saved.length ? <div className="admin-tag-list">
        {saved.map((item) => <span key={`${item.item_type}-${item.item_slug}`}>{savedTypeLabel[item.item_type] ?? item.item_type} · {item.item_slug}</span>)}
      </div> : <p className="admin-empty">저장한 콘텐츠가 없습니다.</p>}
    </section>

    <section className="admin-list-panel">
      <div className="admin-list-head"><h2>최근 댓글 <span>{comments.length}</span></h2></div>
      {comments.length ? <ul className="admin-comment-list">
        {comments.map((comment) => <li key={comment.id}><p>{comment.body}</p><time>{dateTime(comment.created_at)}</time></li>)}
      </ul> : <p className="admin-empty">작성한 댓글이 없습니다.</p>}
    </section>
  </main>;
}
