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
  const rankedFeatures = [features[2], features[4], features[0], features[3], features[1]];

  return (
    <>
      <Header />
      <main>
        <section className="discovery-head shell">
          <div className="discovery-title-row">
            <div>
              <p className="eyebrow">DISCOVER THE NEXT FOUNDERS</p>
              <h1>요즘 뜨는 창업가,<br /><em>여기서 먼저.</em></h1>
            </div>
            <p className="discovery-intro">제품보다 먼저 사람을 발견하고,<br />아직 유명하지 않은 가능성을 큐레이션합니다.</p>
          </div>
          <form className="discovery-search" action="/search">
            <input name="q" placeholder="어떤 창업가와 브랜드를 찾고 있나요?" />
            <span className="search-hint">브랜드 · 피쳐 · 제품 · 기회</span>
            <button aria-label="검색">⌕</button>
          </form>
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
            <Link className="spotlight-card" href={`/stories/${mainFeature.slug}`}>
              <ImageCard src={mainFeature.coverUrl} alt={mainFeature.title} />
              <div className="spotlight-shade" />
              <div className="spotlight-badges"><Badge tone="orange">EDITOR&apos;S PICK</Badge><span>지금 주목할 창업가</span></div>
              <div className="spotlight-copy"><p>이번 주, 캠퍼스에서 가장 빠르게 움직이는 팀들</p><h2>{mainFeature.title}</h2><span>피쳐 읽기 <b>↗</b></span></div>
              <div className="spotlight-count">01 <i>/</i> 05</div>
            </Link>
            <div className="spotlight-progress"><span /></div>
            <div className="mini-features">
              {features.slice(2, 5).map((feature, index) => (
                <Link href={`/stories/${feature.slug}`} key={feature.slug}><span>0{index + 2}</span><div><p>{feature.kind.replace("-", " ")}</p><h3>{feature.title}</h3></div><b>↗</b></Link>
              ))}
            </div>
          </div>

          <aside className="live-ranking">
            <div className="ranking-head"><div><p className="eyebrow">LIVE NOW</p><h2>실시간 베스트 피쳐</h2></div><span className="live-dot">LIVE</span></div>
            <div className="ranking-tabs"><button className="active">전체</button><button>창업가</button><button>브랜드</button><button>제품</button></div>
            <ol className="ranking-list">
              {rankedFeatures.map((feature, index) => {
                const founder = founders.find((item) => item.slug === feature.founderSlug);
                const brand = brands.find((item) => item.slug === feature.brandSlug);
                return <li key={feature.slug}><Link href={`/stories/${feature.slug}`}><strong>{index + 1}</strong><img src={feature.coverUrl} alt="" /><div><h3>{feature.title}</h3><p>{brand?.name ?? "FEATABLE"} · {founder?.name ?? "에디터"}</p></div><span className={index < 2 ? "rank-up" : "rank-stay"}>{index < 2 ? "↑" : "–"}</span></Link></li>;
              })}
            </ol>
            <Link className="ranking-more" href="/stories">피쳐 랭킹 전체보기 <span>→</span></Link>
          </aside>
        </section>

        <section className="shell section mz-curation-section">
          <SectionHeader eyebrow="FEATABLE CURATION" title="지금 이 흐름, 놓치지 마세요" href="/stories" />
          <div className="editorial-grid">
            {features.slice(2, 5).map((feature, index) => (
              <Link className={`editorial-card editorial-${index + 1}`} href={`/stories/${feature.slug}`} key={feature.slug}>
                <img src={feature.coverUrl} alt="" /><div className="editorial-overlay" /><span className="editorial-index">CURATION 0{index + 1}</span>
                <div><p>{index === 0 ? "작은 팀의 새로운 일 방식" : index === 1 ? "요즘 취향이 모이는 곳" : "첫 팬을 만드는 창업가"}</p><h3>{feature.title}</h3></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="shell section fresh-products">
          <SectionHeader eyebrow="JUST DROPPED" title="방금 세상에 나온 프로덕트" href="/products" />
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
            <div className="opportunity-copy"><p className="eyebrow">DON&apos;T MISS OUT</p><h2>이번 주,<br />놓치면 아쉬운 기회</h2><p>행사부터 지원사업까지 창업가에게 필요한 다음 기회만 모았어요.</p><Link href="/support">모든 기회 보기 →</Link></div>
            <div className="opportunity-list">
              {supportPrograms.slice(0, 2).map((program) => <Link href={`/support/${program.slug}`} key={program.slug}><span className="opportunity-day">D-{dday(program.closeAt)}</span><div><p>SUPPORT · {program.agency}</p><h3>{program.name}</h3><span>{program.target} · {program.region}</span></div><b>↗</b></Link>)}
              {events.slice(0, 2).map((event) => <Link href={`/events/${event.slug}`} key={event.slug}><span className="opportunity-day event-day">{dateLabel(event.startsAt)}</span><div><p>EVENT · {event.host}</p><h3>{event.name}</h3><span>{event.location} · {event.fee}</span></div><b>↗</b></Link>)}
            </div>
          </div>
        </section>

        <section className="new-final-cta"><div className="shell"><p>당신이 만들고 있는 것을<br />더 많은 사람에게 보여주세요.</p><h2>Every founder deserves<br />to be <em>featured.</em></h2><Link className="button" href="/submit">내 브랜드 올리기 <span>↗</span></Link></div></section>
      </main>
      <Footer partners={partners} />
    </>
  );
}
