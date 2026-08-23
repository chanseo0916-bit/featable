import { Footer, Header } from "@/components/site-shell";
import { FeatureCard } from "@/components/content-cards";
import { getFeatures, getPartners } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  title: "창업가 인터뷰와 스토리",
  description:
    "제품을 만든 창업가의 고민과 시작을 담은 인터뷰와 스토리를 읽어보세요. 브랜드가 성장하는 과정과 배경을 만날 수 있습니다.",
  path: "/stories",
});

export default async function StoriesPage() { const [features, partners] = await Promise.all([getFeatures(), getPartners()]); return <><Header /><main className="shell listing-page"><div className="listing-heading"><div><h1>스토리</h1><p>제품 뒤에 있는 사람과 그들이 시작한 이유를 읽어보세요.</p></div></div><div className="story-list-grid">{features.map((feature) => <FeatureCard feature={feature} key={feature.slug} />)}</div></main><Footer partners={partners} /></>; }
