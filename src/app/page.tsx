import Link from "next/link";
import { Badge, Footer, Header, ImageCard, SectionHeader } from "@/components/site-shell";
import { events, features, partners, supportPrograms } from "@/lib/mock";
import { getCatalog } from "@/lib/data";

const curationItems = [
  { label: "이번 주 피쳐", seed: "curation-feature", href: "/stories" },
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
  const rankedFeatures = [features[2], features[4], features[0], features[3], features[1]];
  const rankingViews = [18_742, 14_386, 11_204, 8_931, 6_507];
  const discoveryFeatures = [mainFeature, features[2], features[3], features[1]];
  const discoveryViews = [12_560, 9_841, 8_931, 6_507];

  return (
    <>
      <Header />
      <main>
        <section className="home-banner-wrap">
          <Link className="home-top-banner" href={`/stories/${bannerFeature.slug}`}>
            <img src={bannerFeature.coverUrl} alt="" />
            <div className="home-banner-shade" />
            <div className="home-banner-copy"><span>이번 주 추천 피쳐</span><h1>{bannerFeature.title}</h1><p>{bannerFeature.excerpt}</p><strong>자세히 보기 <i>→</i></strong></div>
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
                  <div className="discovery-feature-copy"><p>{feature.kind === "interview" ? "창업가 인터뷰" : "브랜드 피쳐"} · 조회 {discoveryViews[index].toLocaleString("ko-KR")}</p><h2>{feature.title}</h2><span>{feature.excerpt}</span></div>
                </Link>
              ))}
            </div>
          </div>

          <aside className="live-ranking">
            <div className="ranking-head"><h2>실시간 베스트 피쳐</h2><span className="live-dot">LIVE</span></div>
            <div className="ranking-tabs"><button className="active">전체</button><button>창업가</button><button>브랜드</button><button>제품</button></div>
            <ol className="ranking-list">
              {rankedFeatures.map((feature, index) => {
                const founder = founders.find((item) => item.slug === feature.founderSlug);
                const brand = brands.find((item) => item.slug === feature.brandSlug);
                return <li key={feature.slug}><Link href={`/stories/${feature.slug}`}><strong className="ranking-number">{index + 1}</strong><img src={feature.coverUrl} alt="" /><div><h3>{feature.title}</h3><div className="ranking-meta"><p>{brand?.name ?? "FEATABLE"} · {founder?.name ?? "에디터"}</p><strong>조회수 {rankingViews[index].toLocaleString("ko-KR")}</strong></div></div></Link></li>;
              })}
            </ol>
            <Link className="ranking-more" href="/stories">피쳐 랭킹 전체보기 <span>→</span></Link>
          </aside>
        </section>

        <section className="shell after-feed-search">
          <div><h2>찾고 있는 팀이 있나요?</h2><span>브랜드, 창업가, 제품과 기회를 한 번에 찾아보세요.</span></div>
          <form className="discovery-search" action="/search"><input name="q" placeholder="브랜드 · 창업가 · 제품 검색" /><button aria-label="검색">⌕</button></form>
        </section>

        <section className="shell section mz-curation-section">
          <SectionHeader title="지금 많이 보는 피쳐" href="/stories" />
          <div className="editorial-grid">
            {features.slice(2, 5).map((feature, index) => (
              <Link className={`editorial-card editorial-${index + 1}`} href={`/stories/${feature.slug}`} key={feature.slug}>
                <img src={feature.coverUrl} alt="" /><div className="editorial-overlay" /><span className="editorial-index">피쳐</span>
                <div><p>{index === 0 ? "팀과 일" : index === 1 ? "브랜드 이야기" : "창업가 인터뷰"} · 조회 {rankingViews[index + 1].toLocaleString("ko-KR")}</p><h3>{feature.title}</h3></div>
              </Link>
            ))}
          </div>
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

        <section className="opportunity-band">
          <div className="shell opportunity-grid">
            <div className="opportunity-copy"><h2>이번 주 놓치면<br />아쉬운 기회</h2><p>행사부터 지원사업까지 창업가에게 필요한 기회를 모았습니다.</p><Link href="/support">모든 기회 보기 →</Link></div>
            <div className="opportunity-list">
              {supportPrograms.slice(0, 2).map((program) => <Link href={`/support/${program.slug}`} key={program.slug}><span className="opportunity-day">D-{dday(program.closeAt)}</span><div><p>SUPPORT · {program.agency}</p><h3>{program.name}</h3><span>{program.target} · {program.region}</span></div><b>↗</b></Link>)}
              {events.slice(0, 2).map((event) => <Link href={`/events/${event.slug}`} key={event.slug}><span className="opportunity-day event-day">{dateLabel(event.startsAt)}</span><div><p>EVENT · {event.host}</p><h3>{event.name}</h3><span>{event.location} · {event.fee}</span></div><b>↗</b></Link>)}
            </div>
          </div>
        </section>

        <section className="new-final-cta"><div className="shell"><div><h2>만들고 있는 브랜드와 제품을 알리세요</h2><p>누구나 직접 등록하고 피쳐를 시작할 수 있습니다.</p></div><Link className="button" href="/submit">브랜드 올리기 <span>→</span></Link></div></section>
      </main>
      <Footer partners={partners} />
    </>
  );
}
