import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer, Header, Badge } from "@/components/site-shell";
import { getEvents } from "@/lib/data";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  createDetailMetadata,
  entityId,
  JsonLd,
  type SeoSchema,
} from "@/components/seo-json-ld";
import { partners } from "@/lib/mock";

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

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = (await getEvents()).find((item) => item.slug === slug);
  if (!event) notFound();

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
      ? { "@type": "VirtualLocation", url: event.applyUrl }
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
        <div className="info-panel"><div><span>일시</span><strong>{new Date(event.startsAt).toLocaleString("ko-KR")}</strong></div><div><span>장소</span><strong>{event.location}</strong></div><div><span>참가비</span><strong>{event.fee ?? "무료"}</strong></div><a className="button" href={event.applyUrl}>신청하기 ↗</a></div>
      </main>
      <Footer partners={partners} />
    </>
  );
}
