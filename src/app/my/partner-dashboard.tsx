import Link from "next/link";
import type { Community, EventItem, SupportProgram } from "@/lib/types";
import { StudioNav } from "./studio-nav";

interface PartnerSavedItem {
  type: string;
  slug: string;
  title: string;
  meta: string;
  href: string;
}

interface PartnerTeamBrand {
  id: string;
  name: string;
}

interface OpportunityItem {
  type: "행사" | "지원사업";
  title: string;
  organization: string;
  date: string;
  href: string;
}

const dateLabel = (value: string) => new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
const PARTNER_REFERENCE_TIME = Date.now();

const ddayLabel = (value: string) => {
  const days = Math.ceil((new Date(value).getTime() - PARTNER_REFERENCE_TIME) / 86_400_000);
  if (days < 0) return "마감";
  if (days === 0) return "D-DAY";
  return `D-${days}`;
};

export function PartnerDashboard({
  name,
  email,
  savedItems,
  teamBrands,
  events,
  supportPrograms,
  communities,
  submissions,
}: {
  name: string;
  email: string;
  savedItems: PartnerSavedItem[];
  teamBrands: PartnerTeamBrand[];
  events: EventItem[];
  supportPrograms: SupportProgram[];
  communities: Community[];
  submissions: { id: string; title: string; submission_type: string; status: string; updated_at: string }[];
}) {
  const upcomingEvents = events.filter((event) => new Date(event.startsAt).getTime() >= PARTNER_REFERENCE_TIME);
  const openPrograms = supportPrograms.filter((program) => new Date(`${program.closeAt}T23:59:59+09:00`).getTime() >= PARTNER_REFERENCE_TIME);
  const opportunities: OpportunityItem[] = [
    ...upcomingEvents.map((event) => ({ type: "행사" as const, title: event.name, organization: event.host, date: event.startsAt, href: `/events/${event.slug}` })),
    ...openPrograms.map((program) => ({ type: "지원사업" as const, title: program.name, organization: program.agency, date: `${program.closeAt}T23:59:59+09:00`, href: `/support/${program.slug}` })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 6);

  return <>
    <StudioNav />
    <main className="studio-dashboard partner-console">
      <div className="shell studio-dashboard-inner">
        <header className="partner-console-hero">
          <div>
            <p>PARTNER OPERATIONS</p>
            <span>PARTNER</span>
            <h1>{name}님,<br />좋은 기회를 더 멀리 연결하세요.</h1>
            <small>행사·지원사업·커뮤니티를 Founder에게 소개하고, 필요한 연결을 한곳에서 관리하는 파트너 센터입니다.</small>
          </div>
          <aside>
            <small>NOW CONNECTING</small>
            <strong>{upcomingEvents.length + openPrograms.length}</strong>
            <span>현재 연결 가능한 기회</span>
            <Link href="/partners">파트너 공개 페이지 <b>↗</b></Link>
          </aside>
        </header>

        <section className="partner-console-metrics" aria-label="파트너 현황">
          <article><span>UPCOMING</span><strong>{upcomingEvents.length}</strong><p>예정된 행사</p></article>
          <article><span>OPEN PROGRAM</span><strong>{openPrograms.length}</strong><p>접수 중 지원사업</p></article>
          <article><span>NETWORK</span><strong>{communities.length}</strong><p>연결된 커뮤니티</p></article>
          <article><span>MY SUBMISSION</span><strong>{submissions.length}</strong><p>내가 등록한 제안</p></article>
        </section>

        <div className="partner-console-grid">
          <section className="partner-opportunity-board">
            <header><div><span>OPPORTUNITY RADAR</span><h2>지금 연결할 기회</h2></div><Link href="/events">전체 일정 보기 →</Link></header>
            {opportunities.length ? <div className="partner-opportunity-list">
              {opportunities.map((item) => <Link href={item.href} key={`${item.type}-${item.href}`}>
                <i>{item.type}</i>
                <div><strong>{item.title}</strong><span>{item.organization}</span></div>
                <time dateTime={item.date}>{dateLabel(item.date)}<b>{ddayLabel(item.date)}</b></time>
                <em>→</em>
              </Link>)}
            </div> : <div className="partner-console-empty"><strong>현재 예정된 기회가 없어요.</strong><span>새로운 행사와 지원사업이 등록되면 이곳에서 바로 확인할 수 있어요.</span></div>}
          </section>

          <aside className="partner-action-panel">
            <header><span>QUICK ACTION</span><h2>새 기회 등록하기</h2><p>중간 저장부터 검수 요청까지 사이트 안에서 직접 진행하세요.</p></header>
            <Link href="/my/partner/register?type=event"><i>01</i><div><strong>행사 등록</strong><span>데모데이·밋업·교육·네트워킹</span></div><b>→</b></Link>
            <Link href="/my/partner/register?type=support"><i>02</i><div><strong>지원사업 등록</strong><span>모집 대상·혜택·마감 일정</span></div><b>→</b></Link>
            <Link href="/my/partner/register?type=community"><i>03</i><div><strong>커뮤니티 등록</strong><span>커뮤니티 소개 및 공동 기획</span></div><b>→</b></Link>
            <Link className="partner-action-all" href="/my/partner/register">등록 현황 전체보기 →</Link>
          </aside>
        </div>

        <section className="partner-submission-summary">
          <header><div><span>PUBLISHING QUEUE</span><h2>내 등록 현황</h2></div><Link href="/my/partner/register">등록 도구 열기 →</Link></header>
          {submissions.length ? <div>{submissions.slice(0, 4).map((item) => <Link href={`/my/partner/register?edit=${item.id}`} key={item.id}><i>{item.submission_type === "event" ? "행사" : item.submission_type === "support" ? "지원사업" : "커뮤니티"}</i><strong>{item.title || "제목 없는 초안"}</strong><span data-status={item.status}>{item.status === "draft" ? "작성 중" : item.status === "submitted" ? "검수 대기" : item.status === "in_review" ? "검수 중" : item.status === "approved" ? "승인 완료" : "보완 필요"}</span><b>→</b></Link>)}</div> : <div className="partner-console-empty"><strong>아직 등록한 제안이 없어요.</strong><span>행사·지원사업·커뮤니티 정보를 직접 등록해보세요.</span></div>}
        </section>

        <section className="partner-identity-panel">
          <div className="role-dashboard-avatar">{name.slice(0, 1) || "P"}</div>
          <div><span>MY PARTNER PROFILE</span><strong>{name}</strong><p>{email} · 파트너 역할로 활동 중</p></div>
          <div><strong>{teamBrands.length}</strong><span>참여 브랜드</span></div>
          <Link href="/my/settings">역할 및 계정 설정 →</Link>
        </section>

        <section className="partner-saved-board">
          <header><div><span>MY CURATION</span><h2>내가 저장한 목록</h2></div><p>Founder에게 소개하거나 다시 확인할 콘텐츠를 모아두는 공간입니다.</p></header>
          {savedItems.length ? <div>{savedItems.map((item) => <Link href={item.href} key={`${item.type}-${item.slug}`}><span>{item.type}</span><strong>{item.title}</strong><small>{item.meta}</small><b>→</b></Link>)}</div> : <div className="partner-console-empty"><strong>아직 저장한 항목이 없어요.</strong><span>프로덕트·스토리·행사·지원사업 상세 페이지에서 저장해보세요.</span></div>}
        </section>
      </div>
    </main>
  </>;
}
