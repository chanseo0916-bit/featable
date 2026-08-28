"use client";

import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/badge";

interface RecentRegistration {
  id: string;
  applicant_name: string;
  applicant_email: string;
  status: string;
  applied_at: string;
}

export function EventOverview({
  startsAt,
  endsAt,
  location,
  host,
  category,
  capacity,
  confirmed,
  pending,
  waitlisted,
  registrations,
  slug,
}: {
  startsAt: string;
  endsAt: string | null;
  location: string;
  host: string;
  category: string;
  capacity: number | null;
  confirmed: number;
  pending: number;
  waitlisted: number;
  registrations: RecentRegistration[];
  slug: string;
}) {
  const recent = registrations.slice(0, 3);
  const statusMeta: Record<string, { label: string; tone: BadgeTone }> = {
    confirmed: { label: "확정", tone: "positive" },
    pending: { label: "승인 대기", tone: "warning" },
    waitlisted: { label: "대기", tone: "informative" },
    rejected: { label: "거절", tone: "critical" },
    cancelled: { label: "취소", tone: "neutral" },
  };

  return <div className="event-overview">
    <div className="event-overview-stats">
      <div className="event-overview-stat is-positive"><b>{confirmed}</b><Badge tone="positive">확정</Badge></div>
      <div className="event-overview-stat is-warning"><b>{pending}</b><Badge tone="warning">승인 대기</Badge></div>
      <div className="event-overview-stat is-informative"><b>{waitlisted}</b><Badge tone="informative">대기자</Badge></div>
    </div>

    <div className="event-overview-secondary">
      <div className="event-overview-card event-overview-info">
        <header><span>행사 정보</span>{category && <Badge tone="brand">{category}</Badge>}</header>
        <dl>
          <div><dt>일시</dt><dd>{startsAt}{endsAt ? ` — ${endsAt}` : ""}</dd></div>
          <div><dt>장소</dt><dd>{location || "온라인"}</dd></div>
          <div><dt>주최</dt><dd>{host}</dd></div>
          {capacity && <div><dt>정원</dt><dd>{capacity}명</dd></div>}
        </dl>
      </div>

      <div className="event-overview-card">
        <header><span>최근 신청</span><Link href={`/my/events/${slug}`}>전체 보기 →</Link></header>
        {recent.length ? <ul className="event-overview-recent">
          {recent.map((item) => {
            const meta = statusMeta[item.status] ?? { label: "확인 필요", tone: "neutral" as const };
            return <li key={item.id}><i>{item.applicant_name.slice(0, 1)}</i><div><strong>{item.applicant_name}</strong><span>{item.applicant_email}</span></div><Badge tone={meta.tone}>{meta.label}</Badge></li>;
          })}
        </ul> : <p className="event-overview-empty">아직 신청자가 없습니다.</p>}
      </div>
    </div>

    <div className="event-overview-actions">
      <Link href={`/my/events/${slug}`} className="button">신청자 관리</Link>
      <Link href={`/events/${slug}`} target="_blank" className="button-soft">공개 페이지 보기 ↗</Link>
    </div>
  </div>;
}
