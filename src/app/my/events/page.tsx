import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioNav } from "../studio-nav";

export const metadata = { title: "내 행사 · Featable", robots: { index: false, follow: false } };

interface MyRegistrationRow {
  id: string;
  status: "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled";
  applied_at: string;
  user_id: string | null;
  event: { slug: string; name: string; starts_at: string; location: string; host: string } | null;
}

const statusLabel = { pending: "승인 대기", confirmed: "신청 완료", waitlisted: "대기 신청", rejected: "승인되지 않음", cancelled: "취소" };
const REGISTRATION_COLUMNS = "id,status,applied_at,user_id,event:events(slug,name,starts_at,location,host)";

export default async function MyEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/events");

  // 로그인 전에 게스트로 신청한 건도 같은 이메일이면 함께 보여준다 (migration-33 정책)
  const email = (user.email ?? "").trim().toLowerCase();
  const [{ data: memberRows }, { data: guestRows }, { data: ownedEvents }] = await Promise.all([
    supabase.from("event_registrations").select(REGISTRATION_COLUMNS).eq("user_id", user.id).order("applied_at", { ascending: false }),
    email
      ? supabase.from("event_registrations").select(REGISTRATION_COLUMNS).is("user_id", null).eq("applicant_email", email).order("applied_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("events").select("id,slug,name,starts_at,registration_mode").eq("submitted_by", user.id).order("starts_at", { ascending: false }),
  ]);
  const registrations = ([...(memberRows ?? []), ...(guestRows ?? [])] as unknown as MyRegistrationRow[])
    .sort((a, b) => (b.applied_at ?? "").localeCompare(a.applied_at ?? ""));

  return <><StudioNav active="events" /><main className="studio-dashboard my-events-page"><div className="shell studio-dashboard-inner">
    <header className="my-events-heading"><div><p>MY EVENTS</p><h1>내 행사</h1><span>신청한 행사와 내가 등록한 행사를 한곳에서 관리하세요.</span></div><Link href="/events">행사 둘러보기 →</Link></header>
    <section className="my-event-section"><header><span>MY REGISTRATIONS</span><h2>내 신청</h2></header>{registrations.length ? <div className="my-event-list">{registrations.map((item) => item.event && <Link href={`/events/${item.event.slug}`} key={item.id}><time>{new Date(item.event.starts_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</time><div><strong>{item.event.name}</strong><span>{item.event.host} · {item.event.location}{item.user_id ? "" : " · 이메일로 신청"}</span></div><em data-status={item.status}>{statusLabel[item.status]}</em><b>→</b></Link>)}</div> : <div className="my-event-empty"><strong>아직 신청한 행사가 없어요.</strong><span>관심 있는 행사에 Featable로 바로 신청해보세요.</span><Link href="/events">행사 찾기 →</Link></div>}</section>
    <section className="my-event-section"><header><span>HOSTING</span><h2>내가 등록한 행사</h2></header>{ownedEvents?.length ? <div className="my-event-list">{ownedEvents.map((event) => <Link href={event.registration_mode === "internal" ? `/my/events/${event.slug}` : `/events/${event.slug}`} key={event.id}><time>{new Date(event.starts_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</time><div><strong>{event.name}</strong><span>{event.registration_mode === "internal" ? "Featable 신청자 관리" : "외부 신청 행사"}</span></div><em>{event.registration_mode === "internal" ? "신청자 보기" : "공개 페이지"}</em><b>→</b></Link>)}</div> : <div className="my-event-empty"><strong>아직 등록한 행사가 없어요.</strong><span>누구나 일반 행사를 바로 등록할 수 있어요.</span><Link href="/my/partner/register?type=event">행사 등록하기 →</Link></div>}</section>
  </div></main></>;
}
