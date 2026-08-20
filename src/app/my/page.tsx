import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteBrandButton } from "./delete-button";
import { BrandStatusButton } from "./brand-status-button";
import { isMemberType, type MemberType } from "@/lib/auth";
import { getCatalog, getEvents, getFeatures, getSupportPrograms } from "@/lib/data";
import { TeamInviteButton } from "./team-invite-button";
import { StudioNav } from "./studio-nav";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductAnalytics, type AnalyticsDay } from "./product-analytics";
import { PendingInviteControl, TeamMemberControls } from "./team-management-controls";
import type { BrandMemberRole } from "./team-actions";
import { TeamProfileCard } from "@/components/team-profile-card";

export const metadata: Metadata = { title: "워크스페이스 · FEATABLE" };

interface MyBrand {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  tagline: string;
  category: string;
  status: "draft" | "published" | "hidden";
  updated_at: string;
}

interface MyProduct { id: string; brand_id: string; slug: string; name: string; hero_url: string | null; view_count: number; status: string; }
interface ProductDraftRow { draft_key: string; payload: { name?: string; tagline?: string; brandId?: string }; updated_at: string; }

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
interface SavedCollectionItem { type: string; slug: string; title: string; meta: string; href: string; }
interface TeamBrand { id: string; slug: string; name: string; tagline: string; logoUrl: string | null; role: string; }
interface OwnedTeamMember { brand_id: string; user_id: string; display_name: string | null; title: string; bio: string | null; avatar_url: string | null; is_public: boolean; member_role: BrandMemberRole; sort_order: number; }
interface PendingTeamInvite { id: string; brand_id: string; email: string; member_role: BrandMemberRole; expires_at: string; }

const roleDashboard = {
  team: {
    eyebrow: "TEAM WORKSPACE",
    label: "팀 멤버",
    title: "팀의 다음 작업을 이어가세요.",
    description: "참여 중인 브랜드와 공동 작업을 한곳에서 확인하는 공간입니다.",
    primary: { href: "/brands", label: "브랜드 둘러보기" },
    emptyTitle: "아직 연결된 팀이 없어요.",
    emptyCopy: "팀 초대를 받으면 참여 중인 브랜드와 작성 중인 콘텐츠가 여기에 표시됩니다.",
    cards: [
      { href: "/stories", kicker: "REFERENCE", title: "잘 만든 피처 살펴보기", copy: "다른 팀의 스토리와 구성 방식을 참고해보세요." },
      { href: "/events", kicker: "NETWORK", title: "팀과 함께할 행사 찾기", copy: "데모데이와 네트워킹 일정을 확인하세요." },
      { href: "/support", kicker: "OPPORTUNITY", title: "지원사업 확인하기", copy: "지금 지원할 수 있는 프로그램을 모아봅니다." },
    ],
  },
  explorer: {
    eyebrow: "DISCOVERY HOME",
    label: "예비 창업가",
    title: "다음 시작을 발견해보세요.",
    description: "먼저 시작한 사람과 제품, 지금 참여할 수 있는 기회를 모았습니다.",
    primary: { href: "/stories", label: "추천 피처 보기" },
    emptyTitle: "관심 있는 Founder를 찾아보세요.",
    emptyCopy: "저장과 팔로우 기능이 연결되면 나만의 발견 목록이 이곳에 쌓입니다.",
    cards: [
      { href: "/founders", kicker: "PEOPLE", title: "Founder 만나기", copy: "제품보다 먼저, 만드는 사람의 이야기를 발견하세요." },
      { href: "/products", kicker: "PRODUCT", title: "새 프로덕트 보기", copy: "막 나온 제품과 서비스를 빠르게 살펴보세요." },
      { href: "/events", kicker: "EVENT", title: "이번 주 행사 찾기", copy: "직접 만나고 연결될 수 있는 자리를 확인하세요." },
    ],
  },
  partner: {
    eyebrow: "PARTNER CENTER",
    label: "파트너",
    title: "좋은 기회를 더 멀리 연결하세요.",
    description: "행사와 지원사업, 커뮤니티를 Founder에게 소개하는 파트너 공간입니다.",
    primary: { href: "/events", label: "행사 페이지 보기" },
    emptyTitle: "파트너 등록 도구를 준비하고 있어요.",
    emptyCopy: "곧 행사·지원사업을 직접 등록하고 성과를 확인할 수 있습니다.",
    cards: [
      { href: "/events", kicker: "EVENT", title: "행사 큐레이션", copy: "현재 공개된 행사와 운영 방식을 살펴보세요." },
      { href: "/support", kicker: "PROGRAM", title: "지원사업 모아보기", copy: "Founder에게 필요한 지원 기회를 확인하세요." },
      { href: "/communities", kicker: "COMMUNITY", title: "커뮤니티 연결하기", copy: "함께 성장하는 창업 커뮤니티를 만나보세요." },
    ],
  },
} satisfies Record<Exclude<MemberType, "founder">, {
  eyebrow: string;
  label: string;
  title: string;
  description: string;
  primary: { href: string; label: string };
  emptyTitle: string;
  emptyCopy: string;
  cards: { href: string; kicker: string; title: string; copy: string }[];
}>;

function MemberDashboard({ memberType, name, email, savedItems, teamBrands }: { memberType: Exclude<MemberType, "founder">; name: string; email: string; savedItems: SavedCollectionItem[]; teamBrands: TeamBrand[] }) {
  const role = roleDashboard[memberType];
  const stateTitle = teamBrands.length
    ? `${teamBrands.length}개 브랜드의 팀으로 참여 중이에요.`
    : savedItems.length
      ? `${savedItems.length}개의 항목을 저장했어요.`
      : role.emptyTitle;
  const stateCopy = teamBrands.length
    ? "초대받은 브랜드의 콘텐츠를 함께 편집할 수 있습니다."
    : savedItems.length
      ? "관심 있는 콘텐츠를 다시 확인하고 다음 행동으로 이어가세요."
      : role.emptyCopy;

  return <>
    <StudioNav />
    <main className="studio-dashboard role-dashboard">
      <div className="shell studio-dashboard-inner">
        <header className="role-dashboard-hero">
          <div><p>{role.eyebrow}</p><span>{role.label}</span><h1>{name}님,<br />{role.title}</h1><small>{role.description}</small></div>
          <Link href={role.primary.href}>{role.primary.label}<b>→</b></Link>
        </header>
        <section className="role-dashboard-state">
          <div className="role-dashboard-avatar">{name.slice(0, 1) || "F"}</div>
          <div><span>MY ROLE · {role.label}</span><strong>{stateTitle}</strong><p>{stateCopy}</p></div>
          <small>{email}</small>
        </section>
        {teamBrands.length > 0 && <section className="role-team-brands">
          <div className="studio-panel-heading"><strong>참여 중인 브랜드</strong><span>편집 권한이 연결된 워크스페이스입니다.</span></div>
          <div>{teamBrands.map((brand) => <article key={brand.id}>{brand.logoUrl ? <img src={brand.logoUrl} alt="" /> : <i>{brand.name.slice(0, 1)}</i>}<div><span>{brand.role === "editor" ? "EDITOR" : "VIEWER"}</span><strong>{brand.name}</strong><small>{brand.tagline}</small></div><Link href={`/my/team/${brand.id}`}>내 팀 프로필 →</Link></article>)}</div>
        </section>}
        <section className="role-dashboard-links">
          <div className="studio-panel-heading"><strong>{role.label}에게 필요한 메뉴</strong><span>선택한 역할을 기준으로 구성했어요.</span></div>
          <div>{role.cards.map((card, index) => <Link href={card.href} key={card.href}><i>0{index + 1}</i><span>{card.kicker}</span><strong>{card.title}</strong><p>{card.copy}</p><b>바로가기 →</b></Link>)}</div>
        </section>
        <section className="role-dashboard-collection">
          <div className="studio-panel-heading"><strong>내 저장 목록</strong><span>프로덕트·피처·행사·지원사업을 한곳에 모았어요.</span></div>
          {savedItems.length ? <div>{savedItems.map((item) => <Link href={item.href} key={`${item.type}-${item.slug}`}><span>{item.type}</span><strong>{item.title}</strong><small>{item.meta}</small><b>→</b></Link>)}</div> : <p>상세 페이지의 ♡ 저장 버튼을 누르면 여기에 표시됩니다.</p>}
        </section>
      </div>
    </main>
  </>;
}

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my");

  const { data: profile } = await supabase.from("profiles").select("full_name,member_type").eq("id", user.id).maybeSingle();
  const memberType = isMemberType(profile?.member_type ?? "") ? (profile?.member_type as MemberType) : "founder";
  const memberName = profile?.full_name?.trim() || user.user_metadata?.full_name || user.user_metadata?.name || "Featable 멤버";
  const { data: membershipRows } = await supabase.from("brand_members").select("member_role,brand:brands(id,slug,name,tagline,logo_url)").eq("user_id", user.id);
  const teamBrands = ((membershipRows ?? []) as unknown as { member_role: string; brand: { id: string; slug: string; name: string; tagline: string; logo_url: string | null } | null }[]).flatMap((row): TeamBrand[] => row.brand ? [{ id: row.brand.id, slug: row.brand.slug, name: row.brand.name, tagline: row.brand.tagline, logoUrl: row.brand.logo_url, role: row.member_role }] : []);

  if (memberType !== "founder") {
    const [{ data: savedRows }, { data: followedRows }, { data: supportedRows }, catalog, features, events, supportPrograms] = await Promise.all([
      supabase.from("saved_items").select("item_type,item_slug,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
      supabase.from("brand_follows").select("brand:brands(slug,name,tagline)").eq("user_id", user.id).limit(12),
      supabase.from("founder_supports").select("founder:founders(slug,name,headline)").eq("user_id", user.id).limit(12),
      getCatalog(),
      getFeatures(),
      getEvents(),
      getSupportPrograms(),
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
    return <MemberDashboard memberType={memberType} name={memberName} email={user.email ?? ""} savedItems={savedItems} teamBrands={teamBrands} />;
  }

  const { data: founder } = await supabase.from("founders").select("id,slug,name,headline,bio,avatar_url,sns").eq("user_id", user.id).maybeSingle();
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

  const publishedCount = brands.filter((brand) => brand.status === "published").length;
  const totalViews = products.reduce((sum, product) => sum + (product.view_count ?? 0), 0);

  // 임시저장: ① 비공개(draft) 상태로 저장된 프로덕트 ② 아직 등록 전인 작성 중 서버 초안
  const draftProducts = products.filter((product) => product.status !== "published");
  const { data: draftRows } = await supabase
    .from("submission_drafts")
    .select("draft_key,payload,updated_at")
    .eq("user_id", user.id)
    .like("draft_key", "product:%")
    .order("updated_at", { ascending: false });
  const writingDrafts = ((draftRows ?? []) as ProductDraftRow[]).filter(
    (row) => typeof row.payload === "object" && (row.payload.name?.trim() || row.payload.tagline?.trim()),
  );
  const fmtDraftDate = (iso: string) =>
    new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

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

  return <>
    <StudioNav founder />

    <main className="studio-dashboard">
      <div className="shell studio-dashboard-inner">
        <header className="ig-profile-head">
          <div className="ig-profile-avatar">{founder?.avatar_url ? <img src={founder.avatar_url} alt="" /> : <span>{(founder?.name || "F").slice(0, 1)}</span>}</div>
          <div className="ig-profile-main">
            <div className="ig-profile-top">
              <h1>{founder?.name ?? "Founder"}</h1>
              <Link className="ig-btn" href="/my/profile">프로필 편집</Link>
              <Link className="ig-btn primary" href={brands.length ? "/submit/product" : "/submit"}>{brands.length ? "＋ 프로덕트 등록" : "＋ 기업 정보 등록"}</Link>
            </div>
            <div className="ig-profile-stats">
              <div><strong>{brands.length}</strong><span>브랜드</span></div>
              <div><strong>{products.length}</strong><span>프로덕트</span></div>
              <div><strong>{publishedCount}</strong><span>공개 중</span></div>
              <div><strong>{totalViews.toLocaleString("ko-KR")}</strong><span>누적 조회</span></div>
            </div>
            <p className="ig-profile-bio">{founder?.headline || "브랜드와 프로덕트를 한 곳에서 관리하세요."}</p>
          </div>
        </header>

        <section className="ig-founder-preview team-profile-hub">
          <div className="studio-panel-heading">
            <strong>TEAM PROFILE</strong>
            <span>브랜드에 함께하는 사람과 공개 프로필을 관리하세요.</span>
          </div>
          {brands.length ? <div className="team-profile-brand-list">{brands.map((brand) => {
            const members = ownedTeamMembers.filter((member) => member.brand_id === brand.id);
            const invitations = pendingTeamInvites.filter((invitation) => invitation.brand_id === brand.id);
            return <article className="team-profile-brand" key={brand.id}>
              <header>
                <div className="team-profile-brand-logo">{brand.logo_url ? <img src={brand.logo_url} alt="" /> : <span>{brand.name.slice(0, 1)}</span>}</div>
                <div><small>BRAND TEAM</small><h3>{brand.name}</h3><p>대표 포함 {members.length + 1}명</p></div>
                <TeamInviteButton brandId={brand.id} brandName={brand.name} />
              </header>
              <div className="team-profile-member-list team-profile-card-grid">
                {founder && <div className="team-profile-admin-card owner">
                  <TeamProfileCard name={founder.name} title={founder.headline || "Founder"} avatarUrl={founder.avatar_url} bio={founder.bio} label="OWNER" meta={brand.name} href={`/founders/${founder.slug}`} actionLabel="프로필" />
                  <div className="team-owner-card-action"><span>브랜드 대표</span><Link href="/my/profile">내 카드 편집 →</Link></div>
                </div>}
                {members.map((member, index) => <div className="team-profile-admin-card" key={member.user_id}>
                  <TeamProfileCard name={member.display_name || "팀 멤버"} title={member.title || "팀 멤버"} avatarUrl={member.avatar_url} bio={member.bio} label={member.member_role === "editor" ? "EDITOR" : "VIEWER"} meta={brand.name} muted={!member.is_public} />
                  <TeamMemberControls brandId={brand.id} userId={member.user_id} name={member.display_name || "팀 멤버"} role={member.member_role} first={index === 0} last={index === members.length - 1} />
                </div>)}
                {!members.length && <div className="team-profile-add-card"><i>＋</i><strong>첫 팀원을 초대해보세요.</strong><span>위의 팀 초대 버튼으로 링크를 만들 수 있어요.</span></div>}
              </div>
              {invitations.length > 0 && <div className="team-pending-invites">
                <strong>초대 대기 {invitations.length}</strong>
                {invitations.map((invitation) => <div key={invitation.id}><span>{invitation.email}</span><small>{invitation.member_role === "editor" ? "편집 가능" : "보기만"}</small><PendingInviteControl invitationId={invitation.id} /></div>)}
              </div>}
              <footer><Link href={`/brands/${brand.slug}`} target="_blank">공개 팀 페이지 보기 →</Link></footer>
            </article>;
          })}</div> : (
            <div className="ig-founder-preview-empty">
              <p>팀 프로필은 브랜드를 등록하면 자동으로 시작됩니다.</p>
              <Link href="/submit">브랜드 등록하기 →</Link>
            </div>
          )}
        </section>

        {teamBrands.length > 0 && <section className="role-team-brands">
          <div className="studio-panel-heading"><strong>다른 팀에서 참여 중</strong><span>초대받아 공동 편집 중인 브랜드입니다.</span></div>
          <div>{teamBrands.map((brand) => <article key={brand.id}>{brand.logoUrl ? <img src={brand.logoUrl} alt="" /> : <i>{brand.name.slice(0, 1)}</i>}<div><span>{brand.role === "editor" ? "EDITOR" : "VIEWER"}</span><strong>{brand.name}</strong><small>{brand.tagline}</small></div><Link href={brand.role === "editor" ? `/my/edit/${brand.slug}` : `/brands/${brand.slug}`}>{brand.role === "editor" ? "워크스페이스 열기" : "브랜드 보기"} →</Link></article>)}</div>
        </section>}

        {brands.length === 0 && <section id="brands" className="studio-first-start">
          <div className="studio-first-copy">
            <span>START HERE</span>
            <h2>내 기업 정보를 먼저 등록해주세요.</h2>
            <p>기업 정보는 한 번만 만들고, 프로덕트와 상세페이지는 이후 자유롭게 추가할 수 있어요.</p>
            <Link href="/submit">기업 정보 등록<b>→</b></Link>
          </div>
          <ol>
            <li><i>1</i><div><strong>기업 정보 등록</strong><span>회사명, 로고, 한 줄 소개만 입력해요.</span></div></li>
            <li><i>2</i><div><strong>프로덕트 추가</strong><span>내 기업 아래 제품과 서비스를 등록해요.</span></div></li>
            <li><i>3</i><div><strong>상세페이지 제작</strong><span>각 프로덕트 안에서 이미지와 설명을 쌓아요.</span></div></li>
          </ol>
        </section>}

        {brands.length > 0 && <ProductAnalytics series={analyticsSeries} />}

        {(draftProducts.length > 0 || writingDrafts.length > 0) && <section className="ig-post-section">
          <div className="studio-panel-heading"><strong>임시저장한 프로덕트</strong><span>{draftProducts.length + writingDrafts.length}개 · 이어서 완성해보세요</span></div>
          <div className="grid gap-2">
            {draftProducts.map((product) => {
              const brand = brands.find((item) => item.id === product.brand_id);
              return (
                <div key={product.id} className="flex items-center gap-4 rounded-xl border border-border bg-white p-4">
                  {product.hero_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.hero_url} alt="" className="h-12 w-12 flex-none rounded-lg border border-border object-cover" />
                  ) : (
                    <div className="grid h-12 w-12 flex-none place-items-center rounded-lg bg-accent-soft text-sm font-black text-accent">{product.name.slice(0, 1)}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{product.name}
                      <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-muted">비공개 저장됨</span>
                    </p>
                    <p className="truncate text-xs text-muted">{brand?.name ?? "브랜드"} · 공개하면 홈 피드에 노출됩니다</p>
                  </div>
                  <Link href={`/my/product/${product.slug}`} className="flex-none rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent-hover">이어서 수정 →</Link>
                </div>
              );
            })}
            {writingDrafts.map((draft) => {
              const brand = brands.find((item) => item.id === draft.payload.brandId);
              const resumeHref = brand ? `/submit/product?brand=${brand.id}` : "/submit/product";
              return (
                <div key={draft.draft_key} className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-white p-4">
                  <div className="grid h-12 w-12 flex-none place-items-center rounded-lg bg-gray-100 text-sm font-black text-muted">✎</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{draft.payload.name?.trim() || "제목 없는 프로덕트"}
                      <span className="ml-2 rounded bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">작성 중</span>
                    </p>
                    <p className="truncate text-xs text-muted">{brand?.name ?? "브랜드"} · 마지막 저장 {fmtDraftDate(draft.updated_at)}</p>
                  </div>
                  <Link href={resumeHref} className="flex-none rounded-lg border border-border px-4 py-2 text-xs font-bold hover:border-accent hover:text-accent">이어서 작성 →</Link>
                </div>
              );
            })}
          </div>
        </section>}

        {brands.length > 0 && <section id="brands" className="ig-post-section">
          <div className="studio-panel-heading"><strong>내가 올린 브랜드</strong><span>{brands.length}개</span></div>
          <div className="ig-post-grid">
            <Link href="/submit" className="ig-post-tile ig-post-tile-add"><span>＋</span><strong>새 브랜드 등록</strong></Link>
            {brands.map((brand) => {
              const brandProducts = products.filter((product) => product.brand_id === brand.id);
              const brandViews = brandProducts.reduce((sum, product) => sum + (product.view_count ?? 0), 0);
              const tileImage = brandProducts.find((product) => product.hero_url)?.hero_url ?? brand.logo_url;
              return <article className="ig-post-tile" key={brand.id}>
                <div className="ig-post-tile-image">
                  {tileImage ? <img src={tileImage} alt="" /> : <span>{brand.name.slice(0, 1)}</span>}
                  <div className="ig-post-tile-status"><BrandStatusButton brandId={brand.id} published={brand.status === "published"} /></div>
                  <div className="ig-post-tile-views"><span aria-hidden="true">◉</span> {brandViews.toLocaleString("ko-KR")}</div>
                </div>
                <div className="ig-post-tile-body">
                  <strong>{brand.name}</strong>
                  <small>{brand.category} · {brandProducts.length}개 프로덕트</small>
                </div>
                <div className="studio-row-actions"><Link href={`/my/edit/${brand.slug}`}>수정</Link><Link href={`/brands/${brand.slug}`}>미리보기</Link><TeamInviteButton brandId={brand.id} brandName={brand.name} /><DeleteBrandButton brandId={brand.id} brandName={brand.name} /></div>
              </article>;
            })}
          </div>
        </section>
        }
      </div>
    </main>
  </>;
}
