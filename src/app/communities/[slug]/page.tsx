import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer, Header, Badge } from "@/components/site-shell";
import { getCatalog, getCommunity, getPartners } from "@/lib/data";
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
  const community = await getCommunity(slug);
  if (!community) return {};
  return createDetailMetadata({
    title: community.name,
    description: community.intro.slice(0, 160),
    path: `/communities/${community.slug}`,
    image: community.logoUrl,
  });
}

export default async function CommunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [community, catalog, partners] = await Promise.all([getCommunity(slug), getCatalog(), getPartners()]);
  if (!community) notFound();
  const people = (community.founderSlugs ?? [])
    .map((item) => catalog.founders.find((f) => f.slug === item))
    .filter(Boolean);
  const communityPath = `/communities/${community.slug}`;
  const organizationJsonLd: SeoSchema = {
    "@type": "Organization",
    "@id": entityId(communityPath, "organization"),
    name: community.name,
    url: absoluteUrl(communityPath),
    logo: absoluteUrl(community.logoUrl),
    description: community.intro,
    ...(community.website ? { sameAs: [absoluteUrl(community.website)] } : {}),
    ...(people.length > 0
      ? {
          member: people.map((founder) => ({
            "@type": "Person",
            "@id": entityId(`/founders/${founder!.slug}`, "person"),
            name: founder!.name,
          })),
        }
      : {}),
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      organizationJsonLd,
      breadcrumbJsonLd([
        { name: "Featable", path: "/" },
        { name: "커뮤니티", path: "/communities" },
        { name: community.name, path: communityPath },
      ]),
    ],
  } satisfies SeoSchema;

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header />
      <main className="shell detail-page community-detail">
        <div className="community-identity"><img className="community-logo large" src={community.logoUrl} alt="" /><div><Badge tone="orange">{community.field}</Badge><h1>{community.name}</h1><p>{community.intro}</p>{community.website && <a className="community-join-link" href={community.website} target="_blank" rel="noreferrer">커뮤니티 참여하기 ↗</a>}</div></div>
        <div className="community-about"><p className="eyebrow">ABOUT COMMUNITY</p><p>{community.intro}. 함께하는 창업가와 브랜드의 이야기를 Featable에서 만나보세요.</p></div>
        <section><h2>함께하는 창업가</h2><div className="people-list">{people.map((founder) => founder && <div className="founder-callout" key={founder.slug}><span className="avatar"><img src={founder.avatarUrl} alt="" /></span><div><h3>{founder.name}</h3><p>{founder.headline}</p></div></div>)}</div></section>
      </main>
      <Footer partners={partners} />
    </>
  );
}
