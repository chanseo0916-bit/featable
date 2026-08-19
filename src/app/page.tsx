import Link from "next/link";
import { Footer, Header, ImageCard, SectionHeader } from "@/components/site-shell";
import { LiveFeatureRanking, type RankedFeatureItem } from "@/components/live-feature-ranking";
import { DiscoveryStage, type DiscoveryTab } from "@/components/discovery-stage";
import type { DiscoveryBannerSlide } from "@/components/discovery-banner";
import { getCatalog, getEvents, getFeatures, getPartners, getSupportPrograms } from "@/lib/data";
import { FounderCard } from "@/components/founder-card";
import { HomeBannerCarousel, type HomeBannerSlide } from "@/components/home-banner-carousel";

const dateLabel = (date: string) => new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(date));
const dday = (date: string) => Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000));

export default async function Home() {
  const { brands, products, founders } = await getCatalog();
  const [events, supportPrograms, features, partners] = await Promise.all([getEvents(), getSupportPrograms(), getFeatures(), getPartners()]);
  const mainFeature = features[5];
  const bannerSlides: HomeBannerSlide[] = [features[4], features[5], features[2], features[3], features[1]].map((feature) => ({
    slug: feature.slug,
    title: feature.title,
    excerpt: feature.excerpt,
    coverUrl: feature.coverUrl,
  }));
  const discoveryFeatures = [mainFeature, features[2], features[3], features[1]];
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
        <HomeBannerCarousel slides={bannerSlides} />

        <section className="shell live-stage">
          <div className="live-main">
            <DiscoveryStage
              updateLabel={`${new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit" }).format(new Date()).replace(/\. ?/g, ".").replace(/\.$/, "")} UPDATE`}
              tabs={[
                {
                  key: "discover",
                  label: "오늘의 발견",
                  slides: discoveryFeatures.map((feature): DiscoveryBannerSlide => ({
                    href: `/stories/${feature.slug}`,
                    imageUrl: feature.coverUrl,
                    eyebrow: feature.kind === "interview" ? "창업가 인터뷰" : "브랜드 스토리",
                    title: feature.title,
                    subtitle: feature.excerpt,
                  })),
                },
                {
                  key: "new-stories",
                  label: "새로운 이야기",
                  slides: [...features]
                    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
                    .slice(0, 4)
                    .map((feature): DiscoveryBannerSlide => ({
                      href: `/stories/${feature.slug}`,
                      imageUrl: feature.coverUrl,
                      eyebrow: `NEW · ${dateLabel(feature.publishedAt)} 발행`,
                      title: feature.title,
                      subtitle: feature.excerpt,
                    })),
                },
                {
                  key: "new-products",
                  label: "막 나온 제품",
                  slides: products.slice(0, 4).map((product): DiscoveryBannerSlide => {
                    const brand = brands.find((item) => item.slug === product.brandSlug);
                    return {
                      href: `/products/${product.slug}`,
                      imageUrl: product.heroUrl,
                      eyebrow: `${product.category} · ${brand?.name ?? "FEATABLE"}`,
                      title: product.name,
                      subtitle: product.tagline,
                    };
                  }),
                },
              ] satisfies DiscoveryTab[]}
            />
          </div>

          <LiveFeatureRanking productItems={productRankingItems} featureItems={featureRankingItems} />
        </section>

        <section className="shell section fresh-products">
          <SectionHeader title="새로 등록된 프로덕트" href="/products" />
          <div className="product-grid">
            {products.map((product, index) => {
              const brand = brands.find((item) => item.slug === product.brandSlug);
              const founder = founders.find((item) => item.slug === product.founderSlug);
              return <Link href={`/products/${product.slug}`} className="product-card fresh-product-card commerce-card" key={product.slug}><div className="product-image-wrap"><ImageCard src={product.heroUrl} alt={product.name} /><span className="product-chip">{product.category}</span>{index < 2 && <span className="drop-label">NEW</span>}</div><div className="card-body"><div className="product-brand-line"><img src={brand?.logoUrl} alt="" /><span>{brand?.name}</span><em>조회 {(product.viewCount ?? 0).toLocaleString("ko-KR")}</em></div><h3>{product.name}</h3><p>{product.tagline}</p><div className="product-meta-row"><span className="person-line"><span className="avatar tiny"><img src={founder?.avatarUrl} alt="" /></span>{founder?.name}</span>{product.price ? <strong>{product.price}</strong> : <strong className="meta-cta">피쳐 보기 →</strong>}</div></div></Link>;
            })}
          </div>
        </section>

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

        <section className="new-final-cta"><div className="shell"><div><h2>만들고 있는 브랜드와 제품을 알리세요</h2><p>누구나 직접 등록하고 피쳐를 시작할 수 있습니다.</p></div><Link className="button" href="/submit">브랜드 올리기 <span>→</span></Link></div></section>
      </main>
      <Footer partners={partners} />
    </>
  );
}
