import Link from "next/link";
import type { Founder } from "@/lib/types";
import { InteractiveProfileCard } from "@/components/interactive-profile-card";

/**
 * 파운더 스포트라이트 카드 — 인물 사진이 카드 배경으로 녹아드는 다크 카드.
 * 홈 '주목할 파운더', 프로필 편집 미리보기, 공개 프로필 히어로가 같은 비주얼 언어를 쓴다.
 */
export function FounderCard({
  founder,
}: {
  founder: Founder;
}) {
  return (
    <Link href={`/founders/${founder.slug}`} className="founder-card-interactive-link">
      <InteractiveProfileCard className="founder-spot-card">
      <div className="founder-spot-photo">
        {founder.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={founder.avatarUrl} alt={founder.name} />
        ) : (
          <div className="founder-spot-placeholder" aria-hidden>
            {founder.name?.slice(0, 1) || "F"}
          </div>
        )}
        <div className="founder-spot-fade" aria-hidden />
      </div>
      <div className="founder-spot-body">
        <h3>
          {founder.name}
          <span className="founder-spot-verified" title="Featable Founder" aria-label="인증된 파운더">✓</span>
        </h3>
        <strong className="founder-hero-role">{founder.role || "창업가"}</strong>
        <p>{founder.headline}</p>
      </div>
      <span className="sr-only">{founder.name} Founder 프로필 보기</span>
      </InteractiveProfileCard>
    </Link>
  );
}
