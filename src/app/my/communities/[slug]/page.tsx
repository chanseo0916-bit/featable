import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { StudioNav } from "../../studio-nav";
import { CommunityEditor } from "./community-editor";
import { CommunityOperations, type CommunityBrandOption, type CommunityEventOption, type CommunityFounderOption, type CommunityManagerOption } from "./community-operations";

export const metadata: Metadata = { title: "커뮤니티 운영 · FEATABLE" };

interface CommunityRow { id: string; slug: string; name: string; logo_url: string | null; intro: string; field: string; website: string | null; sns: Record<string, unknown> | null; manager_user_id: string | null; }
interface RawFounder { id: string; slug: string; name: string; avatar_url: string | null; headline: string; }
interface RawBrand { id: string; slug: string; name: string; logo_url: string | null; tagline: string; }
interface RawEvent { id: string; slug: string; name: string; cover_url: string | null; starts_at: string; }

export default async function EditCommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/my/communities/${encodeURIComponent(slug)}`);
  const admin = createAdminClient();
  if (!admin) notFound();

  const { data: rawCommunity } = await admin.from("communities").select("id,slug,name,logo_url,intro,field,website,sns,manager_user_id").eq("slug", slug).maybeSingle();
  const community = rawCommunity as CommunityRow | null;
  if (!community) notFound();
  const isOwner = community.manager_user_id === user.id;
  let accessRole: "owner" | "manager" | "editor" = "owner";
  if (!isOwner) {
    const { data: access } = await admin.from("community_managers").select("role").eq("community_id", community.id).eq("user_id", user.id).maybeSingle();
    if (!access) notFound();
    accessRole = access.role === "editor" ? "editor" : "manager";
  }

  const [founderLinksResult, brandLinksResult, eventLinksResult, founderCandidatesResult, ownFounderResult, membershipsResult, ownEventsResult, cohostsResult, managersResult] = await Promise.all([
    admin.from("community_founders").select("founder_id,founder:founders(id,slug,name,avatar_url,headline)").eq("community_id", community.id),
    admin.from("community_brands").select("brand_id,brand:brands(id,slug,name,logo_url,tagline)").eq("community_id", community.id),
    admin.from("events").select("id,slug,name,cover_url,starts_at").eq("community_id", community.id).order("starts_at", { ascending: true }),
    admin.from("founders").select("id,slug,name,avatar_url,headline").order("name", { ascending: true }).limit(200),
    admin.from("founders").select("id").eq("user_id", user.id).maybeSingle(),
    admin.from("brand_members").select("brand_id").eq("user_id", user.id),
    admin.from("events").select("id,slug,name,cover_url,starts_at").eq("submitted_by", user.id).order("starts_at", { ascending: false }),
    admin.from("event_cohosts").select("event_id").eq("user_id", user.id),
    admin.from("community_managers").select("user_id,role,profile:profiles(full_name,email)").eq("community_id", community.id).order("created_at", { ascending: true }),
  ]);

  const founderLinks = (founderLinksResult.data ?? []) as unknown as Array<{ founder_id: string; founder: RawFounder | null }>;
  const founders: CommunityFounderOption[] = founderLinks.flatMap(({ founder }) => founder ? [{ id: founder.id, slug: founder.slug, name: founder.name, avatarUrl: founder.avatar_url ?? "", headline: founder.headline }] : []);
  const linkedFounderIds = new Set(founders.map((item) => item.id));
  const founderCandidates = ((founderCandidatesResult.data ?? []) as RawFounder[]).filter((item) => !linkedFounderIds.has(item.id)).map((item) => ({ id: item.id, slug: item.slug, name: item.name, avatarUrl: item.avatar_url ?? "", headline: item.headline }));

  const brandLinks = (brandLinksResult.data ?? []) as unknown as Array<{ brand_id: string; brand: RawBrand | null }>;
  const brands: CommunityBrandOption[] = brandLinks.flatMap(({ brand }) => brand ? [{ id: brand.id, slug: brand.slug, name: brand.name, logoUrl: brand.logo_url ?? "", tagline: brand.tagline }] : []);
  const linkedBrandIds = new Set(brands.map((item) => item.id));
  const candidateBrandIds = new Set<string>((membershipsResult.data ?? []).map((item) => item.brand_id));
  if (ownFounderResult.data?.id) {
    const { data: ownedBrands } = await admin.from("brands").select("id").eq("founder_id", ownFounderResult.data.id);
    (ownedBrands ?? []).forEach((item) => candidateBrandIds.add(item.id));
  }
  const { data: candidateBrandRows } = candidateBrandIds.size ? await admin.from("brands").select("id,slug,name,logo_url,tagline").in("id", [...candidateBrandIds]).order("name", { ascending: true }) : { data: [] };
  const brandCandidates: CommunityBrandOption[] = ((candidateBrandRows ?? []) as RawBrand[]).filter((item) => !linkedBrandIds.has(item.id)).map((item) => ({ id: item.id, slug: item.slug, name: item.name, logoUrl: item.logo_url ?? "", tagline: item.tagline }));

  const events: CommunityEventOption[] = ((eventLinksResult.data ?? []) as RawEvent[]).map((item) => ({ id: item.id, slug: item.slug, name: item.name, coverUrl: item.cover_url ?? "", startsAt: item.starts_at }));
  const linkedEventIds = new Set(events.map((item) => item.id));
  const eventCandidateMap = new Map<string, CommunityEventOption>();
  ((ownEventsResult.data ?? []) as RawEvent[]).forEach((item) => eventCandidateMap.set(item.id, { id: item.id, slug: item.slug, name: item.name, coverUrl: item.cover_url ?? "", startsAt: item.starts_at }));
  const cohostIds = (cohostsResult.data ?? []).map((item) => item.event_id).filter((id) => !eventCandidateMap.has(id));
  if (cohostIds.length) {
    const { data: cohostEvents } = await admin.from("events").select("id,slug,name,cover_url,starts_at").in("id", cohostIds);
    ((cohostEvents ?? []) as RawEvent[]).forEach((item) => eventCandidateMap.set(item.id, { id: item.id, slug: item.slug, name: item.name, coverUrl: item.cover_url ?? "", startsAt: item.starts_at }));
  }
  const eventCandidates = [...eventCandidateMap.values()].filter((item) => !linkedEventIds.has(item.id));
  const managers: CommunityManagerOption[] = ((managersResult.data ?? []) as unknown as Array<{ user_id: string; role: "manager" | "editor"; profile: { full_name: string | null; email: string | null } | null }>).map((item) => ({ userId: item.user_id, role: item.role, name: item.profile?.full_name || item.profile?.email || "Featable 멤버", email: item.profile?.email || "" }));
  const sns = community.sns && typeof community.sns === "object" ? community.sns : {};

  return <>
    <StudioNav active="communities" />
    <main className="approved-publishing-page"><div className="shell">
      <div className="approved-publishing-heading"><div><span>COMMUNITY CONSOLE</span><h2>{community.name}</h2></div><p>공개 정보와 커뮤니티 연결을 한곳에서 관리합니다.</p></div>
      {accessRole === "editor" ? <section className="community-editor-access-note"><span>EDITOR ACCESS</span><strong>연결 콘텐츠를 관리하는 에디터로 참여 중입니다.</strong><p>커뮤니티 기본 정보는 대표 운영자와 매니저가 수정할 수 있어요.</p></section> : <CommunityEditor slug={community.slug} initial={{ name: community.name, logoUrl: community.logo_url ?? "", field: community.field, intro: community.intro, website: community.website ?? "", instagram: typeof sns.instagram === "string" ? sns.instagram : "" }} />}
      <CommunityOperations slug={community.slug} isOwner={isOwner} founders={founders} founderCandidates={founderCandidates} brands={brands} brandCandidates={brandCandidates} events={events} eventCandidates={eventCandidates} managers={managers} />
    </div></main>
  </>;
}
