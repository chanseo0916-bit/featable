import Link from "next/link";
import type { Founder } from "@/lib/types";

/**
 * 파운더 스포트라이트 카드 — 인물 사진이 카드 배경으로 녹아드는 다크 카드.
 * 홈 '주목할 파운더', 프로필 편집 미리보기, 공개 프로필 히어로가 같은 비주얼 언어를 쓴다.
 */
export function FounderCard({
  founder,
  brandCount,
  productCount,
  viewCount,
}: {
  founder: Founder;
  brandCount: number;
  productCount: number;
  viewCount: number;
}) {
  return (
    <Link href={`/founders/${founder.slug}`} className="founder-spot-card">
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
        {founder.founderNumber != null && (
          <span className="founder-hero-id">FOUNDER ID · {String(founder.founderNumber).padStart(4, "0")}</span>
        )}
      </div>
      <div className="founder-spot-body">
        <h3>
          {founder.name}
          <span className="founder-spot-verified" title="Featable Founder" aria-label="인증된 파운더">✓</span>
        </h3>
        {founder.role && <strong className="founder-card-role">{founder.role}</strong>}
        <p>{founder.headline}</p>
        <div className="founder-spot-foot">
          <span>◈ 브랜드 {brandCount}</span>
          <span>◉ 조회 {viewCount.toLocaleString("ko-KR")}</span>
          <em className="founder-spot-cta">프로필 보기 →</em>
        </div>
      </div>
      <span className="sr-only">프로덕트 {productCount}개</span>
    </Link>
  );
}
