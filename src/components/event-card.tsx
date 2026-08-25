import Link from "next/link";
import { Badge, ImageCard } from "@/components/site-shell";
import type { EventItem } from "@/lib/types";
import { formatMonthDayKst } from "@/lib/datetime";

export function EventCard({ event }: { event: EventItem }) {
  return <Link href={`/events/${event.slug}`} className={`event-card${event.isFeatured ? " is-featured" : ""}`}>
    <ImageCard src={event.coverUrl} alt={event.name} />
    {event.isFeatured && <span className="event-featured-label">Featable 선정</span>}
    <div className="card-body">
      <div className="event-date"><strong>{formatMonthDayKst(event.startsAt)}</strong><Badge>{event.category}</Badge></div>
      <div className="event-registration-badge" data-mode={event.registrationMode ?? "external"}>{event.registrationMode === "internal" ? "FEATABLE 신청" : "외부 신청"}</div>
      <h3>{event.name}</h3>
      <p>{event.host} · {event.location}</p>
      <span className="text-link">상세 보기 →</span>
    </div>
  </Link>;
}
