"use client";

import Link from "next/link";

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

  return <div className="event-overview">
    <div className="event-overview-stats">
      <Link href={`/my/events/${slug}`} className="event-overview-stat is-positive"><b>{confirmed}</b><span>확정</span></Link>
      <Link href={`/my/events/${slug}`} className="event-overview-stat is-warning"><b>{pending}</b><span>승인 대기</span></Link>
      <Link href={`/my/events/${slug}`} className="event-overview-stat is-informative"><b>{waitlisted}</b><span>대기자</span></Link>
    </div>

    <div className="event-overview-card">
      <header><span>행사 정보</span></header>
      <dl>
        <div><dt>일시</dt><dd>{startsAt}{endsAt ? ` — ${endsAt}` : ""}</dd></div>
        <div><dt>장소</dt><dd>{location || "온라인"}</dd></div>
        <div><dt>주최</dt><dd>{host}</dd></div>
        {category && <div><dt>분류</dt><dd>{category}</dd></div>}
        {capacity && <div><dt>정원</dt><dd>{capacity}명</dd></div>}
      </dl>
    </div>

    <div className="event-overview-card">
      <header><span>최근 신청</span><Link href={`/my/events/${slug}`}>전체 보기 →</Link></header>
      {recent.length ? <ul className="event-overview-recent">
        {recent.map((item) => <li key={item.id}><i>{item.applicant_name.slice(0, 1)}</i><div><strong>{item.applicant_name}</strong><span>{item.applicant_email}</span></div><em data-status={item.status}>{item.status === "confirmed" ? "확정" : item.status === "pending" ? "대기" : item.status === "waitlisted" ? "대기자" : "거절"}</em></li>)}
      </ul> : <p className="event-overview-empty">아직 신청자가 없습니다.</p>}
    </div>

    <div className="event-overview-actions">
      <Link href={`/my/events/${slug}`} className="button">신청자 관리</Link>
      <Link href={`/events/${slug}`} target="_blank" className="button button-soft">공개 페이지 보기 ↗</Link>
    </div>
  </div>;
}