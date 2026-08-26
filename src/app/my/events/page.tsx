import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashNav } from "../dash-nav";
import { formatMonthDayKst } from "@/lib/datetime";
import { EntityCard } from "@/components/cards/entity-card";

export const metadata = { title: "내 행사 · Featable", robots: { index: false, follow: false } };

interface MyRegistrationRow {
  id: string;
  status: "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled";
  applied_at: string;
  user_id: string | null;
  event: { slug: string; name: string; starts_at: string; location: string; host: string; cover_url: string | null; category: string | null } | null;
}

const placeholder = (seed: string, w = 1200, h = 800) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

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
    ...(ownedEvents ?? []).map((event) => ({ ...event, operatorRole: "대표 주최" })),
    ...(cohostEvents ?? []).map((event) => ({ ...event, operatorRole: "공동 주최" })),
  ].sort((a, b) => (b.starts_at ?? "").localeCompare(a.starts_at ?? ""));

  return <><DashNav active="events" /><main className="dash-page my-events-page"><div className="shell dash-shell">
    <header className="my-events-heading"><div><p>MY EVENTS</p><h1>내 행사</h1><span>신청한 행사와 내가 등록한 행사를 한곳에서 관리하세요.</span></div><Link href="/events">행사 둘러보기 →</Link></header>
    <section className="my-event-section"><header><span>MY REGISTRATIONS</span><h2>내 신청</h2></header>{registrations.length ? <div className="my-event-grid">{registrations.map((item) => item.event && <EntityCard href={`/events/${item.event.slug}`} key={item.id} layout="image" media={item.event.cover_url || placeholder(`event-${item.event.slug}`)} mediaAlt={item.event.name} ratio={1.45} mediaOverlay={<span className={`my-event-status is-${item.status}`}>{statusLabel[item.status]}</span>} metaLead={<span className="entity-card-meta-lead">{formatMonthDayKst(item.event.starts_at)}</span>} metaBadge={item.event.category ? <span>{item.event.category}</span> : null} title={item.event.name} description={`${item.event.host} · ${item.event.location}${item.user_id ? "" : " · 이메일 신청"}`} />)}</div> : <div className="my-event-empty"><strong>아직 신청한 행사가 없어요.</strong><span>관심 있는 행사에 Featable로 바로 신청해보세요.</span><Link href="/events">행사 찾기 →</Link></div>}</section>
    <section className="my-event-section"><header><span>HOSTING</span><h2>내가 운영하는 행사</h2></header>{operatedEvents.length ? <div className="my-event-grid">{operatedEvents.map((event) => <EntityCard href={`/my/events/${event.slug}`} key={event.id} layout="image" media={event.cover_url || placeholder(`event-${event.slug}`)} mediaAlt={event.name} ratio={1.45} mediaOverlay={<span className={`my-event-status is-${event.operatorRole === "대표 주최" ? "host" : "cohost"}`}>{event.operatorRole}</span>} metaLead={<span className="entity-card-meta-lead">{formatMonthDayKst(event.starts_at)}</span>} metaBadge={event.registration_mode === "internal" ? <span>Featable 신청자 관리</span> : <span>외부 신청</span>} title={event.name} description={`${event.operatorRole} · ${event.host}`} />)}</div> : <div className="my-event-empty"><strong>아직 운영 중인 행사가 없어요.</strong><span>행사를 등록하거나 공동 주최 초대를 수락하면 이곳에 표시됩니다.</span><Link href="/my/partner/register?type=event">행사 등록하기 →</Link></div>}</section>
  </div></main></>;
}
