import Link from "next/link";
import { Footer, Header, ImageCard, SectionHeader } from "@/components/site-shell";
import { LiveFeatureRanking, type RankedFeatureItem } from "@/components/live-feature-ranking";
import { HomeOpportunityBanner, type HomeOpportunitySlide } from "@/components/home-opportunity-banner";
import { ProductSquareRail, type ProductSquareRailItem } from "@/components/product-square-rail";
import { getCatalog, getEvents, getFeatures, getPartners, getSupportPrograms } from "@/lib/data";
import { FounderCard } from "@/components/founder-card";

const dateLabel = (date: string) => new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(date));
const dday = (date: string) => Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000));

export default async function Home() {
  const { brands, products, founders } = await getCatalog();
  const [events, supportPrograms, features, partners] = await Promise.all([getEvents(), getSupportPrograms(), getFeatures(), getPartners()]);
  const featuredProducts = products.filter((product) => product.isFeatured);
  const editorPickProducts = featuredProducts.length > 0
    ? featuredProducts.slice(0, 6)
    : [...products].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)).slice(0, 3);
  const editorPickSlugs = new Set(editorPickProducts.map((product) => product.slug));
  const freshProducts = products
    .filter((product) => !editorPickSlugs.has(product.slug))
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  const productRailItems: ProductSquareRailItem[] = editorPickProducts.map((product) => ({
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    heroUrl: product.heroUrl,
    category: product.category,
    brandName: brands.find((brand) => brand.slug === product.brandSlug)?.name ?? "FEATABLE",
  }));
  const opportunitySlides: HomeOpportunitySlide[] = [
    ...[...supportPrograms]
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

  return (
    <>
      <Header />
      <main>
        <HomeOpportunityBanner slides={opportunitySlides} />

        <section className="shell live-stage">
          <div className="live-main">
            <ProductSquareRail items={productRailItems} />
          </div>

          <LiveFeatureRanking productItems={productRankingItems} featureItems={featureRankingItems} />
        </section>

        {freshProducts.length > 0 && <section className="shell section fresh-products">
          <SectionHeader eyebrow="JUST IN" title="새로 등록된 프로덕트" href="/products" />
          <div className="product-grid">
            {freshProducts.map((product, index) => {
              const brand = brands.find((item) => item.slug === product.brandSlug);
              const founder = founders.find((item) => item.slug === product.founderSlug);
              return <Link href={`/products/${product.slug}`} className="product-card fresh-product-card commerce-card" key={product.slug}><div className="product-image-wrap"><ImageCard src={product.heroUrl} alt={product.name} /><span className="product-chip">{product.category}</span>{index < 2 && <span className="drop-label">NEW</span>}</div><div className="card-body"><div className="product-brand-line"><img src={brand?.logoUrl} alt="" /><span>{brand?.name}</span><em>조회 {(product.viewCount ?? 0).toLocaleString("ko-KR")}</em></div><h3>{product.name}</h3><p>{product.tagline}</p><div className="product-meta-row"><span className="person-line"><span className="avatar tiny"><img src={founder?.avatarUrl} alt="" /></span>{founder?.name}</span>{product.price ? <strong>{product.price}</strong> : <strong className="meta-cta">피쳐 보기 →</strong>}</div></div></Link>;
            })}
          </div>
        </section>}

        <section className="shell section">
          <SectionHeader eyebrow="MEET THE FOUNDERS" title="주목할 파운더" href="/brands" />
          <div className="founder-spotlight-grid">
            {founders.slice(0, 4).map((f) => {
              const fProducts = products.filter((p) => p.founderSlug === f.slug);
              return (
                <FounderCard
                  key={f.slug}
                  founder={f}
                  brandCount={f.brandSlugs.length}
                  productCount={fProducts.length}
                  viewCount={fProducts.reduce((sum, p) => sum + (p.viewCount ?? 0), 0)}
                />
              );
            })}
          </div>
        </section>

        <section className="shell section opportunity-section">
          <SectionHeader title="마감 임박 지원사업" href="/support" />
          <div className="opportunity-card-grid">
            {[...supportPrograms].sort((a, b) => a.closeAt.localeCompare(b.closeAt)).slice(0, 4).map((program) => <Link className="opportunity-card" href={`/support/${program.slug}`} key={program.slug}><div><span className="opportunity-type">지원사업</span><strong>D-{dday(program.closeAt)}</strong></div><h3>{program.name}</h3><p>{program.agency}</p><span>{program.target} · {program.region}</span></Link>)}
          </div>
        </section>

        <section className="shell section opportunity-section">
          <SectionHeader title="다가오는 행사" href="/events" />
          <div className="opportunity-card-grid">
            {[...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 4).map((event) => <Link className="opportunity-card" href={`/events/${event.slug}`} key={event.slug}><div><span className="opportunity-type">행사</span><strong>{dateLabel(event.startsAt)}</strong></div><h3>{event.name}</h3><p>{event.host}</p><span>{event.location} · {event.fee}</span></Link>)}
          </div>
        </section>

        <section className="new-final-cta"><div className="shell"><div><h2>만드는 사람으로 발견되세요</h2><p>역할과 이야기를 담은 나만의 프로필 카드를 만들어보세요.</p></div><Link className="button" href="/submit">프로필 만들기 <span>→</span></Link></div></section>
      </main>
      <Footer partners={partners} />
    </>
  );
}
