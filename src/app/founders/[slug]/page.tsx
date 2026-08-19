import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Footer, Header, SectionHeader } from "@/components/site-shell";
import { features, partners } from "@/lib/mock";
import { getCatalog, getFounder } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const founder = await getFounder(slug);
  if (!founder) return {};
  return {
    title: `${founder.name} — ${founder.headline}`,
    description: founder.bio?.slice(0, 160) ?? founder.headline,
    alternates: { canonical: `/founders/${founder.slug}` },
    openGraph: {
      title: founder.name,
      description: founder.headline,
      url: `/founders/${founder.slug}`,
      images: [{ url: founder.avatarUrl }],
    },
  };
}

const SNS_LABELS: Record<string, string> = {
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
  website: "Website",
};

function snsHref(key: string, value: string): string {
  if (value.startsWith("http")) return value;
  const handle = value.replace(/^@/, "");
  if (key === "instagram") return `https://instagram.com/${handle}`;
  if (key === "x") return `https://x.com/${handle}`;
  if (key === "linkedin") return `https://linkedin.com/in/${handle}`;
  return `https://${value}`;
}

export default async function FounderProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const founder = await getFounder(slug);
  if (!founder) notFound();

  const { brands, products } = await getCatalog();
  const founderBrands = brands.filter((b) => b.founderSlug === founder.slug);
  const founderProducts = products.filter((p) => p.founderSlug === founder.slug);
  const founderFeatures = features.filter((f) => f.founderSlug === founder.slug);
  const snsEntries = Object.entries(founder.sns ?? {}).filter(([, v]) => v);

  return (
    <>
      <Header />
      <main className="bg-white">
        {/* 프로필 헤더 */}
        <section className="shell mx-auto flex flex-col items-start gap-7 pb-12 pt-14 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={founder.avatarUrl}
            alt={founder.name}
            className="h-28 w-28 rounded-full border border-border object-cover sm:h-36 sm:w-36"
          />
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-extrabold tracking-[0.13em] text-accent">FOUNDER</p>
            <h1 className="mb-2 text-4xl font-bold tracking-tight">{founder.name}</h1>
            <p className="mb-4 text-base text-muted">{founder.headline}</p>
            {snsEntries.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {snsEntries.map(([key, value]) => (
                  <a
                    key={key}
                    href={snsHref(key, value as string)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    {SNS_LABELS[key] ?? key} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 스토리 */}
        {founder.bio && (
          <section className="shell border-t border-border py-12">
            <p className="eyebrow">STORY</p>
            <p className="max-w-2xl whitespace-pre-line text-lg leading-relaxed tracking-tight">
              {founder.bio}
            </p>
          </section>
        )}

        {/* 브랜드 */}
        {founderBrands.length > 0 && (
          <section className="shell section">
            <SectionHeader eyebrow="BRANDS" title={`${founder.name}의 브랜드`} href="/brands" />
            <div className="brand-grid">
              {founderBrands.map((b) => (
                <Link href={`/brands/${b.slug}`} className="brand-card" key={b.slug}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="brand-logo" src={b.logoUrl} alt="" />
                  <div>
                    <Badge>{b.category}</Badge>
                    <h3>{b.name}</h3>
                    <p>{b.tagline}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 프로덕트 */}
        {founderProducts.length > 0 && (
          <section className="shell section">
            <SectionHeader eyebrow="PRODUCTS" title="만든 프로덕트" href="/products" />
            <div className="product-grid">
              {founderProducts.map((p) => (
                <Link href={`/products/${p.slug}`} className="product-card" key={p.slug}>
                  <div className="image-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.heroUrl} alt={p.name} />
                  </div>
                  <div className="card-body">
                    <Badge>{p.category}</Badge>
                    <h3>{p.name}</h3>
                    <p>{p.tagline}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 언론 기사식 스토리/인터뷰 */}
        {founderFeatures.length > 0 && (
          <section className="shell section pb-20">
            <SectionHeader eyebrow="STORIES" title="이 창업가의 이야기" href="/stories" />
            {founderFeatures.map((f) => (
              <Link href={`/stories/${f.slug}`} className="inline-feature" key={f.slug}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.coverUrl} alt="" />
                <div>
                  <Badge>{f.kind}</Badge>
                  <h3>{f.title}</h3>
                  <p>{f.excerpt}</p>
                </div>
                <span className="arrow">→</span>
              </Link>
            ))}
          </section>
        )}

        {founderBrands.length === 0 && founderProducts.length === 0 && (
          <section className="shell py-20 text-center text-sm text-muted">
            아직 공개된 브랜드가 없습니다.
          </section>
        )}
      </main>
      <Footer partners={partners} />
    </>
  );
}
