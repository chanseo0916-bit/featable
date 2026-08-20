import Link from "next/link";
import { NotificationCenter } from "@/components/notification-center";
import { LogoutButton } from "@/components/logout-button";
import { StudioBrand } from "@/components/site-shell";

export function StudioNav({
  active = "home",
  founder = false,
}: {
  active?: "home" | "profile" | "settings";
  founder?: boolean;
}) {
  return (
    <div className="publish-console-nav">
      <div className="shell">
        <StudioBrand />
        <nav aria-label="스튜디오 메뉴">
          <Link className={active === "home" ? "active" : ""} href="/my">홈</Link>
          {founder && <Link href="/my#brands">내 브랜드</Link>}
          {founder && <Link className={active === "profile" ? "active" : ""} href="/my/profile">내 팀 프로필</Link>}
          <Link className={active === "settings" ? "active" : ""} href="/my/settings">계정 설정</Link>
        </nav>
        <div className="studio-nav-actions">
          <NotificationCenter />
          <Link className="studio-exit-link" href="/">Featable 홈 ↗</Link>
          <LogoutButton variant="studio" />
        </div>
      </div>
    </div>
  );
}
