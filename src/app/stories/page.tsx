import { Footer, Header } from "@/components/site-shell";
import { FeatureCard } from "@/components/content-cards";
import { getFeatures, getPartners } from "@/lib/data";
export default async function StoriesPage() { const [features, partners] = await Promise.all([getFeatures(), getPartners()]); return <><Header /><main className="shell listing-page"><div className="listing-heading"><div><p className="eyebrow">STORIES & INTERVIEWS</p><h1>스토리</h1><p>제품 뒤에 있는 사람과 그들이 시작한 이유를 읽어보세요.</p></div></div><div className="story-list-grid">{features.map((feature) => <FeatureCard feature={feature} key={feature.slug} />)}</div></main><Footer partners={partners} /></>; }
