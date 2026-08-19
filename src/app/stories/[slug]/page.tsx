import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Footer, Header } from "@/components/site-shell";
import { FeatureActions } from "@/components/feature-actions";
import { Comments } from "@/components/comments";
import { FeatureViewMetric } from "@/components/view-tracker";
import { brands, features, founders, partners, products } from "@/lib/mock";

const kindLabel = {
  interview: "FOUNDER INTERVIEW",
  "brand-story": "BRAND STORY",
  "product-feature": "PRODUCT FEATURE",
  launch: "LAUNCH STORY",
  update: "UPDATE",
  "case-study": "CASE STUDY",
  qna: "Q&A",
} as const;

export default async function StoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = features.find((item) => item.slug === slug);
  if (!feature) notFound();

  const founder = founders.find((item) => item.slug === feature.founderSlug);
  const brand = brands.find((item) => item.slug === feature.brandSlug);
  const product = products.find((item) => item.brandSlug === feature.brandSlug);
  const score = [...slug].reduce((total, character) => total + character.charCodeAt(0), 0);
  const discoveryCount = feature.viewCount ?? 0;
  const interestCount = 620 + (score % 780);
  const cheerCount = 89 + (score % 260);

  return (
    <>
      <Header />
      <main className="feature-project-page">
        <section className="shell feature-brief-wrap">
          <div className="feature-brief-hero">
            <div className="feature-brief-copy">
              <div className="feature-brief-brand">
                <img src={brand?.logoUrl ?? founder?.avatarUrl} alt="" />
                <div><span>FEATURED BY</span><Link href={brand ? `/brands/${brand.slug}` : "#"}>{brand?.name ?? founder?.name}</Link></div>
              </div>
              <p className="feature-brief-kicker">{kindLabel[feature.kind]}</p>
              <h1>{feature.title}</h1>
              <p className="feature-brief-excerpt">{feature.excerpt}</p>

              <div className="feature-brief-metrics">
                <FeatureViewMetric slug={feature.slug} initialCount={discoveryCount} />
                <div><strong>{interestCount.toLocaleString()}</strong><span>관심 있게 본 사람</span></div>
                <div><strong>{cheerCount.toLocaleString()}</strong><span>Founder 응원</span></div>
              </div>
              <FeatureActions title={feature.title} initialInterest={interestCount} initialCheers={cheerCount} />
            </div>

            <div className="feature-brief-media">
              <img src={feature.coverUrl} alt={feature.title} />
              <span>FEATABLE PICK · {new Date(feature.publishedAt).toLocaleDateString("ko-KR")}</span>
            </div>
          </div>

          <div className="feature-summary-strip">
            <div className="feature-summary-label"><span>✦</span><strong>3줄 브리핑</strong><small>핵심만 먼저 보기</small></div>
            <div><b>01</b><p><strong>{brand?.name ?? "새로운 팀"}이 해결하는 문제</strong><span>{brand?.problem ?? feature.excerpt}</span></p></div>
            <div><b>02</b><p><strong>지금 주목해야 하는 이유</strong><span>{feature.excerpt}</span></p></div>
            <div><b>03</b><p><strong>만든 사람의 관점</strong><span>{founder?.headline ?? "제품 뒤에 있는 사람의 이야기를 확인해보세요."}</span></p></div>
          </div>

          <div id="cheers" className="feature-social-proof">
            <div className="supporter-faces">{[1, 2, 3].map((item) => <img src={`https://picsum.photos/seed/supporter-${slug}-${item}/80/80`} alt="" key={item} />)}<span>+{cheerCount - 3}</span></div>
            <p><strong>{cheerCount}명</strong>이 이 Founder의 다음을 기다리고 있어요.</p>
            <span>조회수는 실시간 랭킹에 반영됩니다.</span>
          </div>
        </section>

        <nav className="feature-content-tabs"><div className="shell"><a className="active" href="#story">스토리</a><a href="#founder">Founder</a><a href="#product">프로덕트</a><a href="#cheers">응원</a></div></nav>

        <section id="story" className="shell feature-story-layout">
          <article className="feature-long-article">
            <header><p>{kindLabel[feature.kind]}</p><h2>{feature.title}</h2><span>{new Date(feature.publishedAt).toLocaleDateString("ko-KR")} · FEATABLE</span></header>
            <p className="feature-lead">{feature.excerpt}</p>
            <img className="feature-article-cover" src={feature.coverUrl} alt="" />

            {feature.body.map((block, index) => block.type === "text" ? <section key={`${block.type}-${index}`}>{block.heading && <h3>{block.heading}</h3>}<p>{block.body}</p></section> : <figure key={`${block.type}-${index}`}><img src={block.src} alt={block.alt} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>)}

            {brand && <section className="feature-editorial-section"><span>THE QUESTION</span><h3>어떤 문제에서<br />이 브랜드가 시작됐을까?</h3><p>{brand.problem ?? brand.description}</p><blockquote>“{brand.tagline}”</blockquote></section>}
            {founder && <section id="founder" className="feature-founder-quote"><img src={founder.avatarUrl} alt={founder.name} /><div><span>FOUNDER</span><h3>{founder.name}</h3><blockquote>“{founder.headline}”</blockquote><p>{founder.bio}</p></div></section>}
            {product && <section id="product" className="feature-related-product"><p>RELATED PRODUCT</p><Link href={`/products/${product.slug}`}><img src={product.heroUrl} alt="" /><div><Badge>{product.category}</Badge><h3>{product.name}</h3><span>{product.tagline}</span><strong>제품 자세히 보기 →</strong></div></Link></section>}
          </article>

          <aside className="feature-article-aside"><div><p>FEATURED</p><strong>{brand?.name ?? "FEATABLE"}</strong><span>{founder?.name} Founder</span></div><div><p>DISCOVERED</p><strong>{discoveryCount.toLocaleString()}</strong><span>people</span></div><a href="#comments">Founder 응원하기 →</a></aside>
        </section>

        <Comments type="feature" slug={feature.slug} />
      </main>
      <Footer partners={partners} />
    </>
  );
}
