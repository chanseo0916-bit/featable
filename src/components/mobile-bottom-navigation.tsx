"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/components/mobile-bottom-navigation.module.css";

type NavigationItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  icon: React.ReactNode;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "홈",
    isActive: (pathname) => pathname === "/",
    icon: <path d="M3.5 10.4 12 3.5l8.5 6.9v9.1a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/products",
    label: "발견",
    isActive: (pathname) => ["/products", "/stories", "/brands", "/founders", "/events", "/support", "/communities", "/jobs", "/partners", "/search"].some((route) => pathname === route || pathname.startsWith(`${route}/`)),
    icon: <><circle cx="12" cy="12" r="8.5" /><path d="m14.8 9.2-1.9 3.7-3.7 1.9 1.9-3.7z" /></>,
  },
  {
    href: "/board",
    label: "게시판",
    isActive: (pathname) => pathname === "/board" || pathname.startsWith("/board/"),
    icon: <path d="M4 5.5h16v11H9l-5 4zM8 9h8M8 13h5" />,
  },
  {
    href: "/my",
    label: "마이",
    isActive: (pathname) => pathname === "/my" || pathname.startsWith("/my/"),
    icon: <><circle cx="12" cy="8.2" r="3.2" /><path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" /></>,
  },
];

function shouldHide(pathname: string) {
  if (["/admin", "/auth", "/invite", "/login", "/onboarding", "/submit"].some((route) => pathname === route || pathname.startsWith(`${route}/`))) return true;
  if (pathname === "/board/write") return true;
  if (pathname.startsWith("/my/")) return true;
  if (pathname.startsWith("/products/") || pathname.startsWith("/stories/")) return true;
  if (/^\/events\/[^/]+\/(apply|verify)$/.test(pathname)) return true;
  return pathname === "/partners/apply";
}

export function MobileBottomNavigation() {
  const pathname = usePathname();

  if (shouldHide(pathname)) return null;

  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      <nav className={styles.navigation} aria-label="모바일 주요 메뉴">
        <div className={styles.items}>
          {navigationItems.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link className={`${styles.item}${active ? ` ${styles.active}` : ""}`} href={item.href} aria-current={active ? "page" : undefined} key={item.href}>
                <svg aria-hidden="true" viewBox="0 0 24 24">{item.icon}</svg>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
