import Link from "next/link";
import { Footer, Header, ImageCard, SectionHeader } from "@/components/site-shell";
import { LiveFeatureRanking, type RankedFeatureItem } from "@/components/live-feature-ranking";
import { events, features, partners, supportPrograms } from "@/lib/mock";
import { getCatalog } from "@/lib/data";

const curationItems = [
  { label: "이번 주 스토리", seed: "curation-feature", href: "/stories" },
  { label: "대학생 창업가", seed: "curation-student", href: "/stories/student-founder-week", hot: true },
  { label: "막 나온 제품", seed: "curation-new-product", href: "/products" },
  { label: "100명의 팬", seed: "curation-fans", href: "/stories/first-100-users" },
  { label: "서울 밋업", seed: "curation-meetup", href: "/events" },
  { label: "마감 임박", seed: "curation-deadline", href: "/support" },
  { label: "작은 팀의 일", seed: "curation-small-team", href: "/stories/flow-small-team" },
  { label: "취향 발견", seed: "curation-taste", href: "/stories/mood-taste-map" },
  { label: "커뮤니티 픽", seed: "curation-community", href: "/communities" },
];

const dateLabel = (date: string) => new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(date));
const dday = (date: string) => Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000));

export default async function Home() {
  const { brands, products, founders } = await getCatalog();
  const mainFeature = features[5];
  const bannerFeature = features[4];
  const discoveryFeatures = [mainFeature, features[2], features[3], features[1]];
  const rankingItems: RankedFeatureItem[] = features.map((feature) => {
    const founder = founders.find((item) => item.slug === feature.founderSlug);
    const brand = brands.find((item) => item.slug === feature.brandSlug);
    const category = feature.kind === "interview" || feature.kind === "qna" || feature.kind === "update" ? "창업가" : feature.kind === "product-feature" || feature.kind === "launch" ? "제품" : "브랜드";
    return { slug: feature.slug, title: feature.title, coverUrl: feature.coverUrl, brandName: brand?.name ?? "FEATABLE", founderName: founder?.name ?? "Featable 에디터", category, viewCount: feature.viewCount ?? 0 };
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

        <section className="curation-rail-shell">
          <div className="shell curation-rail">
            {curationItems.map((item, index) => (
              <Link className="curation-bubble" href={item.href} key={item.label}>
                <span className={`curation-image curation-tone-${(index % 4) + 1}`}>
                  <img src={`https://picsum.photos/seed/${item.seed}/180/180`} alt="" />
                  {item.hot && <b>HOT</b>}
                </span>
                <strong>{item.label}</strong>
              </Link>
            ))}
            <Link className="curation-next" href="/stories" aria-label="큐레이션 더보기">→</Link>
          </div>
        </section>

        <section className="shell live-stage">
          <div className="live-main">
            <div className="stage-heading">
              <div className="stage-tabs"><Link className="active" href="/">오늘의 발견</Link><Link href="/stories">새로운 이야기</Link><Link href="/products">막 나온 제품</Link></div>
              <span>08.20 UPDATE</span>
            </div>
            <div className="discovery-feature-grid">
              {discoveryFeatures.map((feature, index) => (
                <Link className="discovery-feature-card" href={`/stories/${feature.slug}`} key={feature.slug}>
                  <div className="discovery-feature-image"><img src={feature.coverUrl} alt="" />{index === 0 && <span>추천</span>}</div>
                  <div className="discovery-feature-copy"><p>{feature.kind === "interview" ? "창업가 인터뷰" : "브랜드 스토리"} · 조회 {(feature.viewCount ?? 0).toLocaleString("ko-KR")}</p><h2>{feature.title}</h2><span>{feature.excerpt}</span></div>
                </Link>
              ))}
            </div>
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
