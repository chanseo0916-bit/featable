import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Footer, Header, SectionHeader } from "@/components/site-shell";
import { FounderSupportButton } from "@/components/founder-support-button";
import { getCatalog, getFeatures, getFounder, getPartners } from "@/lib/data";
import { getFounderSupportState } from "@/app/founders/actions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const founder = await getFounder(slug);
  if (!founder) return {};
  return {
    title: `${founder.name} · ${founder.headline}`,
    description: founder.bio?.slice(0, 160) ?? founder.headline,
    alternates: { canonical: `/founders/${founder.slug}` },
    openGraph: { title: founder.name, description: founder.headline, url: `/founders/${founder.slug}`, images: [{ url: founder.avatarUrl }] },
  };
}

const SNS_LABELS: Record<string, string> = { instagram: "Instagram", x: "X", linkedin: "LinkedIn", website: "Website" };

function snsHref(key: string, value: string): string {
  if (value.startsWith("http")) return value;
  const handle = value.replace(/^@/, "");
  if (key === "instagram") return `https://instagram.com/${handle}`;
  if (key === "x") return `https://x.com/${handle}`;
  if (key === "linkedin") return `https://linkedin.com/in/${handle}`;
  return `https://${value}`;
}

export default async function FounderProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const founder = await getFounder(slug);
  if (!founder) notFound();

  const [{ brands, products }, features, partners] = await Promise.all([getCatalog(), getFeatures(), getPartners()]);
  const founderBrands = brands.filter((brand) => brand.founderSlug === founder.slug);
  const founderProducts = products.filter((product) => product.founderSlug === founder.slug);
  const founderFeatures = features.filter((feature) => feature.founderSlug === founder.slug);
  const supportState = await getFounderSupportState(founder.slug);
  const snsEntries = Object.entries(founder.sns ?? {}).filter(([, value]) => value);
  const categories = Array.from(new Set(founderBrands.map((brand) => brand.category)));
  const founderNumber = [...founder.slug].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 10000;

  return (
    <>
      <Header />
      <main className="founder-page">
        <section className="shell founder-id-section">
          <div className="founder-spot-card founder-hero-card">
            <div className="founder-spot-photo">
              {founder.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={founder.avatarUrl} alt={founder.name} />
              ) : (
                <div className="founder-spot-placeholder" aria-hidden>{founder.name.slice(0, 1)}</div>
              )}
              <div className="founder-spot-fade" aria-hidden />
              <span className="founder-hero-id">FOUNDER ID · {String(founderNumber).padStart(4, "0")}</span>
            </div>
            <div className="founder-spot-body">
              <h3>
                {founder.name}
                <span className="founder-spot-verified" title="Featable Founder" aria-label="인증된 파운더">✓</span>
              </h3>
              <p>{founder.headline}</p>
              <div className="founder-spot-foot">
                <span className="founder-hero-status"><i /> NOW BUILDING</span>
                <em className="founder-spot-cta">Follow +</em>
              </div>
            </div>
          </div>

          <div className="founder-id-copy">
            <p className="founder-profile-label">MEET THE FOUNDER</p>
            <h1>{founder.name}</h1>
            <p className="founder-profile-headline">{founder.headline}</p>
            {categories.length > 0 && <div className="founder-profile-tags">{categories.map((category) => <span key={category}>#{category}</span>)}<span>#Founder</span></div>}

            <div className="founder-profile-stats">
              <div><strong>{founderBrands.length}</strong><span>브랜드</span></div>
              <div><strong>{founderProducts.length}</strong><span>프로덕트</span></div>
              <div><strong>{founderFeatures.length}</strong><span>피처</span></div>
            </div>

            {founder.bio && <p className="founder-profile-bio">{founder.bio}</p>}

            <div className="founder-profile-actions">
              <FounderSupportButton
                founderSlug={founder.slug}
                initialCount={supportState.count}
                initialSupported={supportState.supported}
              />
              {snsEntries.map(([key, value]) => <a key={key} href={snsHref(key, value as string)} target="_blank" rel="noopener noreferrer">{SNS_LABELS[key] ?? key} ↗</a>)}
            </div>
          </div>
        </section>

        <section className="founder-activity-bar">
          <div className="shell"><strong>{founder.name}의 활동</strong><nav><a href="#brands">브랜드</a><a href="#products">프로덕트</a><a href="#stories">피처</a></nav><span>마지막 업데이트 · 최근</span></div>
        </section>

        <div className="founder-journey">
          <div className="shell founder-flow" aria-label="Founder 활동 흐름">
            <div className="active"><i>01</i><span>Founder</span><strong>{founder.name}</strong></div><b>→</b>
            <a href="#brands"><i>02</i><span>Brand</span><strong>{founderBrands[0]?.name ?? "준비 중"}</strong></a><b>→</b>
            <a href="#products"><i>03</i><span>Product</span><strong>{founderProducts[0]?.name ?? "준비 중"}</strong></a><b>→</b>
            <a href="#stories"><i>04</i><span>Feature</span><strong>{founderFeatures.length ? `${founderFeatures.length}개의 이야기` : "준비 중"}</strong></a>
          </div>

          {founderBrands.length > 0 && <section id="brands" className="shell section founder-work-section"><SectionHeader eyebrow="BUILDING" title={`${founder.name}의 브랜드`} href="/brands" /><div className="brand-grid">{founderBrands.map((brand) => <Link href={`/brands/${brand.slug}`} className="brand-card" key={brand.slug}><img className="brand-logo" src={brand.logoUrl} alt="" /><div><Badge>{brand.category}</Badge><h3>{brand.name}</h3><p>{brand.tagline}</p></div></Link>)}</div></section>}

          {founderProducts.length > 0 && <section id="products" className="shell section founder-work-section"><SectionHeader eyebrow="PRODUCTS" title="만든 프로덕트" href="/products" /><div className="product-grid">{founderProducts.map((product) => <Link href={`/products/${product.slug}`} className="product-card" key={product.slug}><div className="image-card"><img src={product.heroUrl} alt={product.name} /></div><div className="card-body"><Badge>{product.category}</Badge><h3>{product.name}</h3><p>{product.tagline}</p></div></Link>)}</div></section>}

          {founderFeatures.length > 0 && <section id="stories" className="shell section founder-work-section founder-stories"><SectionHeader eyebrow="FEATURES" title={`${founder.name}의 이야기`} href="/stories" />{founderFeatures.map((feature) => <Link href={`/stories/${feature.slug}`} className="inline-feature" key={feature.slug}><img src={feature.coverUrl} alt="" /><div><Badge>{feature.kind}</Badge><h3>{feature.title}</h3><p>{feature.excerpt}</p></div><span className="arrow">→</span></Link>)}</section>}

          {founderBrands.length === 0 && founderProducts.length === 0 && <section className="shell founder-empty-work"><strong>지금 첫 번째 프로젝트를 준비하고 있어요.</strong><span>새로운 소식이 등록되면 이곳에서 가장 먼저 확인할 수 있습니다.</span></section>}
        </div>
      </main>
      <Footer partners={partners} />
    </>
  );
}
