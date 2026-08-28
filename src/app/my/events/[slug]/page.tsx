import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashNav } from "../../dash-nav";
import { RegistrationControls } from "../registration-controls";
import { EventSettingsEditor } from "./event-settings-editor";
import type { RegistrationField } from "./actions";
import { EventCohostManager } from "./cohost-manager";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventAnnouncementComposer } from "./announcement-composer";
import type { AnnouncementRecipientFilter } from "./announcement-actions";
import { formatEventDateTimeKst } from "@/lib/datetime";
import { Badge } from "@/components/badge";

interface RegistrationRow {
  id: string;
  status: "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled";
  applicant_name: string;
  applicant_email: string;
  note: string | null;
  applied_at: string;
}

const statusLabel = { pending: "승인 대기", confirmed: "승인", waitlisted: "대기", rejected: "거절", cancelled: "취소" };

const REG_TONE = { pending: "warning", confirmed: "positive", waitlisted: "informative", rejected: "critical", cancelled: "neutral" } as const;

const shortDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} · ${date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })}`;
};

// 신청 note는 `[메시지]\n\n추가 질문\n질문: 답변` 형식으로 저장됨 → 메시지/답변 분리
function splitNote(note: string | null) {
  if (!note) return { message: "", answers: [] as { label: string; value: string }[] };
  const marker = "\n추가 질문\n";
  const idx = note.indexOf(marker);
  if (idx === -1) return { message: note.trim(), answers: [] };
  const message = note.slice(0, idx).trim();
  const answers = note
    .slice(idx + marker.length)
    .split("\n")
    .map((line) => {
      const sep = line.indexOf(": ");
      if (sep < 1) return null;
      return { label: line.slice(0, sep).trim(), value: line.slice(sep + 2).trim() };
    })
    .filter((a): a is { label: string; value: string } => !!a && !!a.value);
  return { message, answers };
}

export default async function EventRegistrationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/my/events/${slug}`)}`);
  const { data: event } = await supabase.from("events").select("id,slug,name,host,description,starts_at,ends_at,location,is_online,category,capacity,approval_mode,registration_mode,apply_url,cover_url,submitted_by,gallery_urls,registration_fields,is_paid,payment_account,payment_notice").eq("slug", slug).maybeSingle();
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
  const announcementCounts: Record<AnnouncementRecipientFilter, number> = {
    active: registrations.filter((item) => ["pending", "confirmed", "waitlisted"].includes(item.status)).length,
    confirmed: registrations.filter((item) => item.status === "confirmed").length,
    pending: registrations.filter((item) => item.status === "pending").length,
    waitlisted: registrations.filter((item) => item.status === "waitlisted").length,
  };
  const { data: announcementRows } = admin
    ? await admin.from("event_announcements").select("id,subject,recipient_filter,recipient_count,delivered_count,failed_count,status,created_at").eq("event_id", event.id).order("created_at", { ascending: false }).limit(5)
    : { data: [] };
  const announcementHistory = (announcementRows ?? []).map((item) => ({
    id: item.id,
    subject: item.subject,
    recipientFilter: item.recipient_filter as AnnouncementRecipientFilter,
    recipientCount: item.recipient_count,
    deliveredCount: item.delivered_count,
    failedCount: item.failed_count,
    status: item.status as "sending" | "sent" | "partial" | "failed",
    createdAt: item.created_at,
  }));

  return <><DashNav active="events" /><main className="dash-page event-attendees-page"><div className="shell dash-shell">
    <header className="event-attendees-heading"><div><p>EVENT GUESTS</p><h1>{event.name}</h1><span>{formatEventDateTimeKst(event.starts_at)} · 확정 {activeCount}{event.capacity ? ` / ${event.capacity}명` : "명"}</span></div><Link href={`/events/${event.slug}`} target="_blank">공개 페이지 ↗</Link></header>
    <div className="event-stats">
      <div className="event-stat"><i className="event-stat-dot positive" /><b>{activeCount}</b><span>확정</span></div>
      <div className="event-stat"><i className="event-stat-dot warning" /><b>{registrations.filter((r) => r.status === "pending").length}</b><span>승인 대기</span></div>
      <div className="event-stat"><i className="event-stat-dot informative" /><b>{registrations.filter((r) => r.status === "waitlisted").length}</b><span>대기자</span></div>
    </div>
    <section className="event-attendee-card">
      <header className="event-attendee-card-head">
        <div><span className="event-manage-eyebrow">ATTENDEES</span><h2>신청자 <b>{registrations.length}명</b></h2></div>
        <p>이름과 이메일은 행사 신청 관리 목적으로만 사용해주세요.</p>
      </header>
      {registrations.length ? (
        <div className="event-attendee-rows">
          {registrations.map((item, index) => {
            const { message, answers } = splitNote(item.note);
            return (
              <article className="event-attendee-row" key={item.id}>
                <i className="event-attendee-index">{String(index + 1).padStart(2, "0")}</i>
                <div className="event-attendee-main">
                  <strong>{item.applicant_name}</strong>
                  <a href={`mailto:${item.applicant_email}`}>{item.applicant_email}</a>
                  {message && <p>{message}</p>}
                  {answers.length > 0 && (
                    <div className="event-attendee-answers">
                      {answers.map((answer) => (
                        <span key={answer.label} className="event-attendee-answer"><b>{answer.label}</b>{answer.value}</span>
                      ))}
                    </div>
                  )}
                </div>
                <time className="event-attendee-date">{shortDate(item.applied_at)}</time>
                <Badge tone={REG_TONE[item.status]}>{statusLabel[item.status]}</Badge>
                {(item.status === "pending" || item.status === "waitlisted") && <RegistrationControls registrationId={item.id} eventSlug={event.slug} />}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="my-event-empty"><strong>아직 신청자가 없어요.</strong><span>신청자가 생기면 이곳에서 바로 확인할 수 있습니다.</span></div>
      )}
    </section>
    <EventAnnouncementComposer eventId={event.id} eventSlug={event.slug} eventName={event.name} counts={announcementCounts} history={announcementHistory} />
    <EventSettingsEditor eventId={event.id} slug={event.slug} name={event.name} host={event.host} description={event.description} startsAt={event.starts_at} endsAt={event.ends_at} location={event.location} isOnline={event.is_online} category={event.category} capacity={event.capacity} registrationMode={event.registration_mode} applyUrl={event.apply_url ?? ""} approvalMode={event.approval_mode} coverUrl={event.cover_url ?? ""} galleryUrls={(event.gallery_urls ?? []) as string[]} registrationFields={(event.registration_fields ?? []) as RegistrationField[]} isPaid={Boolean(event.is_paid)} paymentAccount={event.payment_account ?? ""} paymentNotice={event.payment_notice ?? ""} canDelete={event.submitted_by === user.id} />
    {event.submitted_by === user.id && <EventCohostManager eventId={event.id} slug={event.slug} initial={cohostRows as { id: string; email: string; role: string; status: "pending" | "accepted" | "declined"; profile?: { full_name?: string | null } | null }[]} />}
  </div></main></>;
}
