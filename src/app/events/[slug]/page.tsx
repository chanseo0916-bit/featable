import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer, Header, Badge } from "@/components/site-shell";
import { getEvents, getPartners } from "@/lib/data";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  createDetailMetadata,
  entityId,
  JsonLd,
  type SeoSchema,
} from "@/components/seo-json-ld";
import { SaveButton } from "@/components/save-button";
import { createClient } from "@/lib/supabase/server";
import { EventRegistrationCard } from "./registration-card";

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
    organizer: { "@type": "Organization", name: event.host },
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
      <Header />
      <main className="detail-page">
        <div className="detail-kicker"><Badge tone="orange">{event.category}</Badge><span>{new Date(event.startsAt).toLocaleDateString("ko-KR")}</span></div>
        <h1>{event.name}</h1>
        <p className="detail-lede">{event.host}가 만드는 창업가를 위한 만남입니다.</p>
        <img className="detail-cover" src={event.coverUrl} alt={event.name} />
        <div className="info-panel"><div><span>일시</span><strong>{new Date(event.startsAt).toLocaleString("ko-KR")}</strong></div><div><span>장소</span><strong>{event.location}</strong></div><div><span>참가비</span><strong>{event.fee ?? "무료"}</strong></div><SaveButton itemType="event" slug={event.slug} /></div>
        <EventRegistrationCard eventId={event.id} slug={event.slug} host={event.host} mode={event.registrationMode ?? "external"} applyUrl={event.applyUrl} capacity={event.capacity} approvalMode={event.approvalMode ?? "instant"} closed={event.registrationClosed ?? false} user={user ? { name: profile?.full_name?.trim() || user.user_metadata?.full_name || "Featable 멤버", email: user.email ?? "" } : undefined} registration={registration ? { status: registration.status as "verification_pending" | "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled" } : undefined} />
      </main>
      <Footer partners={partners} />
    </>
  );
}
