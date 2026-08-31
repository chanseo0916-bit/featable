import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Footer, Header } from "@/components/site-shell";
import { Comments } from "@/components/comments";
import { FeatureViewMetric } from "@/components/view-tracker";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import { LikeCount } from "@/components/like-count";
import { getCatalog, getFeature, getFeatures, getLikeCount, getPartners } from "@/lib/data";
import type { Metadata } from "next";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  createDetailMetadata,
  entityId,
  JsonLd,
  type SeoSchema,
} from "@/components/seo-json-ld";
import { conciseSeoDescription, seoTitle } from "@/lib/content-seo";
import { formatDateKst } from "@/lib/datetime";
import { shareableImage } from "@/lib/images";

const kindLabel = {
  interview: "인터뷰",
  "brand-story": "브랜드 스토리",
  "product-feature": "제품 이야기",
  launch: "런치 스토리",
  update: "업데이트",
  "case-study": "팀 이야기",
  qna: "Q&A",
} as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const feature = await getFeature(slug);
  if (!feature) return {};
  return createDetailMetadata({
    title: seoTitle(feature.seoTitle, feature.title),
    description: conciseSeoDescription(feature.seoDescription || feature.excerpt),
    path: `/stories/${feature.slug}`,
    image: shareableImage(feature.ogImageUrl, feature.coverUrl),
    type: "article",
    publishedTime: feature.publishedAt,
    modifiedTime: feature.updatedAt,
    indexable: feature.isIndexable !== false,
  });
}

export default async function StoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [feature, catalog, partners, allFeatures] = await Promise.all([getFeature(slug), getCatalog(), getPartners(), getFeatures()]);
  if (!feature) notFound();

  const founder = catalog.founders.find((item) => item.slug === feature.founderSlug);
  const brand = catalog.brands.find((item) => item.slug === feature.brandSlug);
  const product = catalog.products.find((item) => item.brandSlug === feature.brandSlug);
  const isInterview = feature.kind === "interview";
  const discoveryCount = feature.viewCount ?? 0;
  const likeCount = await getLikeCount("feature", feature.slug);
  // 같은 주제를 다룬 창업가 인터뷰를 이어 붙인다. 검색으로 들어온 글에서 사람으로 넘어갈 길을 만든다.
  const relatedInterview = feature.kind === "interview"
    ? null
    : (() => {
        const keywords = new Set(
          [feature.primaryKeyword, ...(feature.secondaryKeywords ?? [])]
            .filter(Boolean)
            .map((word) => String(word).replace(/\s+/g, "")),
        );
        if (keywords.size === 0) return null;
        return allFeatures
          .filter((item) => item.kind === "interview" && item.slug !== feature.slug)
          .map((item) => {
            const theirs = [item.primaryKeyword, ...(item.secondaryKeywords ?? [])]
              .filter(Boolean)
              .map((word) => String(word).replace(/\s+/g, ""));
            const hits = theirs.filter((word) => keywords.has(word)).length;
            return { item, hits };
          })
          .filter((entry) => entry.hits > 0)
          .sort((a, b) => b.hits - a.hits)[0]?.item ?? null;
      })();
  // 인터뷰에서 같은 주제 아티클로 내려보낸다. 트래픽이 인터뷰에만 있으니 거기서 길을 낸다.
  //
  // 인터뷰의 primary_keyword는 검색어가 아니라 인터뷰 이름("프루티오 김동현 인터뷰")이라
  // 키워드 교집합으로는 거의 붙지 않는다. 그래서 아티클의 대표 키워드를 낱말로 쪼개
  // 인터뷰 본문에 전부 등장하는지를 본다. 낱말이 하나뿐인 키워드는 너무 헐겁게 걸려 제외한다.
  const relatedArticles = feature.kind !== "interview"
    ? []
    : (() => {
        const haystack = [
          feature.title,
          feature.hookLabel ?? "",
          feature.excerpt,
          ...feature.body.map((block) => {
            if (block.type === "features") return block.items.map((item) => `${item.title} ${item.body}`).join(" ");
            if (block.type === "text") return `${block.heading ?? ""} ${block.body}`;
            return "";
          }),
        ].join(" ");

        return allFeatures
          .filter((item) => item.kind !== "interview" && item.primaryKeyword)
          .map((item) => {
            const words = String(item.primaryKeyword).split(/\s+/).filter((word) => word.length >= 2);
            if (words.length < 2) return { item, score: 0 };
            const matched = words.every((word) => haystack.includes(word));
            // 구체적인 키워드일수록 먼저 보여준다
            return { item, score: matched ? words.join("").length : 0 };
          })
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((entry) => entry.item);
      })();
  const storyPath = `/stories/${feature.slug}`;
  const articleBody = feature.body.length > 0
    ? feature.body
    : [
        {
          type: "text" as const,
          heading: "시작의 이유",
          body: brand?.problem ?? feature.excerpt,
        },
        {
          type: "text" as const,
          heading: `${brand?.name ?? "이 팀"}이 만들고 있는 변화`,
          body: brand
            ? `${brand.description}\n\n${brand.tagline}`
            : feature.excerpt,
        },
        ...(product
          ? [{
              type: "features" as const,
              heading: "한눈에 보기",
              items: [
                { title: product.name, body: product.tagline },
                { title: "카테고리", body: product.category },
              ],
            }]
          : []),
      ];
  const briefItems = articleBody.slice(0, 3).map((block, index) => {
    if (block.type === "text") {
      return {
        title: block.heading || `${index + 1}번째 이야기`,
        body: block.body,
      };
    }

    if (block.type === "features") {
      return {
        title: block.heading || `${index + 1}번째 이야기`,
        body: block.items.map((item) => `${item.title}: ${item.body}`).join(" · "),
      };
    }

    return {
      title: block.caption || `${index + 1}번째 장면`,
      body: block.alt || feature.excerpt,
    };
  });
  const fallbackBriefs = [
    { title: `${brand?.name ?? "새로운 팀"}이 해결하는 문제`, body: brand?.problem ?? feature.excerpt },
    { title: "지금 주목해야 하는 이유", body: feature.excerpt },
    {
      title: isInterview && founder ? "만든 사람의 관점" : "Featable의 관점",
      body: isInterview && founder ? founder.headline : "창업가와 빌더에게 필요한 핵심 내용을 Featable 편집팀이 정리했습니다.",
    },
  ];
  const summaryBriefs = fallbackBriefs.map((fallback, index) => briefItems[index] ?? fallback);
  const articleSubjects: SeoSchema[] = [
    ...(isInterview && founder
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
    ...(feature.updatedAt ? { dateModified: feature.updatedAt } : {}),
    keywords: [feature.primaryKeyword, ...(feature.secondaryKeywords ?? [])].filter(Boolean),
    author: isInterview && founder
      ? { "@type": "Person", "@id": entityId(`/founders/${founder.slug}`, "person"), name: founder.name }
      : { "@type": "Organization", "@id": entityId("/", "organization"), name: "Featable" },
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
                <img src={isInterview && founder ? founder.avatarUrl : "/icon.png"} alt="" />
                <div><span>{isInterview ? "Featable 인터뷰" : "발행"}</span>{isInterview && founder
                  ? <Link href={`/founders/${founder.slug}`}>{founder.name}</Link>
                  : <Link href="/">FEATABLE 편집팀</Link>}</div>
              </div>
              <p className="feature-brief-kicker">{kindLabel[feature.kind]}</p>
              <h1>{feature.title}</h1>
              <p className="feature-brief-excerpt">{feature.excerpt}</p>

              <div id="likes" className="feature-brief-metrics">
                <FeatureViewMetric slug={feature.slug} initialCount={discoveryCount} />
                <SaveButton itemType="feature" slug={feature.slug} labelMode="like" />
                <ShareButton title={feature.title} text={feature.excerpt} url={absoluteUrl(storyPath)} />
              </div>
            </div>

            <div className="feature-brief-media">
              <img src={feature.coverUrl} alt={feature.title} />
              <span>Featable 선정 · {formatDateKst(feature.publishedAt)}</span>
            </div>
          </div>

          <div className="feature-summary-strip">
            <div className="feature-summary-label"><span>✦</span><strong>3줄 브리핑</strong><small>핵심만 먼저 보기</small></div>
            {summaryBriefs.map((brief, index) => <div key={`${brief.title}-${index}`}><b>{String(index + 1).padStart(2, "0")}</b><p><strong>{brief.title}</strong><span>{brief.body}</span></p></div>)}
          </div>

          <div className="feature-social-proof">
            <p><strong>이 스토리가 좋았다면</strong> 하트를 눌러주세요.</p>
            <span>좋아요는 내 계정에 저장되고 언제든 취소할 수 있어요.</span>
          </div>
        </section>

        <nav className="feature-content-tabs"><div className="shell"><a className="active" href="#story">스토리</a>{isInterview && founder && <a href="#founder">Founder</a>}{product && <a href="#product">프로덕트</a>}<a href="#likes">좋아요</a></div></nav>

        <section id="story" className="shell feature-story-layout">
          <article className="feature-long-article">
            <header>
              <p>{kindLabel[feature.kind]}</p>
              <h2>{feature.title}</h2>
              {isInterview && founder
                ? <div className="feature-byline">
                    <img src={founder.avatarUrl} alt="" />
                    <span>
                      <Link href={`/founders/${founder.slug}`}><b>{founder.name}</b></Link>
                      {founder.role && <em>{founder.role}</em>}
                    </span>
                    <time dateTime={feature.publishedAt}>{formatDateKst(feature.publishedAt)}</time>
                  </div>
                : <div className="feature-byline">
                    <img src="/icon.png" alt="Featable 로고" />
                    <span><Link href="/"><b>FEATABLE</b></Link><em>편집팀</em></span>
                    <time dateTime={feature.publishedAt}>{formatDateKst(feature.publishedAt)}</time>
                  </div>}
            </header>
            <p className="feature-lead">{feature.excerpt}</p>
            <img className="feature-article-cover" src={feature.coverUrl} alt="" />

            {articleBody.map((block, index) => {
              if (block.type === "text") return <section key={`${block.type}-${index}`}>{block.heading && <h3>{block.heading}</h3>}<p className="feature-article-copy">{block.body}</p></section>;
              if (block.type === "image") return <figure key={`${block.type}-${index}`}><img src={block.src} alt={block.alt} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
              return <section key={`${block.type}-${index}`}>{block.heading && <h3>{block.heading}</h3>}<ol className="feature-article-features">{block.items.map((item, itemIndex) => <li key={itemIndex}><strong>{item.title}</strong><p className="feature-article-copy">{item.body}</p></li>)}</ol></section>;
            })}

            {brand && <section className="feature-editorial-section"><span>시작한 이유</span><h3>어떤 문제에서<br />이 브랜드가 시작됐을까?</h3><p>{brand.problem ?? brand.description}</p><blockquote>“{brand.tagline}”</blockquote></section>}
            {isInterview && founder && <section id="founder" className="feature-founder-quote"><img src={founder.avatarUrl} alt={founder.name} /><div><span>창업가</span><h3>{founder.name}</h3><blockquote>“{founder.headline}”</blockquote><p>{founder.bio}</p></div></section>}
            {product && <section id="product" className="feature-related-product"><p>함께 볼 프로덕트</p><Link href={`/products/${product.slug}`}><img src={product.heroUrl} alt="" /><div><Badge>{product.category}</Badge><h3>{product.name}</h3><span>{product.tagline}</span><strong>제품 자세히 보기 →</strong></div></Link></section>}
            {relatedArticles.length > 0 && <section className="feature-related-articles">
              <p>이 인터뷰와 이어지는 글</p>
              <div>
                {relatedArticles.map((article) => <Link href={`/stories/${article.slug}`} key={article.slug}>
                  <span>{article.primaryKeyword ?? "아티클"}</span>
                  <strong>{article.title}</strong>
                  <small>{article.excerpt}</small>
                </Link>)}
              </div>
            </section>}
            {relatedInterview && <section className="feature-related-interview">
              <p>이 주제를 실제로 해낸 창업가</p>
              <Link href={`/stories/${relatedInterview.slug}`}>
                <img src={relatedInterview.coverUrl} alt="" />
                <div>
                  <span>창업가 인터뷰</span>
                  <h3>{relatedInterview.hookLabel ?? relatedInterview.title}</h3>
                  <small>{relatedInterview.title}</small>
                  <strong>인터뷰 읽어보기 →</strong>
                </div>
              </Link>
            </section>}
          </article>

          <aside className="feature-article-aside"><div><p>발행</p><strong>FEATABLE</strong><span>{isInterview && founder ? `인터뷰 · ${founder.name}` : kindLabel[feature.kind]}</span></div><div><p>조회수</p><strong>{discoveryCount.toLocaleString()}</strong><span>회</span></div><div><p>하트</p><LikeCount itemType="feature" slug={feature.slug} initialCount={likeCount} /><span>좋아요</span></div><div className="feature-aside-actions"><SaveButton itemType="feature" slug={feature.slug} labelMode="like" /><ShareButton title={feature.title} text={feature.excerpt} url={absoluteUrl(storyPath)} /></div></aside>
        </section>

        <Comments type="feature" slug={feature.slug} />
      </main>
      <Footer partners={partners} />
    </>
  );
}
