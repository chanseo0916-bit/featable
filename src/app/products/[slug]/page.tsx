import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Header } from "@/components/site-shell";
import { getCatalog, getLikeCount, getPartners } from "@/lib/data";
import { ShareButton } from "@/components/share-button";
import { ProductViewMetric } from "@/components/product-view-metric";
import { TrackedLink } from "@/components/tracked-link";
import { Comments } from "@/components/comments";
import { SaveButton } from "@/components/save-button";
import { LikeCount } from "@/components/like-count";
import { ProductStoryRenderer } from "@/components/product-story-renderer";
import { ProductGallery } from "./product-interactions";
import { absoluteUrl, breadcrumbJsonLd, createDetailMetadata, entityId, JsonLd, type SeoSchema } from "@/components/seo-json-ld";
import { conciseSeoDescription, seoTitle } from "@/lib/content-seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { brands, products } = await getCatalog();
  const product = products.find((item) => item.slug === slug);
  if (!product) return {};
  const brand = brands.find((item) => item.slug === product.brandSlug);
  return createDetailMetadata({
    title: seoTitle(product.seoTitle, `${product.name}${brand ? ` | ${brand.name}` : ""}`),
    description: conciseSeoDescription(product.seoDescription || `${product.tagline}${brand ? ` ${brand.name}` : ""}`),
    path: `/products/${product.slug}`,
    image: product.ogImageUrl ?? product.heroUrl,
    indexable: product.isIndexable !== false,
  });
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) { const partners = await getPartners();
  const { slug } = await params;
  const { brands, founders, products } = await getCatalog();
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  const brand = brands.find((item) => item.slug === product.brandSlug);
  const founder = founders.find((item) => item.slug === product.founderSlug);
  const productLikeCount = await getLikeCount("product", product.slug);
  const productPath = `/products/${product.slug}`;
  const numericPrice = product.price?.replace(/[^0-9]/g, "");

  const productJsonLd: SeoSchema = {
    "@type": "Product",
    "@id": entityId(productPath, "product"),
    name: product.name,
    url: absoluteUrl(productPath),
    image: [product.heroUrl, ...product.images].filter(Boolean).map(absoluteUrl),
    description: `${product.tagline} ${product.solution}`.slice(0, 500),
    category: product.category,
    keywords: [product.primaryKeyword, ...(product.secondaryKeywords ?? [])].filter(Boolean),
    ...(product.updatedAt ? { dateModified: product.updatedAt } : {}),
    ...(brand ? { brand: { "@type": "Organization", "@id": entityId(`/brands/${brand.slug}`, "organization"), name: brand.name } } : {}),
    ...(numericPrice ? { offers: { "@type": "Offer", url: absoluteUrl(product.officialUrl || productPath), price: numericPrice, priceCurrency: "KRW", availability: "https://schema.org/InStock" } } : {}),
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [productJsonLd, breadcrumbJsonLd([
      { name: "Featable", path: "/" },
      { name: "프로덕트", path: "/products" },
      { name: product.name, path: productPath },
    ])],
  } satisfies SeoSchema;

  const officialCta = product.officialUrl
    ? <TrackedLink className="product-primary-cta" href={product.officialUrl} slug={product.slug}>공식 페이지에서 보기 <span>↗</span></TrackedLink>
    : null;

  return <>
    <JsonLd data={jsonLd} />
    <Header />
    <main className="commerce-product product-page-v2">
      <div className="shell product-breadcrumb"><Link href="/products">프로덕트</Link><span>›</span>{brand && <><Link href={`/brands/${brand.slug}`}>{brand.name}</Link><span>›</span></>}<strong>{product.name}</strong></div>

      <section className="shell commerce-summary">
        <ProductGallery name={product.name} heroUrl={product.heroUrl} images={product.images} />
        <div className="commerce-buy-panel">
          <div className="commerce-brand-line">
            {brand && <Link href={`/brands/${brand.slug}`}>{brand.logoUrl && <img src={brand.logoUrl} alt="" />}{brand.name}<span>›</span></Link>}
            <SaveButton itemType="product" slug={product.slug} variant="icon" />
          </div>
          <span className="product-category-chip">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="commerce-tagline">{product.tagline}</p>
          <div className="commerce-social-proof">{typeof product.viewCount === "number" && <ProductViewMetric slug={product.slug} initialCount={product.viewCount} />}<span>Featable 등록 프로덕트</span></div>
          {product.price && <div className="commerce-price"><span>가격</span><strong>{product.price}</strong></div>}
          {founder && <div className="commerce-founder-mini"><img src={founder.avatarUrl} alt="" /><div><span>만든 사람</span><strong>{founder.name} Founder</strong></div><Link href={`/founders/${founder.slug}`}>프로필 보기 →</Link></div>}
          <div className="commerce-actions">{officialCta}<ShareButton className="commerce-share" title={product.name} text={product.tagline} /></div>
          <p className="commerce-notice">구매·신청 조건은 연결된 공식 페이지에서 확인해주세요.</p>
        </div>
      </section>

      <nav className="product-detail-tabs"><div className="shell"><a className="active" href="#detail">상세페이지</a><a href="#info">제품 정보</a><a href="#comments">질문·댓글</a></div></nav>

      <section id="detail" className="product-public-detail">
        <article><ProductStoryRenderer brandName={brand?.name} name={product.name} tagline={product.tagline} heroUrl={product.heroUrl} story={product.story} /></article>
        <aside>
          <span>{brand?.name}</span><strong>{product.name}</strong><p>{product.tagline}</p>
          {product.price && <b>{product.price}</b>}
          {officialCta}
          <SaveButton itemType="product" slug={product.slug} />
          <p className="product-aside-stats"><span>조회 {(product.viewCount ?? 0).toLocaleString("ko-KR")}</span><span>저장 <LikeCount itemType="product" slug={product.slug} initialCount={productLikeCount} /></span></p>
        </aside>
      </section>

      <section id="info" className="shell product-facts">
        <header><span>제품 정보</span><h2>상세 정보</h2></header>
        <dl>
          <div><dt>브랜드</dt><dd>{brand?.name || "-"}</dd></div>
          <div><dt>카테고리</dt><dd>{product.category}</dd></div>
          {product.problem && <div><dt>해결하려는 문제</dt><dd>{product.problem}</dd></div>}
          {product.solution && <div><dt>해결 방법</dt><dd>{product.solution}</dd></div>}
          {product.features.length > 0 && <div><dt>주요 특징</dt><dd>{product.features.map((feature) => <span key={feature}>{feature}</span>)}</dd></div>}
        </dl>
      </section>

      <div id="comments"><Comments type="product" slug={product.slug} /></div>
      {product.officialUrl && <div className="product-mobile-cta"><div><small>{brand?.name}</small><strong>{product.name}</strong></div><TrackedLink href={product.officialUrl} slug={product.slug}>공식 페이지 보기</TrackedLink></div>}
    </main>
    <Footer partners={partners} />
  </>;
}
