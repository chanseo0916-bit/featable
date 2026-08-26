import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMemberType, type MemberType } from "@/lib/auth";
import { getCatalog, getCommunities, getEvents, getFeatures, getSupportPrograms } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnalyticsDay } from "./product-analytics";
import { PartnerDashboard } from "./partner-dashboard";
import { StudioWelcomeGuide } from "./studio-welcome-guide";
import {
  FounderDashboard,
  type DashboardBrand,
  type DashboardDraft,
  type DashboardInvite,
  type DashboardProduct,
  type DashboardStory,
  type DashboardTeamMember,
} from "./founder-dashboard";
import {
  MemberDashboard,
  type SavedCollectionItem,
  type TeamBrand,
  type TeamHubBrand,
} from "./member-dashboard";

export const metadata: Metadata = { title: "워크스페이스 · FEATABLE" };

type MyBrand = DashboardBrand;
type MyProduct = DashboardProduct;
type MyStory = DashboardStory;
type ProductDraftRow = DashboardDraft;

function ninetyDaysAgoIso(): string {
  return new Date(Date.now() - 90 * 86_400_000).toISOString();
}

function buildAnalyticsSeries(
  events: { event_type: string; created_at: string }[],
  likeRows: { created_at: string }[],
): AnalyticsDay[] {
  const days = 90;
  const map = new Map<string, AnalyticsDay>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { date: key, views: 0, clicks: 0, likes: 0 });
  }
  for (const e of events) {
    const bucket = map.get(e.created_at.slice(0, 10));
    if (!bucket) continue;
    if (e.event_type === "view") bucket.views++;
    else if (e.event_type === "click") bucket.clicks++;
  }
  for (const l of likeRows) {
    const bucket = map.get(l.created_at.slice(0, 10));
    if (bucket) bucket.likes++;
  }
  return [...map.values()];
}
type OwnedTeamMember = DashboardTeamMember;
type PendingTeamInvite = DashboardInvite;

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my");

  const { data: profile } = await supabase.from("profiles").select("full_name,member_type").eq("id", user.id).maybeSingle();
  const memberType = isMemberType(profile?.member_type ?? "") ? (profile?.member_type as MemberType) : "founder";
  const memberName = profile?.full_name?.trim() || user.user_metadata?.full_name || user.user_metadata?.name || "Featable 멤버";
  const { data: membershipRows } = await supabase.from("brand_members").select("member_role,brand:brands(id,slug,name,tagline,logo_url)").eq("user_id", user.id);
  const teamBrands = ((membershipRows ?? []) as unknown as { member_role: string; brand: { id: string; slug: string; name: string; tagline: string; logo_url: string | null } | null }[]).flatMap((row): TeamBrand[] => row.brand ? [{ id: row.brand.id, slug: row.brand.slug, name: row.brand.name, tagline: row.brand.tagline, logoUrl: row.brand.logo_url, role: row.member_role }] : []);

  // 가입할 때 고른 역할이 아니라 실제로 가진 것으로 판단한다.
  // 역할을 잘못 고른 사람이 이미 만든 프로필·브랜드를 못 보는 일이 없어야 한다.
  const { data: ownFounder } = await supabase.from("founders").select("id").eq("user_id", user.id).maybeSingle();
  const { count: ownedBrandCount } = ownFounder
    ? await supabase.from("brands").select("id", { count: "exact", head: true }).eq("founder_id", ownFounder.id)
    : { count: 0 };
  const hasFounderWorkspace = memberType === "founder" || Boolean(ownFounder && (ownedBrandCount ?? 0) > 0);
  if (!hasFounderWorkspace) {
    const [{ data: savedRows }, { data: followedRows }, { data: supportedRows }, catalog, features, events, supportPrograms, communities] = await Promise.all([
      supabase.from("saved_items").select("item_type,item_slug,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
      supabase.from("brand_follows").select("brand:brands(slug,name,tagline)").eq("user_id", user.id).limit(12),
      supabase.from("founder_supports").select("founder:founders(slug,name,headline)").eq("user_id", user.id).limit(12),
      getCatalog(),
      getFeatures(),
      getEvents(),
      getSupportPrograms(),
      getCommunities(),
    ]);
    const savedItems = (savedRows ?? []).flatMap((row): SavedCollectionItem[] => {
      if (row.item_type === "product") {
        const item = catalog.products.find((product) => product.slug === row.item_slug);
        return item ? [{ type: "프로덕트", slug: item.slug, title: item.name, meta: item.tagline, href: `/products/${item.slug}` }] : [];
      }
      if (row.item_type === "feature") {
        const item = features.find((feature) => feature.slug === row.item_slug);
        return item ? [{ type: "피처", slug: item.slug, title: item.title, meta: item.excerpt, href: `/stories/${item.slug}` }] : [];
      }
      if (row.item_type === "event") {
        const item = events.find((event) => event.slug === row.item_slug);
        return item ? [{ type: "행사", slug: item.slug, title: item.name, meta: `${item.host} · ${item.location}`, href: `/events/${item.slug}` }] : [];
      }
      const item = supportPrograms.find((program) => program.slug === row.item_slug);
      return item ? [{ type: "지원사업", slug: item.slug, title: item.name, meta: `${item.agency} · ${item.closeAt}`, href: `/support/${item.slug}` }] : [];
    });
    for (const row of (followedRows ?? []) as unknown as { brand: { slug: string; name: string; tagline: string } | null }[]) {
      if (row.brand) savedItems.push({ type: "팔로우", slug: row.brand.slug, title: row.brand.name, meta: row.brand.tagline, href: `/brands/${row.brand.slug}` });
    }
    for (const row of (supportedRows ?? []) as unknown as { founder: { slug: string; name: string; headline: string } | null }[]) {
      if (row.founder) savedItems.push({ type: "Founder 응원", slug: row.founder.slug, title: row.founder.name, meta: row.founder.headline, href: `/founders/${row.founder.slug}` });
    }
    if (memberType === "partner") {
      const { data: submissionRows } = await supabase
        .from("partner_submissions")
        .select("id,title,submission_type,status,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      return <><StudioWelcomeGuide userId={user.id} memberType="partner" /><PartnerDashboard name={memberName} email={user.email ?? ""} savedItems={savedItems} teamBrands={teamBrands} events={events} supportPrograms={supportPrograms} communities={communities} submissions={submissionRows ?? []} /></>;
    }
    // 팀원도 소속 브랜드의 팀 프로필 허브를 같은 구조로 본다
    let teamHub: TeamHubBrand[] = [];
    if (teamBrands.length) {
      const brandIds = teamBrands.map((brand) => brand.id);
      const [{ data: hubMemberRows }, { data: hubOwnerRows }] = await Promise.all([
        supabase.from("brand_members").select("brand_id,user_id,display_name,title,bio,avatar_url,is_public,member_role,sort_order").in("brand_id", brandIds).order("sort_order", { ascending: true }),
        supabase.from("brands").select("id,founder:founders(slug,name,headline,bio,avatar_url)").in("id", brandIds),
      ]);
      const ownerByBrand = new Map(
        ((hubOwnerRows ?? []) as unknown as { id: string; founder: { slug: string; name: string; headline: string; bio: string | null; avatar_url: string | null } | null }[])
          .map((row) => [row.id, row.founder]),
      );
      teamHub = teamBrands.map((brand) => ({
        brand,
        owner: ownerByBrand.get(brand.id) ?? null,
        members: ((hubMemberRows ?? []) as OwnedTeamMember[]).filter((member) => member.brand_id === brand.id),
      }));
    }
    return <MemberDashboard memberType={memberType} name={memberName} email={user.email ?? ""} savedItems={savedItems} teamBrands={teamBrands} teamHub={teamHub} myUserId={user.id} />;
  }

  const { data: founder } = await supabase.from("founders").select("id,founder_number,slug,name,role_title,headline,bio,avatar_url,sns").eq("user_id", user.id).maybeSingle();
  let brands: MyBrand[] = [];
  let products: MyProduct[] = [];
  let ownedTeamMembers: OwnedTeamMember[] = [];
  let pendingTeamInvites: PendingTeamInvite[] = [];
  if (founder) {
    const { data: brandRows } = await supabase.from("brands").select("id,slug,name,logo_url,tagline,category,status,updated_at").eq("founder_id", founder.id).order("updated_at", { ascending: false });
    brands = (brandRows ?? []) as MyBrand[];
    if (brands.length) {
      const brandIds = brands.map((brand) => brand.id);
      const [{ data: productRows }, { data: teamRows }, { data: inviteRows }] = await Promise.all([
        supabase.from("products").select("id,brand_id,slug,name,hero_url,view_count,status").in("brand_id", brandIds),
        supabase.from("brand_members").select("brand_id,user_id,display_name,title,bio,avatar_url,is_public,member_role,sort_order").in("brand_id", brandIds).order("sort_order", { ascending: true }),
        supabase.from("brand_invitations").select("id,brand_id,email,member_role,expires_at").in("brand_id", brandIds).is("accepted_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
      ]);
      products = (productRows ?? []) as MyProduct[];
      ownedTeamMembers = (teamRows ?? []) as OwnedTeamMember[];
      pendingTeamInvites = (inviteRows ?? []) as PendingTeamInvite[];
    }
  }

  // 내가 올린 글(인터뷰 포함) — 창업가가 자기 성과를 보러 돌아올 수 있게 한다
  let myStories: MyStory[] = [];
  let storyLikes: Record<string, number> = {};
  if (founder) {
    const { data: storyRows } = await supabase
      .from("features")
      .select("id,slug,title,kind,cover_url,view_count,status,published_at,hook_label")
      .or(`founder_id.eq.${founder.id},created_by.eq.${user.id}`)
      .order("published_at", { ascending: false });
    myStories = (storyRows ?? []) as MyStory[];
    if (myStories.length) {
      const { data: likeRows } = await supabase
        .from("item_like_counts")
        .select("item_slug,like_count")
        .eq("item_type", "feature")
        .in("item_slug", myStories.map((story) => story.slug));
      storyLikes = Object.fromEntries(((likeRows ?? []) as { item_slug: string; like_count: number }[]).map((row) => [row.item_slug, row.like_count]));
    }
  }

  const { data: draftRows } = await supabase
    .from("submission_drafts")
    .select("draft_key,payload,updated_at")
    .eq("user_id", user.id)
    .like("draft_key", "product:%")
    .order("updated_at", { ascending: false });
  const writingDrafts = ((draftRows ?? []) as ProductDraftRow[]).filter(
    (row) => typeof row.payload === "object" && (row.payload.name?.trim() || row.payload.tagline?.trim()),
  );
  let analyticsSeries: AnalyticsDay[] = [];
  if (products.length) {
    const ninetyDaysAgo = ninetyDaysAgoIso();
    const productIds = products.map((product) => product.id);
    const productSlugs = products.map((product) => product.slug);

    const { data: eventRows } = await supabase
      .from("product_events")
      .select("event_type,created_at")
      .in("product_id", productIds)
      .gte("created_at", ninetyDaysAgo);

    // saved_items(=좋아요)는 본인 행만 조회 가능한 RLS라, 프로덕트 소유자가 전체 집계를 보려면
    // service role로 created_at만 읽는다 (user_id는 절대 선택하지 않아 개인 식별 정보는 노출되지 않음).
    let likeRows: { created_at: string }[] = [];
    const admin = createAdminClient();
    if (admin) {
      const { data } = await admin
        .from("saved_items")
        .select("created_at")
        .eq("item_type", "product")
        .in("item_slug", productSlugs)
        .gte("created_at", ninetyDaysAgo);
      likeRows = data ?? [];
    }

    analyticsSeries = buildAnalyticsSeries(eventRows ?? [], likeRows);
  }

  return <FounderDashboard
    userId={user.id}
    founder={founder ? { name: founder.name, roleTitle: founder.role_title, avatarUrl: founder.avatar_url } : null}
    brands={brands}
    products={products}
    stories={myStories}
    storyLikes={storyLikes}
    teamMembers={ownedTeamMembers}
    pendingInvites={pendingTeamInvites}
    writingDrafts={writingDrafts}
    analyticsSeries={analyticsSeries}
  />;
}
