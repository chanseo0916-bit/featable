import { EntityCard } from "@/components/cards/entity-card";
import type { Feature } from "@/lib/types";
import { formatDateKst } from "@/lib/datetime";

/** 인터뷰 표지는 인스타 포스터 비율(630x850)로 들어온다 */
const INTERVIEW_RATIO = 0.74;

export function InterviewCard({ feature }: { feature: Feature }) {
  return (
    <EntityCard
      layout="image"
      className="story-interview-card"
      href={`/stories/${feature.slug}`}
      media={feature.coverUrl}
      mediaAlt={feature.title}
      ratio={INTERVIEW_RATIO}
      title={feature.title}
      description={feature.excerpt}
    />
  );
}

/**
 * 아티클은 표지가 없다(대부분 자동 생성 플레이스홀더). 의미 없는 이미지를 150장
 * 깔지 않고 텍스트 카드로 보여준다 — 주제 라벨이 표지보다 판단에 도움이 된다.
 */
export function ArticleCard({ feature }: { feature: Feature }) {
  return (
    <EntityCard
      layout="text"
      className="story-article-card"
      href={`/stories/${feature.slug}`}
      top={<span className="story-article-topic">{feature.primaryKeyword ?? "아티클"}</span>}
      title={feature.title}
      description={feature.excerpt}
      footerLeft={formatDateKst(feature.publishedAt)}
    />
  );
}
