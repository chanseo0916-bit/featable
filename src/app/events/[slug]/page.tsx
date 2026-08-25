import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Header, Badge } from "@/components/site-shell";
import { getEvents, getFounderByUserId, getLikeCount, getPartners } from "@/lib/data";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  createDetailMetadata,
  entityId,
  JsonLd,
  type SeoSchema,
} from "@/components/seo-json-ld";
import { SaveButton } from "@/components/save-button";
import { LikeCount } from "@/components/like-count";
import { ViewTracker } from "@/components/view-tracker";
import { bypassImageOptimization } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventRegistrationCard } from "./registration-card";

function formatEventDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = (await getEvents()).find((item) => item.slug === slug);
  if (!event) return {};
  return createDetailMetadata({
    title: event.name,
    description: `${event.host}에서 진행하는 ${event.name}입니다. ${event.location}`.slice(0, 160),
    path: `/events/${event.slug}`,
    image: event.coverUrl,
  });
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) { const partners = await getPartners();
  const { slug } = await params;
  const event = (await getEvents()).find((item) => item.slug === slug);
  if (!event) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: registration }] = user && event.id && event.registrationMode === "internal"
    ? await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase.from("event_registrations").select("status").eq("event_id", event.id).eq("user_id", user.id).maybeSingle(),
    ])
    : [{ data: null }, { data: null }];

  const admin = createAdminClient();
  const { data: cohostRows } = admin && event.id
    ? await admin.from("event_cohosts").select("user_id").eq("event_id", event.id).eq("status", "accepted").order("created_at", { ascending: true })
    : { data: [] };
  const cohostUserIds = (cohostRows ?? []).map((row) => row.user_id).filter((userId) => userId !== event.submittedBy);
  const [eventSaveCount, organizer, cohostFounders, cohostProfiles] = await Promise.all([
    getLikeCount("event", event.slug),
    event.submittedBy ? getFounderByUserId(event.submittedBy) : null,
    Promise.all(cohostUserIds.map((userId) => getFounderByUserId(userId))),
    admin && cohostUserIds.length
      ? admin.from("profiles").select("id,full_name").in("id", cohostUserIds).then(({ data }) => data ?? [])
      : Promise.resolve([]),
  ]);
  const cohostNames = new Map(cohostProfiles.map((profile) => [profile.id, profile.full_name]));
  const cohosts = cohostUserIds.map((userId, index) => ({
    userId,
    founder: cohostFounders[index],
    name: cohostFounders[index]?.name || cohostNames.get(userId) || "Featable 공동 주최자",
  }));
  const publicOrganizers = [
    ...(organizer ? [{ name: organizer.name, url: `/founders/${organizer.slug}`, image: organizer.avatarUrl }] : []),
    ...cohosts.map((cohost) => ({ name: cohost.name, url: cohost.founder ? `/founders/${cohost.founder.slug}` : undefined, image: cohost.founder?.avatarUrl })),
  ];
  const eventPath = `/events/${event.slug}`;
  const eventJsonLd: SeoSchema = {
    "@type": "Event",
    "@id": entityId(eventPath, "event"),
    name: event.name,
    url: absoluteUrl(eventPath),
    description: `${event.host}에서 진행하는 ${event.name}입니다. ${event.location}`,
    image: absoluteUrl(event.coverUrl),
    startDate: event.startsAt,
    ...(event.endsAt ? { endDate: event.endsAt } : {}),
    eventAttendanceMode: event.isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: event.isOnline
      ? { "@type": "VirtualLocation", url: absoluteUrl(eventPath) }
      : { "@type": "Place", name: event.location },
    organizer: {
      "@type": "Organization",
      name: event.host,
      ...(publicOrganizers.length ? {
        member: publicOrganizers.map((member) => ({
          "@type": "Person",
          name: member.name,
          ...(member.url ? { url: absoluteUrl(member.url) } : {}),
          ...(member.image ? { image: absoluteUrl(member.image) } : {}),
        })),
      } : {}),
    },
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      eventJsonLd,
      breadcrumbJsonLd([
        { name: "Featable", path: "/" },
        { name: "이벤트", path: "/events" },
        { name: event.name, path: eventPath },
      ]),
    ],
  } satisfies SeoSchema;

  return (
    <>
      <JsonLd data={jsonLd} />
      <ViewTracker slug={event.slug} type="event" />
      <Header />
      <main className="event-experience shell">
        <aside className="event-experience-sidebar">
          <img src={event.coverUrl} alt={`${event.name} 포스터`} />
          <EventRegistrationCard eventId={event.id} slug={event.slug} host={event.host} mode={event.registrationMode ?? "external"} applyUrl={event.applyUrl} capacity={event.capacity} approvalMode={event.approvalMode ?? "instant"} closed={event.registrationClosed ?? false} isPaid={event.isPaid} paymentAccount={event.paymentAccount} paymentNotice={event.paymentNotice} user={user ? { name: profile?.full_name?.trim() || user.user_metadata?.full_name || "Featable 멤버", email: user.email ?? "" } : undefined} registration={registration ? { status: registration.status as "verification_pending" | "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled" } : undefined} />
          <section className="event-host-card">
            <span>주최 팀</span>
            <strong className="event-host-organization">{event.host}</strong>
            <div className="event-host-list">
              <div className="event-host-profile">
                {organizer ? <Image src={organizer.avatarUrl} alt={`${organizer.name} 프로필 사진`} width={56} height={56} unoptimized={bypassImageOptimization(organizer.avatarUrl)} /> : <i aria-hidden>{event.host.trim().slice(0, 1) || "F"}</i>}
                <div><strong>{organizer?.name || event.host}</strong><small>대표 주최{organizer?.role ? ` · ${organizer.role}` : ""}</small></div>
                {organizer && <Link href={`/founders/${organizer.slug}`} aria-label={`${organizer.name} 프로필 보기`}>→</Link>}
              </div>
              {cohosts.map((cohost) => <div className="event-host-profile" key={cohost.userId}>
                {cohost.founder ? <Image src={cohost.founder.avatarUrl} alt={`${cohost.name} 프로필 사진`} width={56} height={56} unoptimized={bypassImageOptimization(cohost.founder.avatarUrl)} /> : <i aria-hidden>{cohost.name.slice(0, 1)}</i>}
                <div><strong>{cohost.name}</strong><small>공동 주최{cohost.founder?.role ? ` · ${cohost.founder.role}` : ""}</small></div>
                {cohost.founder && <Link href={`/founders/${cohost.founder.slug}`} aria-label={`${cohost.name} 프로필 보기`}>→</Link>}
              </div>)}
            </div>
            <p>{organizer?.bio || organizer?.headline || (event.audience ? `${event.audience}를 위한 행사를 만들고 있습니다.` : "참가자에게 좋은 만남을 만드는 주최 팀입니다.")}</p>
          </section>
        </aside>
        <article className="event-experience-main">
          <div className="event-experience-badges"><Badge tone="orange">{event.category}</Badge><span>{event.fee ?? "무료"}</span>{event.capacity && <span>정원 {event.capacity.toLocaleString("ko-KR")}명</span>}</div>
          <h1>{event.name}</h1>
          <p className="event-experience-lede">{event.audience || `${event.host}가 만드는 창업가를 위한 만남입니다.`}</p>
          <div className="event-fact-grid"><div><span>일시</span><strong>{formatEventDate(event.startsAt)}</strong>{event.endsAt && <small>~ {formatEventDate(event.endsAt)}</small>}</div><div><span>장소</span><strong>{event.isOnline ? "온라인" : event.location}</strong></div><div><span>신청 마감</span><strong>{event.deadline ? formatEventDate(event.deadline) : "행사 시작 전까지"}</strong></div><SaveButton itemType="event" slug={event.slug} /></div>
          <p className="event-stat-row"><span>조회 {(event.viewCount ?? 0).toLocaleString("ko-KR")}</span><span>저장 <LikeCount itemType="event" slug={event.slug} initialCount={eventSaveCount} /></span></p>
          <section className="event-content-section"><span>행사 소개</span><h2>이런 자리예요</h2><p>{event.description || `${event.host}가 ${event.audience || "새로운 연결을 원하는 분들"}을 위해 준비한 행사입니다. 자세한 내용은 주최자 안내를 확인해주세요.`}</p></section>
          {!!event.program?.length && <section className="event-content-section"><span>프로그램</span><h2>일정</h2><div className="event-program-list">{event.program.map((item, index) => <div key={`${item.time}-${index}`}><time>{item.time || "순서"}</time><strong>{item.title}</strong><span>{item.speaker}</span></div>)}</div></section>}
          {!!event.galleryUrls?.length && <section className="event-content-section"><span>사진</span><h2>행사 미리보기</h2><div className="event-gallery-grid">{event.galleryUrls.map((url, index) => <img src={url} alt={`${event.name} 상세 이미지 ${index + 1}`} key={url} />)}</div></section>}
          <section className="event-bottom-cta"><span>신청 안내</span><h2>{event.registrationClosed ? "신청이 마감됐어요." : "함께할 준비가 되셨나요?"}</h2><p>신청 버튼을 누르면 행사 전용 신청서에서 정보를 입력할 수 있습니다.</p>{!event.registrationClosed && event.registrationMode === "internal" && <a className="button" href={`/events/${event.slug}/apply`}>신청하기 →</a>}</section>
        </article>
      </main>
      <Footer partners={partners} />
    </>
  );
}
