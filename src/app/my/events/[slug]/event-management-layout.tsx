"use client";

import { useState, type ReactNode } from "react";

type MenuId = "overview" | "attendees" | "announcements" | "settings" | "cohosts";

const MENU: { id: MenuId; label: string; hint: string }[] = [
  { id: "overview", label: "개요", hint: "현황과 공개 페이지" },
  { id: "attendees", label: "신청자 관리", hint: "검색 · 승인 · 거절" },
  { id: "announcements", label: "공지 메일", hint: "운영 안내 발송" },
  { id: "settings", label: "행사 설정", hint: "정보 · 신청 방식" },
  { id: "cohosts", label: "공동 주최자", hint: "초대와 운영 권한" },
];

export function EventManagementLayout({
  overview,
  attendees,
  announcements,
  settings,
  cohosts,
}: {
  overview: ReactNode;
  attendees: ReactNode;
  announcements: ReactNode;
  settings: ReactNode;
  cohosts: ReactNode;
}) {
  const [active, setActive] = useState<MenuId>("overview");
  const panels: Record<MenuId, ReactNode> = { overview, attendees, announcements, settings, cohosts };

  return <div className="event-management-layout">
    <nav className="event-management-menu" aria-label="행사 관리">
      <p className="event-management-menu-eyebrow">행사 관리</p>
      <ul>
        {MENU.map((item) => <li key={item.id}>
          <button
            type="button"
            className={active === item.id ? "is-active" : ""}
            aria-current={active === item.id ? "page" : undefined}
            onClick={() => setActive(item.id)}
          >
            <b>{item.label}</b>
            <i>{item.hint}</i>
          </button>
        </li>)}
      </ul>
    </nav>
    <section className="event-management-pane">{panels[active]}</section>
  </div>;
}
