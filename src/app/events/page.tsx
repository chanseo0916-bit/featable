import Link from "next/link";
import { Footer, Header, Badge, ImageCard } from "@/components/site-shell";
import { getEvents, getPartners } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  title: "창업 행사와 밋업",
  description:
    "창업가와 만드는 사람이 연결되는 창업 행사와 밋업을 찾아보세요. 관심 있는 행사 정보를 확인하고 참여할 수 있습니다.",
  path: "/events",
});

export default async function EventsPage() { const partners = await getPartners(); const events = await getEvents(); return <><Header /><main className="shell listing-page"><div className="listing-heading"><div><p className="eyebrow">EVENTS</p><h1>행사</h1><p>창업가와 만드는 사람들이 만나는 자리.</p></div><Link className="button event-submit-link" href="/my/partner/register?type=event">내 행사 등록하기 →</Link></div><div className="event-grid">{events.map((event) => <Link href={`/events/${event.slug}`} className={`event-card${event.isFeatured ? " is-featured" : ""}`} key={event.slug}><ImageCard src={event.coverUrl} alt={event.name} />{event.isFeatured && <span className="event-featured-label">FEATURED BY FEATABLE</span>}<div className="card-body"><div className="event-date"><strong>{new Date(event.startsAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</strong><Badge>{event.category}</Badge></div><h3>{event.name}</h3><p>{event.host} · {event.location}</p><span className="text-link">신청하기 →</span></div></Link>)}</div></main><Footer partners={partners} /></>; }
