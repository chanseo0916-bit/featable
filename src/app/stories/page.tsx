import Link from "next/link";
import { Footer, Header } from "@/components/site-shell";
import { getFeatures, getPartners } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";
import { ArticleCard, InterviewCard } from "./story-cards";

export const metadata = createPageMetadata({
  title: "창업가 인터뷰와 스토리",
  description:
    "제품을 만든 창업가의 고민과 시작을 담은 인터뷰와 스토리를 읽어보세요. 브랜드가 성장하는 과정과 배경을 만날 수 있습니다.",
  path: "/stories",
});

/** 목록 첫 화면에 걸어두는 최신 아티클 수. 나머지는 아카이브로 넘긴다 */
const ARTICLE_PREVIEW = 12;

export default async function StoriesPage() {
  const [features, partners] = await Promise.all([getFeatures(), getPartners()]);
  const interviews = features.filter((feature) => feature.kind === "interview");
  const articles = features.filter((feature) => feature.kind !== "interview");

  return <>
    <Header />
    <main className="shell listing-page stories-page">
      <div className="listing-heading">
        <div>
          <h1>스토리</h1>
          <p>제품 뒤에 있는 사람과 그들이 시작한 이유를 읽어보세요.</p>
        </div>
      </div>

      {interviews.length > 0 && <section className="stories-section">
        <header className="stories-section-head">
          <div>
            <p className="eyebrow">인터뷰</p>
            <h2>창업가 인터뷰</h2>
          </div>
          <span>직접 만든 사람에게 시작과 고비를 물었습니다.</span>
        </header>
        <div className="story-interview-grid">
          {interviews.map((feature) => <InterviewCard feature={feature} key={feature.slug} />)}
        </div>
      </section>}

      {articles.length > 0 && <section className="stories-section">
        <header className="stories-section-head">
          <div>
            <p className="eyebrow">아티큼</p>
            <h2>창업 아티클</h2>
          </div>
          {articles.length > ARTICLE_PREVIEW && (
            <Link className="stories-section-more" href="/stories/archive">
              전체 {articles.length}편 보기 <span aria-hidden="true">→</span>
            </Link>
          )}
        </header>
        <div className="story-article-grid">
          {articles.slice(0, ARTICLE_PREVIEW).map((feature) => <ArticleCard feature={feature} key={feature.slug} />)}
        </div>
      </section>}
    </main>
    <Footer partners={partners} />
  </>;
}
