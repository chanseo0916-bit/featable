import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Footer, Header } from "@/components/site-shell";
import { features, partners } from "@/lib/mock";
import { getCatalog } from "@/lib/data";
import { ShareButton } from "@/components/share-button";
import { ViewTracker } from "@/components/view-tracker";
import { TrackedLink } from "@/components/tracked-link";
import { MentorNotes } from "@/components/mentor-notes";
import { Comments } from "@/components/comments";
import { ProductGallery } from "./product-interactions";
import { SaveButton } from "@/components/save-button";
import type { Metadata } from "next";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  createDetailMetadata,
  entityId,
  JsonLd,
  type SeoSchema,
} from "@/components/seo-json-ld";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { brands, products } = await getCatalog();
  const product = products.find((p) => p.slug === slug);
  if (!product) return {};
  const brand = brands.find((b) => b.slug === product.brandSlug);
  return createDetailMetadata({
    title: product.name,
    description: `${product.tagline}${brand ? ` | ${brand.name}` : ""} | ${product.solution}`.slice(0, 160),
    path: `/products/${product.slug}`,
    image: product.heroUrl,
  });
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { brands, founders, products } = await getCatalog();
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();

  const brand = brands.find((item) => item.slug === product.brandSlug);
  const founder = founders.find((item) => item.slug === product.founderSlug);
  const relatedFeatures = features.filter((item) => product.relatedFeatureSlugs?.includes(item.slug));
  const productPath = `/products/${product.slug}`;
  const productJsonLd: SeoSchema = {
    "@type": "Product",
    "@id": entityId(productPath, "product"),
    name: product.name,
    url: absoluteUrl(productPath),
    image: [product.heroUrl, ...product.images].map(absoluteUrl),
    description: `${product.tagline} ${product.solution}`.slice(0, 500),
    category: product.category,
    ...(brand
      ? {
          brand: {
            "@type": "Organization",
            "@id": entityId(`/brands/${brand.slug}`, "organization"),
            name: brand.name,
          },
        }
      : {}),
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      productJsonLd,
      breadcrumbJsonLd([
        { name: "Featable", path: "/" },
        { name: "프로덕트", path: "/products" },
        { name: product.name, path: productPath },
      ]),
    ],
  } satisfies SeoSchema;

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header />
      <main className="commerce-product">
        <ViewTracker slug={product.slug} />
        <div className="shell product-breadcrumb">
          <Link href="/products">프로덕트</Link><span>›</span><Link href={`/brands/${brand?.slug}`}>{brand?.name}</Link><span>›</span><strong>{product.name}</strong>
        </div>

        <section className="shell commerce-summary">
          <ProductGallery name={product.name} heroUrl={product.heroUrl} images={product.images} />

          <div className="commerce-buy-panel">
            <div className="commerce-brand-line">
              <Link href={`/brands/${brand?.slug}`}><img src={brand?.logoUrl} alt="" />{brand?.name}<span>›</span></Link>
              <SaveButton itemType="product" slug={product.slug} variant="icon" />
            </div>
            <Badge tone="orange">{product.category}</Badge>
            <h1>{product.name}</h1>
            <p className="commerce-tagline">{product.tagline}</p>
            <div className="commerce-social-proof">{typeof product.viewCount === "number" && <span>조회 {product.viewCount.toLocaleString("ko-KR")}</span>}</div>
            {product.price && <div className="commerce-price"><span>시작 가격</span><strong>{product.price}</strong></div>}
            <div className="commerce-founder-mini"><img src={founder?.avatarUrl} alt="" /><div><span>이 제품을 만든 사람</span><strong>{founder?.name} Founder</strong></div><Link href={`/brands/${brand?.slug}`}>프로필 보기 →</Link></div>
            <div className="commerce-actions">
              {product.officialUrl && <TrackedLink className="button" href={product.officialUrl} slug={product.slug}>공식 사이트에서 보기 <span>↗</span></TrackedLink>}
              <ShareButton className="commerce-share" title={product.name} text={product.tagline} />
            </div>
            <p className="commerce-notice">Featable은 제품과 창업가를 발견할 수 있도록 연결합니다. 구매와 이용 조건은 공식 사이트에서 확인해주세요.</p>
          </div>
        </section>

        <nav className="product-detail-tabs">
          <div className="shell"><a className="active" href="#story">상세 스토리</a><a href="#features">주요 기능</a><a href="#founder">만든 사람</a></div>
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

            <MentorNotes productSlug={product.slug} />

            <section className="commerce-story-closing">
              <span>{brand?.name}</span>
              <h2>좋은 생각이<br />실제로 움직이기 시작하도록.</h2>
              <p>{product.tagline}</p>
              {product.officialUrl && <TrackedLink className="button" href={product.officialUrl} slug={product.slug}>{product.name} 시작하기 <span>↗</span></TrackedLink>}
            </section>
          </div>

          <aside className="commerce-story-aside">
            <p>STORY INDEX</p>
            <a href="#story">브랜드 스토리 <span>01</span></a>
            <a href="#features">주요 기능 <span>02</span></a>
            <a href="#founder">만든 사람 <span>03</span></a>
          </aside>
        </section>

        <Comments type="product" slug={product.slug} />
        {relatedFeatures.length > 0 && <section className="shell commerce-related"><p className="eyebrow">RELATED FEATURE</p><h2>이 제품의 더 깊은 이야기</h2>{relatedFeatures.map((feature) => <Link href={`/stories/${feature.slug}`} key={feature.slug}><img src={feature.coverUrl} alt="" /><div><Badge>{feature.kind}</Badge><h3>{feature.title}</h3><p>{feature.excerpt}</p></div><span>↗</span></Link>)}</section>}
      </main>
      <Footer partners={partners} />
    </>
  );
}
