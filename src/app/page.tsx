import Link from "next/link";
import { Footer, Header, ImageCard, SectionHeader } from "@/components/site-shell";
import { LiveFeatureRanking, type RankedFeatureItem } from "@/components/live-feature-ranking";
import { DiscoveryBanner, type DiscoveryBannerSlide } from "@/components/discovery-banner";
import { events, features, partners, supportPrograms } from "@/lib/mock";
import { getCatalog } from "@/lib/data";

const dateLabel = (date: string) => new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(date));
const dday = (date: string) => Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000));

export default async function Home() {
  const { brands, products, founders } = await getCatalog();
  const mainFeature = features[5];
  const bannerFeature = features[4];
  const discoveryFeatures = [mainFeature, features[2], features[3], features[1]];
  const rankingItems: RankedFeatureItem[] = products.map((product) => {
    const founder = founders.find((item) => item.slug === product.founderSlug);
    const brand = brands.find((item) => item.slug === product.brandSlug);
    return { slug: product.slug, title: product.name, coverUrl: product.heroUrl, brandName: brand?.name ?? "FEATABLE", founderName: founder?.name ?? "Founder", category: product.category, viewCount: product.viewCount ?? 0 };
  });

  return (
    <>
      <Header />
      <main>
        <section className="home-banner-wrap">
          <Link className="home-top-banner" href={`/stories/${bannerFeature.slug}`}>
            <img src={bannerFeature.coverUrl} alt="" />
            <div className="home-banner-shade" />
            <div className="home-banner-copy"><span>이번 주 추천 스토리</span><h1>{bannerFeature.title}</h1><p>{bannerFeature.excerpt}</p><strong>자세히 보기 <i>→</i></strong></div>
            <div className="home-banner-control"><span className="home-banner-arrow">‹</span><span><b>01</b> / 05</span><span className="home-banner-arrow">›</span></div>
          </Link>
        </section>

        <section className="shell live-stage">
          <div className="live-main">
            <div className="stage-heading">
              <div className="stage-tabs"><Link className="active" href="/">오늘의 발견</Link><Link href="/stories">새로운 이야기</Link><Link href="/products">막 나온 제품</Link></div>
              <span>08.20 UPDATE</span>
            </div>
            <DiscoveryBanner
              slides={discoveryFeatures.map((feature): DiscoveryBannerSlide => ({
                href: `/stories/${feature.slug}`,
                imageUrl: feature.coverUrl,
                eyebrow: feature.kind === "interview" ? "창업가 인터뷰" : "브랜드 스토리",
                title: feature.title,
                subtitle: feature.excerpt,
              }))}
            />
          </div>

          <LiveFeatureRanking items={rankingItems} />
        </section>

        <section className="shell section fresh-products">
          <SectionHeader title="새로 등록된 프로덕트" href="/products" />
          <div className="product-grid">
            {products.map((product, index) => {
              const brand = brands.find((item) => item.slug === product.brandSlug);
              const founder = founders.find((item) => item.slug === product.founderSlug);
              return <Link href={`/products/${product.slug}`} className="product-card fresh-product-card" key={product.slug}><div className="product-image-wrap"><ImageCard src={product.heroUrl} alt={product.name} /><span className="drop-label">NEW {String(index + 1).padStart(2, "0")}</span><span className="heart-label">♡</span></div><div className="card-body"><div className="card-meta"><span>{product.category}</span><span>{brand?.name}</span></div><h3>{product.name}</h3><p>{product.tagline}</p><div className="person-line"><span className="avatar tiny"><img src={founder?.avatarUrl} alt="" /></span><span>{founder?.name} Founder</span></div></div></Link>;
            })}
          </div>
        </section>

        <section className="shell section opportunity-section">
          <SectionHeader title="이번 주 행사·지원사업" href="/support" />
          <div className="opportunity-card-grid">
            {supportPrograms.slice(0, 2).map((program) => <Link className="opportunity-card" href={`/support/${program.slug}`} key={program.slug}><div><span className="opportunity-type">지원사업</span><strong>D-{dday(program.closeAt)}</strong></div><h3>{program.name}</h3><p>{program.agency}</p><span>{program.target} · {program.region}</span></Link>)}
            {events.slice(0, 2).map((event) => <Link className="opportunity-card" href={`/events/${event.slug}`} key={event.slug}><div><span className="opportunity-type">행사</span><strong>{dateLabel(event.startsAt)}</strong></div><h3>{event.name}</h3><p>{event.host}</p><span>{event.location} · {event.fee}</span></Link>)}
          </div>
        </section>

        <section className="new-final-cta"><div className="shell"><div><h2>만들고 있는 브랜드와 제품을 알리세요</h2><p>누구나 직접 등록하고 피쳐를 시작할 수 있습니다.</p></div><Link className="button" href="/submit">브랜드 올리기 <span>→</span></Link></div></section>
      </main>
      <Footer partners={partners} />
    </>
  );
}
