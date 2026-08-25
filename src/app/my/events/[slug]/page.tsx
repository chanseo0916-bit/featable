import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashNav } from "../../dash-nav";
import { RegistrationControls } from "../registration-controls";
import { EventSettingsEditor } from "./event-settings-editor";
import type { RegistrationField } from "./actions";
import { EventCohostManager } from "./cohost-manager";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const { data: event } = await supabase.from("events").select("id,slug,name,host,description,starts_at,ends_at,location,is_online,category,capacity,approval_mode,registration_mode,apply_url,submitted_by,gallery_urls,registration_fields,is_paid,payment_account,payment_notice").eq("slug", slug).maybeSingle();
  const admin = createAdminClient();
  const { data: rawCohostRows } = admin && event ? await admin.from("event_cohosts").select("id,user_id,email,role,status").eq("event_id", event.id) : { data: [] };
  const profileIds = (rawCohostRows ?? []).map((row) => row.user_id);
  const { data: cohostProfiles } = admin && profileIds.length ? await admin.from("profiles").select("id,full_name").in("id", profileIds) : { data: [] };
  const profileNames = new Map((cohostProfiles ?? []).map((profile) => [profile.id, profile.full_name]));
  const cohostRows = (rawCohostRows ?? []).map((row) => ({ ...row, profile: { full_name: profileNames.get(row.user_id) ?? null } }));
  const isCohost = cohostRows.some((row) => row.user_id === user.id && row.status === "accepted");
  if (!event || (event.submitted_by !== user.id && !isCohost)) notFound();
  const { data } = await supabase.from("event_registrations").select("id,status,applicant_name,applicant_email,note,applied_at").eq("event_id", event.id).neq("status", "verification_pending").order("applied_at", { ascending: true });
  const registrations = (data ?? []) as RegistrationRow[];
  const activeCount = registrations.filter((item) => item.status === "confirmed").length;

  return <><DashNav active="events" /><main className="dash-page event-attendees-page"><div className="shell dash-shell">
    <header className="event-attendees-heading"><div><p>EVENT GUESTS</p><h1>{event.name}</h1><span>{new Date(event.starts_at).toLocaleString("ko-KR")} · 확정 {activeCount}{event.capacity ? ` / ${event.capacity}명` : "명"}</span></div><Link href={`/events/${event.slug}`} target="_blank">공개 페이지 ↗</Link></header>
    <section className="event-attendee-list"><header><strong>신청자 {registrations.length}명</strong><span>이름과 이메일은 행사 신청 관리 목적으로만 사용해주세요.</span></header>{registrations.length ? registrations.map((item, index) => <article key={item.id}><i>{String(index + 1).padStart(2, "0")}</i><div><strong>{item.applicant_name}</strong><a href={`mailto:${item.applicant_email}`}>{item.applicant_email}</a>{item.note && <p>{item.note}</p>}</div><time>{new Date(item.applied_at).toLocaleString("ko-KR")}</time><em data-status={item.status}>{statusLabel[item.status]}</em>{(item.status === "pending" || item.status === "waitlisted") && <RegistrationControls registrationId={item.id} eventSlug={event.slug} />}</article>) : <div className="my-event-empty"><strong>아직 신청자가 없어요.</strong><span>신청자가 생기면 이곳에서 바로 확인할 수 있습니다.</span></div>}</section>
    <EventSettingsEditor eventId={event.id} slug={event.slug} name={event.name} host={event.host} description={event.description} startsAt={event.starts_at} endsAt={event.ends_at} location={event.location} isOnline={event.is_online} category={event.category} capacity={event.capacity} registrationMode={event.registration_mode} applyUrl={event.apply_url ?? ""} approvalMode={event.approval_mode} galleryUrls={(event.gallery_urls ?? []) as string[]} registrationFields={(event.registration_fields ?? []) as RegistrationField[]} isPaid={Boolean(event.is_paid)} paymentAccount={event.payment_account ?? ""} paymentNotice={event.payment_notice ?? ""} />
    {event.submitted_by === user.id && <EventCohostManager eventId={event.id} slug={event.slug} initial={cohostRows as { id: string; email: string; role: string; status: "pending" | "accepted" | "declined"; profile?: { full_name?: string | null } | null }[]} />}
  </div></main></>;
}
