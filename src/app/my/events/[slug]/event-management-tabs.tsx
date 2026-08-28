"use client";

import { useState, type ReactNode } from "react";

type ManagementTab = "attendees" | "announcements" | "settings";

const TABS: { id: ManagementTab; label: string }[] = [
  { id: "attendees", label: "신청자 관리" },
  { id: "announcements", label: "공지 메일" },
  { id: "settings", label: "행사 설정" },
];

export function EventManagementTabs({
  attendees,
  announcements,
  settings,
}: {
  attendees: ReactNode;
  announcements: ReactNode;
  settings: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<ManagementTab>("attendees");
  const panels: Record<ManagementTab, ReactNode> = { attendees, announcements, settings };

  return <section className="event-management-tabs">
    <nav className="event-management-tablist" aria-label="행사 관리 메뉴" role="tablist">
      {TABS.map((tab) => <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={activeTab === tab.id}
        className={activeTab === tab.id ? "is-active" : ""}
        onClick={() => setActiveTab(tab.id)}
      >{tab.label}</button>)}
    </nav>
    <div className="event-management-panel" role="tabpanel">
      {panels[activeTab]}
    </div>
  </section>;
}
