import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Footer, Header } from "@/components/site-shell";
import { FeatureActions } from "@/components/feature-actions";
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
      <nav className="feature-top-tabs"><div className="shell"><a className="active" href="#story">스토리</a><a href="#updates">새소식 <span>4</span></a><a href="#cheers">응원 <span>{cheerCount}</span></a><a href="#community">커뮤니티 <span>36</span></a></div></nav>

      <main className="feature-project-page">
        <section className="shell feature-project-hero">
          <div className="feature-project-media">
            <div className="feature-main-cover"><img src={feature.coverUrl} alt={feature.title} /><button className="cover-prev" aria-label="이전 이미지">‹</button><button className="cover-next" aria-label="다음 이미지">›</button><span>1 / 4</span></div>

            <div className="feature-ai-summary">
              <div className="ai-summary-head"><strong><i>✦</i> AI 스토리 요약</strong><span>Beta</span></div>
              <div className="ai-summary-item"><b>01</b><div><strong>{brand?.name ?? "새로운 팀"}이 해결하는 문제</strong><p>{brand?.problem ?? feature.excerpt}</p></div></div>
              <div className="ai-summary-item"><b>02</b><div><strong>지금 주목해야 하는 이유</strong><p>{feature.excerpt}</p></div></div>
              <div className="ai-summary-item"><b>03</b><div><strong>만든 사람의 이야기</strong><p>{founder?.headline ?? "제품 뒤에 있는 사람의 진짜 이야기를 확인해보세요."}</p></div></div>
            </div>
          </div>

          <aside className="feature-project-panel">
            <div className="feature-maker"><img src={brand?.logoUrl ?? founder?.avatarUrl} alt="" /><Link href={brand ? `/brands/${brand.slug}` : "#"}>{brand?.name ?? founder?.name}<span>›</span></Link></div>
            <Badge tone="orange">{kindLabel[feature.kind]}</Badge>
            <h1>{feature.title}</h1>
            <p className="feature-project-excerpt">{feature.excerpt}</p>

            <FeatureViewMetric slug={feature.slug} initialCount={discoveryCount} />
            <div className="feature-project-numbers"><div><strong>{interestCount.toLocaleString()}</strong><span>명이 관심 있게 보고 있어요</span></div><div><strong>{cheerCount}</strong><span>명이 Founder를 응원했어요</span></div></div>
            <div className="feature-live-viewers"><span>👀</span>방문 조회수가 실시간 랭킹에 반영됩니다.</div>

            <div className="feature-value-list"><span>스토리</span><div><p><i>✓</i> Founder가 직접 검토한 브랜드 스토리</p><p><i>✓</i> 제품과 만든 사람을 한 번에 발견</p></div></div>

            <FeatureActions title={feature.title} initialInterest={interestCount} initialCheers={cheerCount} />

            <div id="cheers" className="feature-support-card"><div><strong>{cheerCount}명이 이 Founder를 응원했어요</strong><p>좋은 시도가 더 많은 사람에게 발견되도록 함께해주세요.</p></div><div className="supporter-faces">{[1, 2, 3].map((item) => <img src={`https://picsum.photos/seed/supporter-${slug}-${item}/80/80`} alt="" key={item} />)}<span>+{cheerCount - 3}</span></div></div>
          </aside>
        </section>

        <nav className="feature-content-tabs"><div className="shell"><a className="active" href="#story">스토리</a><a href="#founder">Founder</a><a href="#product">프로덕트</a><a href="#community">응원 메시지</a></div></nav>

        <section id="story" className="shell feature-story-layout">
          <article className="feature-long-article">
            <header><p>{kindLabel[feature.kind]}</p><h2>{feature.title}</h2><span>{new Date(feature.publishedAt).toLocaleDateString("ko-KR")} · FEATABLE EDITORIAL</span></header>
            <p className="feature-lead">{feature.excerpt}</p>
            <img className="feature-article-cover" src={feature.coverUrl} alt="" />

            {feature.body.map((block, index) => block.type === "text" ? <section key={`${block.type}-${index}`}>{block.heading && <h3>{block.heading}</h3>}<p>{block.body}</p></section> : <figure key={`${block.type}-${index}`}><img src={block.src} alt={block.alt} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>)}

            {brand && <section className="feature-editorial-section"><span>THE QUESTION</span><h3>어떤 문제에서<br />이 브랜드가 시작됐나요?</h3><p>{brand.problem ?? brand.description}</p><blockquote>“{brand.tagline}”</blockquote></section>}

            {founder && <section id="founder" className="feature-founder-quote"><img src={founder.avatarUrl} alt={founder.name} /><div><span>FOUNDER</span><h3>{founder.name}</h3><blockquote>“{founder.headline}”</blockquote><p>{founder.bio}</p></div></section>}

            {product && <section id="product" className="feature-related-product"><p>RELATED PRODUCT</p><Link href={`/products/${product.slug}`}><img src={product.heroUrl} alt="" /><div><Badge>{product.category}</Badge><h3>{product.name}</h3><span>{product.tagline}</span><strong>제품 자세히 보기 ↗</strong></div></Link></section>}
          </article>

          <aside className="feature-article-aside"><div><p>FEATURED</p><strong>{brand?.name ?? "FEATABLE"}</strong><span>{founder?.name} Founder</span></div><div><p>DISCOVERED</p><strong>{discoveryCount.toLocaleString()}</strong><span>people</span></div><a href="#cheers">Founder 응원하기 ↑</a></aside>
        </section>
      </main>
      <Footer partners={partners} />
    </>
  );
}
