import Link from "next/link";
import { NotificationCenter } from "@/components/notification-center";
import { LogoutButton } from "@/components/logout-button";
import { StudioBrand } from "@/components/site-shell";

export function DashNav({
  active = "home",
  founder = false,
}: {
  active?: "home" | "profile" | "events" | "communities" | "partners" | "jobs" | "settings";
  founder?: boolean;
}) {
  return (
    <div className="publish-console-nav">
      <div className="shell">
        <StudioBrand />
        <nav aria-label="스튜디오 메뉴">
          <Link className={active === "home" ? "active" : ""} href="/my">홈</Link>
          <Link className={active === "events" ? "active" : ""} href="/my/events">내 행사</Link>
          <Link className={active === "communities" ? "active" : ""} href="/my/communities">내 커뮤니티</Link>
          <Link className={active === "partners" ? "active" : ""} href="/my/partners">내 파트너</Link>
          <Link className={active === "jobs" ? "active" : ""} href="/my/jobs">내 채용</Link>
          {founder && <Link href="/my#brands">내 브랜드</Link>}
          <Link className={active === "profile" ? "active" : ""} href="/my/profile">내 프로필 카드</Link>
          <Link className={active === "settings" ? "active" : ""} href="/my/settings">계정 설정</Link>
        </nav>
        <div className="dash-nav-actions">
          <NotificationCenter />
          <Link className="dash-exit-link" href="/">Featable 홈 ↗</Link>
          <LogoutButton variant="studio" />
        </div>
      </div>
    </div>
  );
}
