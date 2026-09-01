import { Footer, Header } from "@/components/site-shell";
import { FounderCard } from "@/components/founder-card";
import { getCatalog, getPartners } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  title: "창업가 발견",
  description:
    "무엇을 만들고 있는 사람인지로 창업가를 만나보세요. 브랜드와 프로덕트, 인터뷰까지 한 사람의 흐름을 따라갈 수 있습니다.",
  path: "/founders",
});

export default async function FoundersPage() {
  const [{ founders, brands, products }, partners] = await Promise.all([getCatalog(), getPartners()]);
  const ranked = [...founders].sort((a, b) => {
    const score = (slug: string) =>
      products.filter((product) => product.founderSlug === slug).reduce((sum, product) => sum + (product.viewCount ?? 0), 0);
    return score(b.slug) - score(a.slug);
  });

  return <>
    <Header />
    <main className="shell listing-page">
      <div className="listing-heading">
        <div>
          <p className="eyebrow">창업가</p>
          <h1>창업가</h1>
          <p>제품 뒤에 있는 사람들을 만나보세요.</p>
        </div>
      </div>
      {ranked.length > 0
        ? <div className="founder-spotlight-grid founder-directory-grid">{ranked.map((founder) => <FounderCard founder={founder} key={founder.slug} />)}</div>
        : <div className="my-event-empty"><strong>아직 공개된 창업가가 없어요.</strong><span>가장 먼저 프로필을 만들어보세요.</span></div>}
      <p className="founders-list-note">{brands.length}개 브랜드를 만드는 {ranked.length}명의 창업가</p>
    </main>
    <Footer partners={partners} />
  </>;
}
