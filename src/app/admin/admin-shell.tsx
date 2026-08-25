"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "home" | "brand" | "product" | "story" | "board" | "calendar" | "support" | "partner" | "inbox" | "user" | "external";

const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: IconName; exact?: boolean }[] }[] = [
  { label: "개요", items: [
    { href: "/admin", label: "대시보드", icon: "home", exact: true },
    { href: "/admin/users", label: "유저", icon: "user" },
  ] },
  { label: "콘텐츠", items: [
    { href: "/admin/brands", label: "브랜드", icon: "brand" },
    { href: "/admin/products", label: "프로덕트", icon: "product" },
    { href: "/admin/stories", label: "스토리", icon: "story" },
    { href: "/admin/board", label: "게시글", icon: "board" },
  ] },
  { label: "큐레이션", items: [
    { href: "/admin/inquiries", label: "파트너 문의", icon: "partner" },
    { href: "/admin/submissions", label: "제안 검수", icon: "inbox" },
    { href: "/admin/events", label: "행사", icon: "calendar" },
    { href: "/admin/support", label: "지원사업", icon: "support" },
    { href: "/admin/partners", label: "파트너", icon: "partner" },
  ] },
];

function AdminIcon({ name }: { name: IconName }) {
  const common = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "home") return <svg {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></svg>;
  if (name === "brand") return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" /></svg>;
  if (name === "product") return <svg {...common}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" /><path d="m4.3 7.7 7.7 4.4 7.7-4.4M12 21v-8.9" /></svg>;
  if (name === "story") return <svg {...common}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
  if (name === "board") return <svg {...common}><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3V6a2 2 0 0 1 2-2Z" /><path d="M8 9h8M8 13h5" /></svg>;
  if (name === "calendar") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></svg>;
  if (name === "support") return <svg {...common}><path d="M12 22a9 9 0 1 0-9-9c0 2.2.8 4.2 2 5.8L4 22l3.3-1.1A9 9 0 0 0 12 22Z" /><path d="M9.4 10a2.7 2.7 0 1 1 4.1 2.3c-.9.5-1.5 1-1.5 2M12 18h.01" /></svg>;
  if (name === "partner") return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
  if (name === "inbox") return <svg {...common}><path d="M4 4h16v16H4z" /><path d="M4 14h4l2 3h4l2-3h4" /></svg>;
  if (name === "user") return <svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
  return <svg {...common}><path d="M14 3h7v7M10 14 21 3M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" /></svg>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand-lockup" href="/admin" aria-label="Featable 관리자 홈">
          <Image src="/featable-logo.png" alt="Featable" width={2061} height={385} priority />
          <span>관리자</span>
        </Link>
        <nav className="admin-side-nav" aria-label="관리자 메뉴">
          {NAV_GROUPS.map((group) => <div className="admin-nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return <Link key={item.href} href={item.href} className={active ? "active" : undefined}><AdminIcon name={item.icon} /><span>{item.label}</span></Link>;
            })}
          </div>)}
        </nav>
        <div className="admin-sidebar-foot">
          <Link href="/"><AdminIcon name="external" /><span>사이트 보기</span></Link>
          <small>FEATABLE ADMIN</small>
        </div>
      </aside>
      <div className="admin-workspace">{children}</div>
    </div>
  );
}
