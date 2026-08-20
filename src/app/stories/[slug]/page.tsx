import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Footer, Header } from "@/components/site-shell";
import { Comments } from "@/components/comments";
import { FeatureViewMetric } from "@/components/view-tracker";
import { SaveButton } from "@/components/save-button";
import { getCatalog, getFeature, getPartners } from "@/lib/data";
import type { Metadata } from "next";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  createDetailMetadata,
  entityId,
  JsonLd,
  type SeoSchema,
} from "@/components/seo-json-ld";

const kindLabel = {
  interview: "FOUNDER INTERVIEW",
  "brand-story": "BRAND STORY",
  "product-feature": "PRODUCT FEATURE",
  launch: "LAUNCH STORY",
  update: "UPDATE",
  "case-study": "CASE STUDY",
  qna: "Q&A",
} as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const feature = await getFeature(slug);
  if (!feature) return {};
  return createDetailMetadata({
    title: feature.title,
    description: feature.excerpt.slice(0, 160),
    path: `/stories/${feature.slug}`,
    image: feature.coverUrl,
    type: "article",
    publishedTime: feature.publishedAt,
  });
}

export default async function StoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [feature, catalog, partners] = await Promise.all([getFeature(slug), getCatalog(), getPartners()]);
  if (!feature) notFound();

  const founder = catalog.founders.find((item) => item.slug === feature.founderSlug);
  const brand = catalog.brands.find((item) => item.slug === feature.brandSlug);
  const product = catalog.products.find((item) => item.brandSlug === feature.brandSlug);
  const discoveryCount = feature.viewCount ?? 0;
  const storyPath = `/stories/${feature.slug}`;
  const articleSubjects: SeoSchema[] = [
    ...(founder
      ? [{
          "@type": "Person",
          "@id": entityId(`/founders/${founder.slug}`, "person"),
          name: founder.name,
        }]
      : []),
    ...(brand
      ? [{
          "@type": "Organization",
          "@id": entityId(`/brands/${brand.slug}`, "organization"),
          name: brand.name,
        }]
      : []),
  ];
  const articleJsonLd: SeoSchema = {
    "@type": "Article",
    "@id": entityId(storyPath, "article"),
    headline: feature.title,
    description: feature.excerpt,
    url: absoluteUrl(storyPath),
    image: absoluteUrl(feature.coverUrl),
    datePublished: feature.publishedAt,
    author: {
      "@type": "Organization",
      "@id": entityId("/", "organization"),
      name: "Featable",
    },
    ...(articleSubjects.length > 0 ? { about: articleSubjects } : {}),
    publisher: {
      "@type": "Organization",
      "@id": entityId("/", "organization"),
      name: "Featable",
      url: absoluteUrl("/"),
    },
    mainEntityOfPage: { "@id": absoluteUrl(storyPath) },
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      articleJsonLd,
      breadcrumbJsonLd([
        { name: "Featable", path: "/" },
        { name: "스토리", path: "/stories" },
        { name: feature.title, path: storyPath },
      ]),
    ],
  } satisfies SeoSchema;

  return (
    <>
      <JsonLd data={jsonLd} />
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
                <SaveButton itemType="feature" slug={feature.slug} />
              </div>
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
            <p><strong>Founder 응원</strong>이 다음 여정을 시작하는 데 힘이 됩니다.</p>
            <span>스토리를 읽고 댓글로 응원을 남겨보세요.</span>
          </div>
        </section>

        <nav className="feature-content-tabs"><div className="shell"><a className="active" href="#story">스토리</a><a href="#founder">Founder</a><a href="#product">프로덕트</a><a href="#cheers">응원</a></div></nav>

        <section id="story" className="shell feature-story-layout">
          <article className="feature-long-article">
            <header><p>{kindLabel[feature.kind]}</p><h2>{feature.title}</h2><span>{new Date(feature.publishedAt).toLocaleDateString("ko-KR")} · FEATABLE</span></header>
            <p className="feature-lead">{feature.excerpt}</p>
            <img className="feature-article-cover" src={feature.coverUrl} alt="" />

            {feature.body.map((block, index) => {
              if (block.type === "text") return <section key={`${block.type}-${index}`}>{block.heading && <h3>{block.heading}</h3>}<p>{block.body}</p></section>;
              if (block.type === "image") return <figure key={`${block.type}-${index}`}><img src={block.src} alt={block.alt} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
              return <section key={`${block.type}-${index}`}>{block.heading && <h3>{block.heading}</h3>}<ol className="feature-article-features">{block.items.map((item, itemIndex) => <li key={itemIndex}><strong>{item.title}</strong><p>{item.body}</p></li>)}</ol></section>;
            })}

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
