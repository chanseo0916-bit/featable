import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioNav } from "../../studio-nav";
import { RegistrationControls } from "../registration-controls";

interface RegistrationRow {
  id: string;
  status: "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled";
  applicant_name: string;
  applicant_email: string;
  note: string | null;
  applied_at: string;
}

const statusLabel = { pending: "승인 대기", confirmed: "승인", waitlisted: "대기", rejected: "거절", cancelled: "취소" };

export default async function EventRegistrationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/my/events/${slug}`)}`);
  const { data: event } = await supabase.from("events").select("id,slug,name,starts_at,capacity,approval_mode,submitted_by").eq("slug", slug).maybeSingle();
  if (!event || event.submitted_by !== user.id) notFound();
  const { data } = await supabase.from("event_registrations").select("id,status,applicant_name,applicant_email,note,applied_at").eq("event_id", event.id).neq("status", "verification_pending").order("applied_at", { ascending: true });
  const registrations = (data ?? []) as RegistrationRow[];
  const activeCount = registrations.filter((item) => item.status === "confirmed").length;

  return <><StudioNav active="events" /><main className="studio-dashboard event-attendees-page"><div className="shell studio-dashboard-inner">
    <header className="event-attendees-heading"><div><p>EVENT GUESTS</p><h1>{event.name}</h1><span>{new Date(event.starts_at).toLocaleString("ko-KR")} · 확정 {activeCount}{event.capacity ? ` / ${event.capacity}명` : "명"}</span></div><Link href={`/events/${event.slug}`} target="_blank">공개 페이지 ↗</Link></header>
    <section className="event-attendee-list"><header><strong>신청자 {registrations.length}명</strong><span>이름과 이메일은 행사 신청 관리 목적으로만 사용해주세요.</span></header>{registrations.length ? registrations.map((item, index) => <article key={item.id}><i>{String(index + 1).padStart(2, "0")}</i><div><strong>{item.applicant_name}</strong><a href={`mailto:${item.applicant_email}`}>{item.applicant_email}</a>{item.note && <p>{item.note}</p>}</div><time>{new Date(item.applied_at).toLocaleString("ko-KR")}</time><em data-status={item.status}>{statusLabel[item.status]}</em>{item.status !== "cancelled" && <RegistrationControls registrationId={item.id} eventSlug={event.slug} />}</article>) : <div className="my-event-empty"><strong>아직 신청자가 없어요.</strong><span>신청자가 생기면 이곳에서 바로 확인할 수 있습니다.</span></div>}</section>
  </div></main></>;
}
