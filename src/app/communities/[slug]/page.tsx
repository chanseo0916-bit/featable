import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Footer, Header, Badge } from "@/components/site-shell";
import { BrandCard } from "@/components/content-cards";
import { EventCard } from "@/components/event-card";
import { FounderCard } from "@/components/founder-card";
import { getCatalog, getCommunity, getEvents, getPartners } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CommunityMembershipControls } from "./community-membership-controls";
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
  const [community, catalog, events, partners] = await Promise.all([getCommunity(slug), getCatalog(), getEvents(), getPartners()]);
  if (!community) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: communityRow } = admin ? await admin.from("communities").select("id").eq("slug", slug).maybeSingle() : { data: null };
  const { data: managedCommunity } = user
    ? await supabase.from("communities").select("id").eq("slug", slug).eq("manager_user_id", user.id).maybeSingle()
    : { data: null };
  let canManageCommunity = Boolean(managedCommunity);
  if (user && !canManageCommunity) {
    const { data: publicCommunity } = await supabase.from("communities").select("id").eq("slug", slug).maybeSingle();
    if (publicCommunity) {
      const { data: delegatedManager } = await supabase.from("community_managers").select("role").eq("community_id", publicCommunity.id).eq("user_id", user.id).maybeSingle();
      canManageCommunity = Boolean(delegatedManager);
    }
  }
  const [{ data: myMembership }, { data: publicMemberships }] = communityRow && admin
    ? await Promise.all([
        user ? admin.from("community_memberships").select("status,is_public").eq("community_id", communityRow.id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
        admin.from("community_memberships").select("id,user_id,display_role,joined_at").eq("community_id", communityRow.id).eq("status", "active").eq("is_public", true).order("joined_at", { ascending: true }).limit(24),
      ])
    : [{ data: null }, { data: [] }];
  const memberRows = (publicMemberships ?? []) as Array<{ id: string; user_id: string; display_role: string; joined_at: string | null }>;
  const memberUserIds = memberRows.map((item) => item.user_id);
  const [{ data: memberProfiles }, { data: memberFounders }] = admin && memberUserIds.length
    ? await Promise.all([
        admin.from("profiles").select("id,full_name").in("id", memberUserIds),
        admin.from("founders").select("user_id,slug,name,avatar_url,headline").in("user_id", memberUserIds),
      ])
    : [{ data: [] }, { data: [] }];
  const profileMap = new Map((memberProfiles ?? []).map((item) => [item.id, item]));
  const founderMap = new Map((memberFounders ?? []).map((item) => [item.user_id, item]));
  const people = (community.founderSlugs ?? [])
    .map((item) => catalog.founders.find((f) => f.slug === item))
    .filter(Boolean);
  const linkedBrands = (community.brandSlugs ?? []).map((item) => catalog.brands.find((brand) => brand.slug === item)).filter(Boolean);
  const linkedEvents = (community.eventSlugs ?? []).map((item) => events.find((event) => event.slug === item)).filter(Boolean);
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
        <div className="community-identity"><img className="community-logo large" src={community.logoUrl} alt="" /><div><Badge tone="orange">{community.field}</Badge><h1>{community.name}</h1><p>{community.intro}</p><div className="community-detail-actions">{community.website && <a className="community-join-link secondary" href={community.website} target="_blank" rel="noreferrer">공식 채널 ↗</a>}{canManageCommunity && <Link className="community-manager-edit" href={`/my/communities/${community.slug}`}>커뮤니티 운영</Link>}</div><CommunityMembershipControls slug={community.slug} loggedIn={Boolean(user)} initialStatus={(myMembership?.status as "requested" | "invited" | "active" | "declined" | "left" | null) ?? null} initialPublic={myMembership?.is_public ?? true} /></div></div>
        <div className="community-about"><p>{community.intro}. 함께하는 창업가와 브랜드의 이야기를 Featable에서 만나보세요.</p></div>
        {people.length > 0 && <section className="community-linked-section"><header><span>PEOPLE</span><h2>함께하는 Founder</h2><p>이 커뮤니티에서 서로의 다음을 만드는 사람들입니다.</p></header><div className="community-founder-grid">{people.map((founder) => founder && <FounderCard founder={founder} key={founder.slug} />)}</div></section>}
        {memberRows.length > 0 && <section className="community-linked-section community-member-section"><header><span>MEMBERS</span><h2>{community.name}의 멤버</h2><p>운영자가 아니라, 이 커뮤니티에 실제로 소속되어 활동하는 사람들입니다.</p></header><div className="community-member-grid">{memberRows.map((membership) => { const founder = founderMap.get(membership.user_id); const profile = profileMap.get(membership.user_id); const content = <><span className="community-member-avatar">{founder?.avatar_url ? <img src={founder.avatar_url} alt="" /> : (founder?.name || profile?.full_name || "F").slice(0, 1)}</span><div><strong>{founder?.name || profile?.full_name || "Featable 멤버"}</strong><small>{membership.display_role || "멤버"}</small><p>{founder?.headline || `${community.name}에서 함께 활동하고 있어요.`}</p></div><b>↗</b></>; return founder?.slug ? <Link href={`/founders/${founder.slug}`} key={membership.id}>{content}</Link> : <article key={membership.id}>{content}</article>; })}</div></section>}
        {linkedBrands.length > 0 && <section className="community-linked-section"><header><span>BRANDS</span><h2>커뮤니티에서 만드는 브랜드</h2><p>멤버들이 직접 만들고 운영하는 브랜드를 발견하세요.</p></header><div className="brand-grid">{linkedBrands.map((brand) => brand && <BrandCard brand={brand} key={brand.slug} />)}</div></section>}
        {linkedEvents.length > 0 && <section className="community-linked-section"><header><span>EVENTS</span><h2>곧 만날 수 있는 자리</h2><p>커뮤니티가 만들거나 함께하는 행사입니다.</p></header><div className="event-grid">{linkedEvents.map((event) => event && <EventCard event={event} key={event.slug} />)}</div></section>}
      </main>
      <Footer partners={partners} />
    </>
  );
}
