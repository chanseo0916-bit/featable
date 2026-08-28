import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashNav } from "../dash-nav";
import { formatMonthDayKst } from "@/lib/datetime";
import { EntityCard } from "@/components/cards/entity-card";
import { EventCardMenu } from "./event-card-menu";

export const metadata = { title: "내 행사 · Featable", robots: { index: false, follow: false } };

interface MyRegistrationRow {
  id: string;
  status: "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled";
  applied_at: string;
  user_id: string | null;
  event: { slug: string; name: string; starts_at: string; location: string; host: string; cover_url: string | null; category: string | null } | null;
}

const placeholder = (_seed: string, _w = 1200, _h = 800): string => {
  void _w;
  void _h;
  return "/image-fallback.svg";
};

const statusLabel = { pending: "승인 대기", confirmed: "신청 완료", waitlisted: "대기 신청", rejected: "승인되지 않음", cancelled: "취소" };
const REGISTRATION_COLUMNS = "id,status,applied_at,user_id,event:events(slug,name,starts_at,location,host,cover_url,category)";

export default async function MyEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/events");

  // 로그인 전에 게스트로 신청한 건도 같은 이메일이면 함께 보여준다 (migration-33 정책)
  const email = (user.email ?? "").trim().toLowerCase();
  const [{ data: memberRows }, { data: guestRows }, { data: ownedEvents }, { data: cohostRows }] = await Promise.all([
    supabase.from("event_registrations").select(REGISTRATION_COLUMNS).eq("user_id", user.id).order("applied_at", { ascending: false }),
    email
      ? supabase.from("event_registrations").select(REGISTRATION_COLUMNS).is("user_id", null).eq("applicant_email", email).order("applied_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("events").select("id,slug,name,starts_at,registration_mode,cover_url,host").eq("submitted_by", user.id).order("starts_at", { ascending: false }),
    supabase.from("event_cohosts").select("event_id").eq("user_id", user.id).eq("status", "accepted"),
  ]);
  const registrations = ([...(memberRows ?? []), ...(guestRows ?? [])] as unknown as MyRegistrationRow[])
    .sort((a, b) => (b.applied_at ?? "").localeCompare(a.applied_at ?? ""));
  const cohostEventIds = (cohostRows ?? []).map((row) => row.event_id);
  const { data: cohostEvents } = cohostEventIds.length
    ? await supabase.from("events").select("id,slug,name,starts_at,registration_mode,cover_url,host").in("id", cohostEventIds).order("starts_at", { ascending: false })
    : { data: [] };
  const operatedEvents = [
    ...(ownedEvents ?? []).map((event) => ({ ...event, operatorRole: "대표 주최", canDelete: true })),
    ...(cohostEvents ?? []).map((event) => ({ ...event, operatorRole: "공동 주최", canDelete: false })),
  ].sort((a, b) => (b.starts_at ?? "").localeCompare(a.starts_at ?? ""));

  // 대시보드 현황: 운영 중인 행사별 신청자 집계
  const ownedIds = operatedEvents.map((event) => event.id).filter(Boolean);
  const { data: regRows } = ownedIds.length
    ? await supabase.from("event_registrations").select("event_id,status").in("event_id", ownedIds)
    : { data: [] };
  const regCounts = new Map<string, { confirmed: number; pending: number; waitlisted: number; total: number }>();
  for (const row of (regRows ?? []) as { event_id: string; status: string }[]) {
    const counts = regCounts.get(row.event_id) ?? { confirmed: 0, pending: 0, waitlisted: 0, total: 0 };
    counts.total += 1;
    if (row.status === "confirmed") counts.confirmed += 1;
    else if (row.status === "pending") counts.pending += 1;
    else if (row.status === "waitlisted") counts.waitlisted += 1;
    regCounts.set(row.event_id, counts);
  }
  const statsFor = (id: string) => regCounts.get(id) ?? { confirmed: 0, pending: 0, waitlisted: 0, total: 0 };

  return <><DashNav active="events" /><main className="dash-page managed-community-page my-events-page"><div className="shell dash-shell">
    <header className="managed-community-heading"><div><h1>내 행사</h1><p>신청한 행사와 운영 중인 행사의 현황을 한곳에서 확인하세요.</p></div><Link href="/my/partner/register?type=event" className="button">＋ 행사 개설하기</Link></header>
    <section className="my-event-section">{registrations.length ? <><header><h2>내 신청</h2></header><div className="my-event-grid">{registrations.map((item) => item.event && <EntityCard href={`/events/${item.event.slug}`} key={item.id} layout="image" media={item.event.cover_url || placeholder(`event-${item.event.slug}`)} mediaAlt={item.event.name} ratio={1.45} mediaOverlay={<span className={`my-event-status is-${item.status}`}>{statusLabel[item.status]}</span>} metaLead={<span className="entity-card-meta-lead">{formatMonthDayKst(item.event.starts_at)}</span>} metaBadge={item.event.category ? <span>{item.event.category}</span> : null} title={item.event.name} description={`${item.event.host} · ${item.event.location}${item.user_id ? "" : " · 이메일 신청"}`} />)}</div></> : <div className="managed-community-empty my-event-empty"><h2>아직 신청한 행사가 없어요.</h2><p>관심 있는 행사를 찾으면 신청 내역을 여기에서 확인할 수 있어요.</p><Link href="/events">행사 찾기 →</Link></div>}</section>
    <section className="my-event-section">{operatedEvents.length ? <><header><h2>운영 중인 행사</h2></header><div className="my-event-grid">{operatedEvents.map((event) => {
      const stats = statsFor(event.id);
      const statusTone = event.registration_mode === "closed" ? "closed" : event.starts_at < new Date().toISOString() ? "ended" : "open";
      return <article className="my-operated-event" key={event.id}>
        <EntityCard href={`/my/events/${event.slug}`} layout="image" media={event.cover_url || placeholder(`event-${event.slug}`)} mediaAlt={event.name} ratio={1.45} mediaOverlay={<span className={`my-event-status is-${event.operatorRole === "대표 주최" ? "host" : "cohost"}`}>{event.operatorRole}</span>} metaLead={<span className="entity-card-meta-lead">{formatMonthDayKst(event.starts_at)}</span>} metaBadge={event.registration_mode === "internal" ? <span>Featable 신청자 관리</span> : event.registration_mode === "closed" ? <span>신청 마감</span> : <span>외부 신청</span>} title={event.name} description={`${event.operatorRole} · ${event.host}`} />
        <div className="my-event-dashboard">
          <div className="my-event-dashboard-stats">
            <div><b>{stats.confirmed}</b><span>확정</span></div>
            <div><b>{stats.pending}</b><span>승인 대기</span></div>
            <div><b>{stats.waitlisted}</b><span>대기자</span></div>
          </div>
          <Link className={`my-event-dashboard-cta is-${statusTone}`} href={`/my/events/${event.slug}`}>{statusTone === "closed" ? "신청 마감 · 관리하기" : statusTone === "ended" ? "종료됨 · 결과 보기" : "신청자 관리하기"} →</Link>
        </div>
        <EventCardMenu eventId={event.id} slug={event.slug} name={event.name} registrationMode={event.registration_mode as "internal" | "external" | "closed"} canDelete={event.canDelete} />
      </article>;
    })}</div></> : <div className="managed-community-empty my-event-empty"><h2>아직 운영 중인 행사가 없어요.</h2><p>행사를 직접 등록하거나 공동 주최하면 현황을 여기에서 확인할 수 있어요.</p><Link href="/my/partner/register?type=event" className="button">＋ 행사 개설하기</Link></div>}</section>
  </div></main></>;
}
