import Link from "next/link";
import { Footer, Header, ImageCard, SectionHeader } from "@/components/site-shell";
import { LiveFeatureRanking, type RankedFeatureItem } from "@/components/live-feature-ranking";
import { HomeOpportunityBanner, type HomeOpportunitySlide } from "@/components/home-opportunity-banner";
import { ProductSquareRail, type ProductSquareRailItem } from "@/components/product-square-rail";
import { FounderInterviewRail, type FounderInterviewRailItem } from "@/components/founder-interview-rail";
import { FreshProductRail } from "@/components/fresh-product-rail";
import { getCatalog, getEvents, getFeatures, getPartners, getSupportPrograms } from "@/lib/data";
import { FounderCard } from "@/components/founder-card";
import { Badge } from "@/components/badge";
import { formatMonthDayKst } from "@/lib/datetime";

const dateLabel = formatMonthDayKst;
const dday = (date: string) => Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000));
const isSupportProgramOpen = (closeAt: string) => new Date(`${closeAt}T23:59:59+09:00`).getTime() >= Date.now();
const isWithinLastWeek = (date?: string) => Boolean(date && new Date(date).getTime() >= Date.now() - 7 * 86_400_000);

export default async function Home() {
  const { brands, products, founders } = await getCatalog();
  const [events, supportPrograms, features, partners] = await Promise.all([getEvents(), getSupportPrograms(), getFeatures(), getPartners()]);
  const openSupportPrograms = supportPrograms.filter((program) => isSupportProgramOpen(program.closeAt));
  const featuredProducts = products.filter((product) => product.isFeatured);
  const editorPickProducts = featuredProducts.length > 0
    ? featuredProducts.slice(0, 6)
    : [...products].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)).slice(0, 3);
  const editorPickSlugs = new Set(editorPickProducts.map((product) => product.slug));
  // 인터뷰 레일이 상단을 차지하면 프로덕트 픽 레일이 없으므로 전체 프로덕트를 최신순으로 노출
  const hasInterviews = features.some((feature) => feature.kind === "interview");
  const freshProducts = products
    .filter((product) => hasInterviews || !editorPickSlugs.has(product.slug))
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  const productRailItems: ProductSquareRailItem[] = editorPickProducts.map((product) => ({
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    heroUrl: product.heroUrl,
    category: product.category,
    brandName: brands.find((brand) => brand.slug === product.brandSlug)?.name ?? "FEATABLE",
  }));
  const interviewItems: FounderInterviewRailItem[] = features
    .filter((feature) => feature.kind === "interview")
    .sort((a, b) => {
      const curatedOrder = Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
      if (curatedOrder !== 0) return curatedOrder;
      if (a.isFeatured && b.isFeatured) {
        return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
      }
      return (b.viewCount ?? 0) - (a.viewCount ?? 0)
        || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    })
    .slice(0, 6)
    .map((feature) => {
      const founder = founders.find((item) => item.slug === feature.founderSlug);
      const brand = brands.find((item) => item.slug === feature.brandSlug);
      return {
        slug: feature.slug,
        hookIntro: feature.hookIntro,
        title: feature.title,
        label: feature.hookLabel || [brand?.name, founder?.name].filter(Boolean).join(" ") || "Featable",
        coverUrl: feature.coverUrl,
        // 훅 문구를 비워두면 표지 이미지에 이미 글자가 있다는 뜻으로 보고 겹쳐 쓰지 않는다
        showOverlay: Boolean(feature.hookIntro || feature.hookLabel),
      };
    });
  const opportunitySlides: HomeOpportunitySlide[] = [
    ...[...openSupportPrograms]
      .sort((a, b) => a.closeAt.localeCompare(b.closeAt))
      .slice(0, 2)
      .map((program) => ({
        href: `/support/${program.slug}`,
        type: "지원사업" as const,
        title: program.name,
        detail: `${program.agency} · ${program.target}${program.amount ? ` · ${program.amount}` : ""}`,
        badge: `D-${dday(program.closeAt)}`,
      })),
    ...[...events]
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 3)
      .map((event) => ({
        href: `/events/${event.slug}`,
        type: "행사" as const,
        title: event.name,
        detail: `${event.host} · ${event.location}${event.fee ? ` · ${event.fee}` : ""}`,
        badge: dateLabel(event.startsAt),
        imageUrl: event.coverUrl,
      })),
  ];
  const productRankingItems: RankedFeatureItem[] = products.map((product) => {
    const founder = founders.find((item) => item.slug === product.founderSlug);
    const brand = brands.find((item) => item.slug === product.brandSlug);
    return { slug: product.slug, title: product.name, coverUrl: product.heroUrl, brandName: brand?.name ?? "FEATABLE", founderName: founder?.name ?? "Founder", category: product.category, viewCount: product.viewCount ?? 0 };
  });
  const featureKindLabel: Record<string, string> = { interview: "인터뷰", "brand-story": "브랜드", "case-study": "팀", "product-feature": "제품", qna: "노하우", update: "트렌드" };
  const featureRankingItems: RankedFeatureItem[] = features.map((feature) => {
    const founder = founders.find((item) => item.slug === feature.founderSlug);
    const brand = brands.find((item) => item.slug === feature.brandSlug);
    return { slug: feature.slug, title: feature.title, coverUrl: feature.coverUrl, brandName: brand?.name ?? "FEATABLE", founderName: founder?.name ?? "Founder", category: featureKindLabel[feature.kind] ?? feature.kind, viewCount: feature.viewCount ?? 0 };
  });
  const weeklyBuilders = founders
    .map((founder) => {
      const founderBrands = brands.filter((brand) => brand.founderSlug === founder.slug);
      const founderProducts = products.filter((product) => product.founderSlug === founder.slug);
      const founderFeatures = features.filter((feature) => feature.founderSlug === founder.slug);
      const recentBrands = founderBrands.filter((brand) => isWithinLastWeek(brand.publishedAt));
      const recentProducts = founderProducts.filter((product) => isWithinLastWeek(product.publishedAt));
      const recentFeatures = founderFeatures.filter((feature) => isWithinLastWeek(feature.publishedAt));
      const recentActivityCount = recentBrands.length + recentProducts.length + recentFeatures.length;
      const totalViews = [...founderProducts, ...founderFeatures].reduce((sum, item) => sum + (item.viewCount ?? 0), 0);

      return {
        founder,
        score: recentActivityCount * 1_000_000 + totalViews * 10 + founderProducts.length * 100 + founderBrands.length,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return (
    <>
      <Header />
      <main>
        <HomeOpportunityBanner slides={opportunitySlides} />

        {interviewItems.length > 0 && <section className="shell section home-interview-section home-interview-section-first">
          <FounderInterviewRail items={interviewItems} />
        </section>}

        <section className="shell live-stage">
          <div className="live-main">
            {freshProducts.length > 0 ? <div className="fresh-products-panel">
              <FreshProductRail header={<SectionHeader title="새로 등록된 프로덕트" href={null} />} showControls={freshProducts.length > 2}>
                {freshProducts.slice(0, 10).map((product, index) => {
                  const brand = brands.find((item) => item.slug === product.brandSlug);
                  const founder = founders.find((item) => item.slug === product.founderSlug);
                  return <Link href={`/products/${product.slug}`} className="product-card fresh-product-card commerce-card" key={product.slug}><div className="product-image-wrap"><ImageCard src={product.heroUrl} alt={product.name} /><span className="media-chip is-soft is-bottom-left">{product.category}</span>{index < 2 && <span className="media-chip is-dark is-top-left">NEW</span>}</div><div className="card-body"><div className="product-brand-line">{brand?.logoUrl ? <img src={brand.logoUrl} alt="" /> : <span className="brand-line-fallback" aria-hidden="true">{(brand?.name ?? "·").slice(0, 1)}</span>}<span>{brand?.name}</span><em>조회 {(product.viewCount ?? 0).toLocaleString("ko-KR")}</em></div><h3>{product.name}</h3><p>{product.tagline}</p><div className="product-meta-row"><span className="person-line"><span className="avatar tiny">{founder?.avatarUrl ? <img src={founder.avatarUrl} alt="" /> : <span className="avatar-fallback" aria-hidden="true">{(founder?.name ?? "·").slice(0, 1)}</span>}</span>{founder?.name}</span>{product.price ? <strong>{product.price}</strong> : <strong className="meta-cta">피쳐 보기 →</strong>}</div></div></Link>;
                })}
              </FreshProductRail>
            </div> : <ProductSquareRail items={productRailItems} />}
          </div>

          <LiveFeatureRanking productItems={productRankingItems} featureItems={featureRankingItems} />
        </section>

        <section className="shell section weekly-builders-section">
          <div className="weekly-builders-heading">
            <div><h2>이번 주 주목할 빌더</h2></div>
            <p>새로운 것을 공개하고 사람들의 관심을 받은 Founder를 소개합니다.</p>
          </div>
          <div className="founder-spotlight-grid">
            {weeklyBuilders.map((builder) => {
              return (
                <FounderCard
                  key={builder.founder.slug}
                  founder={builder.founder}
                />
              );
            })}
          </div>
        </section>

        {openSupportPrograms.length > 0 && <section className="shell section opportunity-section">
          <SectionHeader title="마감 임박 지원사업" href="/support" />
          <div className="opportunity-card-grid">
            {[...openSupportPrograms].sort((a, b) => a.closeAt.localeCompare(b.closeAt)).slice(0, 4).map((program) => <Link className="opportunity-card" href={`/support/${program.slug}`} key={program.slug}><div><Badge tone="neutral" variant="weak">지원사업</Badge><strong>D-{dday(program.closeAt)}</strong></div><h3>{program.name}</h3><p>{program.agency}</p><span>{program.target} · {program.region}</span></Link>)}
          </div>
        </section>}

        <section className="shell section opportunity-section">
          <SectionHeader title="다가오는 행사" href="/events" />
          <div className="opportunity-card-grid">
            {[...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 4).map((event) => <Link className="opportunity-card home-event-card" href={`/events/${event.slug}`} key={event.slug}><div className="home-event-poster"><ImageCard src={event.coverUrl} alt={event.name} /><span className="media-chip is-dark is-top-left">{dateLabel(event.startsAt)}</span></div><h3>{event.name}</h3><p>{event.host}</p><span>{event.location}{event.fee ? ` · ${event.fee}` : ""}</span></Link>)}
          </div>
        </section>

        <section className="new-final-cta"><div className="shell"><div><h2>만드는 사람으로 발견되세요</h2><p>역할과 이야기를 담은 나만의 프로필 카드를 만들어보세요.</p></div><Link className="button" href="/submit">프로필 만들기 <span>→</span></Link></div></section>
      </main>
      <Footer partners={partners} />
    </>
  );
}
