import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashNav } from "../../dash-nav";
import { EventAttendeeList } from "./attendee-list";
import { EventSettingsEditor } from "./event-settings-editor";
import type { RegistrationField } from "./actions";
import { EventCohostManager } from "./cohost-manager";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventAnnouncementComposer } from "./announcement-composer";
import type { AnnouncementRecipientFilter } from "./announcement-actions";
import { formatEventDateTimeKst } from "@/lib/datetime";

interface RegistrationRow {
  id: string;
  status: "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled";
  applicant_name: string;
  applicant_email: string;
  note: string | null;
  applied_at: string;
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
    <header className="event-attendees-heading"><div><h1>{event.name}</h1><span>{formatEventDateTimeKst(event.starts_at)} · 확정 {activeCount}{event.capacity ? ` / ${event.capacity}명` : "명"}</span></div><Link href={`/events/${event.slug}`} target="_blank">공개 페이지 ↗</Link></header>
    <div className="event-stats">
      <div className="event-stat"><i className="event-stat-dot positive" /><b>{activeCount}</b><span>확정</span></div>
      <div className="event-stat"><i className="event-stat-dot warning" /><b>{registrations.filter((r) => r.status === "pending").length}</b><span>승인 대기</span></div>
      <div className="event-stat"><i className="event-stat-dot informative" /><b>{registrations.filter((r) => r.status === "waitlisted").length}</b><span>대기자</span></div>
    </div>
    <section className="event-attendee-card">
      <header className="event-attendee-card-head"><h2>신청자 <b>{registrations.length}명</b></h2></header>
      <EventAttendeeList registrations={registrations} eventSlug={event.slug} />
    </section>
    <EventAnnouncementComposer eventId={event.id} eventSlug={event.slug} eventName={event.name} counts={announcementCounts} history={announcementHistory} />
    <EventSettingsEditor eventId={event.id} slug={event.slug} name={event.name} host={event.host} description={event.description} startsAt={event.starts_at} endsAt={event.ends_at} location={event.location} isOnline={event.is_online} category={event.category} capacity={event.capacity} registrationMode={event.registration_mode} applyUrl={event.apply_url ?? ""} approvalMode={event.approval_mode} coverUrl={event.cover_url ?? ""} galleryUrls={(event.gallery_urls ?? []) as string[]} registrationFields={(event.registration_fields ?? []) as RegistrationField[]} isPaid={Boolean(event.is_paid)} paymentAccount={event.payment_account ?? ""} paymentNotice={event.payment_notice ?? ""} canDelete={event.submitted_by === user.id} />
    {event.submitted_by === user.id && <EventCohostManager eventId={event.id} slug={event.slug} initial={cohostRows as { id: string; email: string; role: string; status: "pending" | "accepted" | "declined"; profile?: { full_name?: string | null } | null }[]} />}
  </div></main></>;
}
