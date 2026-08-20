import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Header } from "@/components/site-shell";
import { partners } from "@/lib/mock";
import { getCatalog } from "@/lib/data";
import { FollowButton } from "@/components/follow-button";
import { absoluteUrl, breadcrumbJsonLd, createDetailMetadata, entityId, JsonLd, type SeoSchema } from "@/components/seo-json-ld";
import { createClient } from "@/lib/supabase/server";

interface PublicTeamMember {
  member_key: string;
  display_name: string;
  title: string;
  bio: string | null;
  avatar_url: string | null;
  sort_order: number;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { brands } = await getCatalog();
  const brand = brands.find((item) => item.slug === slug);
  if (!brand) return {};
  return createDetailMetadata({
    title: brand.name,
    description: (brand.description || brand.tagline).slice(0, 160),
    path: `/brands/${brand.slug}`,
    image: brand.coverUrl ?? brand.logoUrl,
  });
}

export default async function BrandDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { brands, founders, products } = await getCatalog();
  const brand = brands.find((item) => item.slug === slug);
  if (!brand) notFound();
  const founder = founders.find((item) => item.slug === brand.founderSlug);
  const brandProducts = products.filter((item) => item.brandSlug === brand.slug);
  const supabase = await createClient();
  const { data: publicTeamRows } = await supabase.rpc("get_public_brand_team", { p_brand_slug: brand.slug });
  const publicTeam = (publicTeamRows ?? []) as PublicTeamMember[];
  const brandPath = `/brands/${brand.slug}`;
  const organizationJsonLd: SeoSchema = {
    "@type": "Organization",
    "@id": entityId(brandPath, "organization"),
    name: brand.name,
    url: absoluteUrl(brandPath),
    logo: absoluteUrl(brand.logoUrl),
    ...(brand.coverUrl ? { image: absoluteUrl(brand.coverUrl) } : {}),
    description: brand.description || brand.tagline,
    ...(brand.website ? { sameAs: [absoluteUrl(brand.website)] } : {}),
    ...(brand.foundedAt ? { foundingDate: brand.foundedAt } : {}),
    ...(founder ? { founder: { "@type": "Person", "@id": entityId(`/founders/${founder.slug}`, "person"), name: founder.name } } : {}),
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd, breadcrumbJsonLd([
      { name: "Featable", path: "/" },
      { name: "브랜드", path: "/brands" },
      { name: brand.name, path: brandPath },
    ])],
  } satisfies SeoSchema;

  return <>
    <JsonLd data={jsonLd} />
    <Header />
    <main className="company-page">
      <div className="company-cover">{brand.coverUrl ? <img src={brand.coverUrl} alt="" /> : <div />}</div>
      <section className="shell company-identity">
        <div className="company-logo">{brand.logoUrl ? <img src={brand.logoUrl} alt={`${brand.name} 로고`} /> : <span>{brand.name.slice(0, 1)}</span>}</div>
        <div className="company-title"><span>{brand.category}</span><h1>{brand.name}</h1><p>{brand.tagline}</p></div>
        <div className="company-actions"><FollowButton brandSlug={brand.slug} />{brand.website && <a href={brand.website} target="_blank" rel="noreferrer">웹사이트 방문 <span>↗</span></a>}</div>
      </section>

      <nav className="company-tabs"><div className="shell"><a href="#products">프로덕트 <b>{brandProducts.length}</b></a><a href="#about">기업 소개</a>{(founder || publicTeam.length > 0) && <a href="#team">팀 <b>{publicTeam.length + (founder ? 1 : 0)}</b></a>}</div></nav>

      <div className="shell company-layout">
        <div className="company-main">
          <section id="products" className="company-products">
            <header><div><span>PRODUCTS</span><h2>{brand.name}의 프로덕트</h2></div><small>{brandProducts.length}개</small></header>
            {brandProducts.length > 0 ? <div className="company-product-grid">{brandProducts.map((product) => <Link href={`/products/${product.slug}`} key={product.slug}>
              <div className="company-product-image">{product.heroUrl ? <img src={product.heroUrl} alt={product.name} /> : <span>이미지 준비 중</span>}<i>{product.category}</i></div>
              <div className="company-product-copy"><span>{brand.name}</span><h3>{product.name}</h3><p>{product.tagline}</p><footer>{product.price ? <strong>{product.price}</strong> : <strong>자세히 보기</strong>}<b>→</b></footer></div>
            </Link>)}</div> : <div className="company-product-empty"><strong>아직 공개된 프로덕트가 없어요.</strong><p>{brand.name}의 새로운 제품과 서비스가 등록되면 이곳에서 만날 수 있습니다.</p></div>}
          </section>

          <section id="about" className="company-about-v2">
            <header><span>ABOUT</span><h2>기업 소개</h2></header>
            <p>{brand.description || brand.tagline}</p>
            {(brand.problem || brand.audience) && <dl>{brand.problem && <div><dt>해결하는 문제</dt><dd>{brand.problem}</dd></div>}{brand.audience && <div><dt>주요 고객</dt><dd>{brand.audience}</dd></div>}</dl>}
          </section>

          {(founder || publicTeam.length > 0) && <section id="team" className="company-team-section">
            <header><span>TEAM</span><h2>{brand.name}을 만드는 사람들</h2><p>아이디어를 실제 프로덕트로 함께 만들어가는 팀입니다.</p></header>
            <div className="company-team-grid">
              {founder && <Link className="company-team-card owner" href={`/founders/${founder.slug}`}>
                <div>{founder.avatarUrl ? <img src={founder.avatarUrl} alt={founder.name} /> : <span>{founder.name.slice(0, 1)}</span>}</div>
                <small>FOUNDER</small><h3>{founder.name}</h3><strong>{founder.headline}</strong><p>{founder.bio}</p><b>프로필 보기 →</b>
              </Link>}
              {publicTeam.map((member) => <article className="company-team-card" key={member.member_key}>
                <div>{member.avatar_url ? <img src={member.avatar_url} alt={member.display_name} /> : <span>{member.display_name.slice(0, 1)}</span>}</div>
                <small>TEAM</small><h3>{member.display_name}</h3><strong>{member.title}</strong>{member.bio && <p>{member.bio}</p>}
              </article>)}
            </div>
          </section>}
        </div>

        <aside className="company-sidebar">
          <section><span>COMPANY INFO</span><dl><div><dt>기업명</dt><dd>{brand.name}</dd></div><div><dt>분야</dt><dd>{brand.category}</dd></div>{brand.foundedAt && <div><dt>설립</dt><dd>{brand.foundedAt}</dd></div>}<div><dt>프로덕트</dt><dd>{brandProducts.length}개</dd></div></dl>{brand.website && <a href={brand.website} target="_blank" rel="noreferrer">공식 웹사이트 ↗</a>}</section>
          {(founder || publicTeam.length > 0) && <a className="company-team-summary" href="#team"><span>OUR TEAM</span><strong>{publicTeam.length + (founder ? 1 : 0)}명이 함께 만들고 있어요</strong><p>브랜드 뒤에 있는 사람들을 만나보세요.</p><b>팀 프로필 보기 ↓</b></a>}
        </aside>
      </div>
    </main>
    <Footer partners={partners} />
  </>;
}
