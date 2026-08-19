import { Footer, Header } from "@/components/site-shell";
import { FeatureCard } from "@/components/content-cards";
import { features, partners } from "@/lib/mock";
export default function StoriesPage() { return <><Header /><main className="shell listing-page"><div className="listing-heading"><div><p className="eyebrow">STORIES & INTERVIEWS</p><h1>스토리</h1><p>제품 뒤에 있는 사람과 그들이 시작한 이유를 읽어보세요.</p></div></div><div className="story-list-grid">{features.map((feature) => <FeatureCard feature={feature} key={feature.slug} />)}</div></main><Footer partners={partners} /></>; }
