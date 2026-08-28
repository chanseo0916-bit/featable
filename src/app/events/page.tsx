import Link from "next/link";
import { Footer, Header } from "@/components/site-shell";
import { EntityCard } from "@/components/cards/entity-card";
import { getEvents, getPartners } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";
import { formatMonthDayKst } from "@/lib/datetime";

export const metadata = createPageMetadata({
  title: "창업 행사와 밋업",
  description:
    "창업가와 만드는 사람이 연결되는 창업 행사와 밋업을 찾아보세요. 관심 있는 행사 정보를 확인하고 참여할 수 있습니다.",
  path: "/events",
});

export default async function EventsPage() {
  const partners = await getPartners();
  const events = await getEvents();
  return <><Header /><main className="shell listing-page"><div className="listing-heading"><div><h1>행사</h1><p>창업가와 만드는 사람들이 만나는 자리.</p></div><Link className="button event-submit-link" href="/my/partner/register?type=event">행사 등록하기 →</Link></div><div className="event-grid">{events.map((event) => (
    <EntityCard
      href={`/events/${event.slug}`}
      key={event.slug}
      layout="image"
      media={event.coverUrl}
      mediaAlt={event.name}
      ratio={1.45}
      metaLead={<span className="entity-card-meta-lead">{formatMonthDayKst(event.startsAt)}</span>}
      metaBadge={<span className={`badge badge-tone-${event.registrationMode === "internal" ? "brand" : "neutral"} badge-variant-weak badge-size-medium`}>{event.registrationMode === "internal" ? "FEATABLE 신청" : "외부 신청"}</span>}
      title={event.name}
      description={`${event.host} · ${event.location}`}
    />
  ))}</div></main><Footer partners={partners} /></>;
}
