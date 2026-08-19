import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Footer, Header } from "@/components/site-shell";
import { features, partners } from "@/lib/mock";
import { getCatalog } from "@/lib/data";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { brands, products } = await getCatalog();
  const product = products.find((p) => p.slug === slug);
  if (!product) return {};
  const brand = brands.find((b) => b.slug === product.brandSlug);
  return {
    title: `${product.name} — ${product.tagline}`,
    description: `${product.tagline}${brand ? ` | ${brand.name}` : ""} | ${product.solution}`.slice(0, 160),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.tagline,
      url: `/products/${product.slug}`,
      images: [{ url: product.heroUrl }],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { brands, founders, products } = await getCatalog();
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();

  const brand = brands.find((item) => item.slug === product.brandSlug);
  const founder = founders.find((item) => item.slug === product.founderSlug);
  const relatedFeatures = features.filter((item) => product.relatedFeatureSlugs?.includes(item.slug));

  return (
    <>
      <Header />
      <main className="commerce-product">
        <div className="shell product-breadcrumb">
          <Link href="/products">프로덕트</Link><span>›</span><Link href={`/brands/${brand?.slug}`}>{brand?.name}</Link><span>›</span><strong>{product.name}</strong>
        </div>

        <section className="shell commerce-summary">
          <div className="commerce-gallery">
            <img className="commerce-hero-image" src={product.heroUrl} alt={product.name} />
            <div className="commerce-thumbs">
              <button className="active"><img src={product.heroUrl} alt="대표 이미지" /></button>
              {product.images.map((src, index) => <button key={src}><img src={src} alt={`${product.name} 상세 이미지 ${index + 1}`} /></button>)}
            </div>
          </div>

          <div className="commerce-buy-panel">
            <div className="commerce-brand-line">
              <Link href={`/brands/${brand?.slug}`}><img src={brand?.logoUrl} alt="" />{brand?.name}<span>›</span></Link>
              <button aria-label="관심 제품에 추가">♡</button>
            </div>
            <Badge tone="orange">{product.category}</Badge>
            <h1>{product.name}</h1>
            <p className="commerce-tagline">{product.tagline}</p>
            <div className="commerce-social-proof"><strong>★ 4.9</strong><span>사용자 피드백 28</span><span>조회 {product.viewCount?.toLocaleString()}</span></div>
            {product.price && <div className="commerce-price"><span>시작 가격</span><strong>{product.price}</strong></div>}
            <div className="commerce-founder-mini"><img src={founder?.avatarUrl} alt="" /><div><span>이 제품을 만든 사람</span><strong>{founder?.name} Founder</strong></div><Link href={`/brands/${brand?.slug}`}>프로필 보기 →</Link></div>
            <div className="commerce-actions">
              {product.officialUrl && <a className="button" href={product.officialUrl}>공식 사이트에서 보기 <span>↗</span></a>}
              <button className="commerce-share">공유</button>
            </div>
            <p className="commerce-notice">Featable은 제품과 창업가를 발견할 수 있도록 연결합니다. 구매와 이용 조건은 공식 사이트에서 확인해주세요.</p>
          </div>
        </section>

        <nav className="product-detail-tabs">
          <div className="shell"><a className="active" href="#story">상세 스토리</a><a href="#features">주요 기능</a><a href="#founder">만든 사람</a><a href="#mentor">Mentor&apos;s Note</a></div>
        </nav>

        <section id="story" className="commerce-detail-wrap">
          <div className="commerce-story-canvas">
            <header className="commerce-story-opening">
              <span>PRODUCT STORY</span>
              <p>흩어진 생각이<br />팀의 다음 실행이 되는 순간</p>
              <h2>{product.name}</h2>
              <div className="opening-scroll">SCROLL TO DISCOVER <i>↓</i></div>
            </header>

            <section className="commerce-dark-visual">
              <img src={product.heroUrl} alt={product.name} />
              <div />
              <span>MEET THE PRODUCT</span>
              <h2>{product.tagline}</h2>
              <p>{product.solution}</p>
            </section>

            {product.story.map((block, index) =>
              block.type === "text" ? (
                <section className={`commerce-story-text story-tone-${(Math.floor(index / 2) % 3) + 1}`} key={`${block.type}-${index}`}>
                  <span>{String(Math.floor(index / 2) + 1).padStart(2, "0")} — STORY</span>
                  {block.heading && <h2>{block.heading}</h2>}
                  <p>{block.body}</p>
                </section>
              ) : (
                <figure className="commerce-story-image" key={`${block.type}-${index}`}>
                  <img src={block.src} alt={block.alt} />
                  {block.caption && <figcaption>{block.caption}</figcaption>}
                </figure>
              ),
            )}

            <section id="features" className="commerce-feature-section">
              <p className="commerce-section-label">CORE FEATURES</p>
              <h2>팀이 다시 정리에<br />시간을 쓰지 않도록</h2>
              <div className="commerce-feature-list">
                {product.features.map((feature, index) => <div key={feature}><strong>0{index + 1}</strong><h3>{feature}</h3><p>{index === 0 ? "대화의 핵심과 결정을 한눈에 확인합니다." : index === 1 ? "과거의 기록이 지금의 프로젝트와 연결됩니다." : "담당자와 다음 할 일이 자동으로 정리됩니다."}</p></div>)}
              </div>
            </section>

            <section id="founder" className="commerce-founder-story">
              <img src={founder?.avatarUrl} alt={founder?.name} />
              <div><p className="commerce-section-label">BEHIND THE PRODUCT</p><h2>제품 뒤에는<br />이 사람이 있습니다.</h2><blockquote>“{founder?.headline}”</blockquote><strong>{founder?.name}</strong><span>{brand?.name} Founder</span></div>
            </section>

            {product.mentorNote && <section id="mentor" className="commerce-mentor"><p className="commerce-section-label">MENTOR&apos;S NOTE</p><blockquote>“{product.mentorNote.comment}”</blockquote><div><strong>{product.mentorNote.mentorName}</strong><span>{product.mentorNote.mentorField} · FEATABLE MENTOR</span></div></section>}

            <section className="commerce-story-closing">
              <span>{brand?.name}</span>
              <h2>좋은 생각이<br />실제로 움직이기 시작하도록.</h2>
              <p>{product.tagline}</p>
              {product.officialUrl && <a className="button" href={product.officialUrl}>{product.name} 시작하기 <span>↗</span></a>}
            </section>
          </div>

          <aside className="commerce-story-aside">
            <p>STORY INDEX</p>
            <a href="#story">브랜드 스토리 <span>01</span></a>
            <a href="#features">주요 기능 <span>02</span></a>
            <a href="#founder">만든 사람 <span>03</span></a>
            <a href="#mentor">멘토 노트 <span>04</span></a>
          </aside>
        </section>

        {relatedFeatures.length > 0 && <section className="shell commerce-related"><p className="eyebrow">RELATED FEATURE</p><h2>이 제품의 더 깊은 이야기</h2>{relatedFeatures.map((feature) => <Link href={`/stories/${feature.slug}`} key={feature.slug}><img src={feature.coverUrl} alt="" /><div><Badge>{feature.kind}</Badge><h3>{feature.title}</h3><p>{feature.excerpt}</p></div><span>↗</span></Link>)}</section>}
      </main>
      <Footer partners={partners} />
    </>
  );
}
