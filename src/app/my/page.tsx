import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/login/actions";
import { DeleteBrandButton } from "./delete-button";
import { BrandStatusButton } from "./brand-status-button";
import { ProfileEditor } from "./profile-editor";
import { StudioBrand } from "@/components/site-shell";
import { isMemberType, type MemberType } from "@/lib/auth";

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

interface MyProduct { id: string; brand_id: string; name: string; view_count: number; status: string; }
interface SavedDraft { draft_key: string; payload: Record<string, unknown>; current_step: number; updated_at: string; }

const draftFieldNames = ["brandName", "tagline", "founderName", "founderHeadline", "description", "productName", "productTagline", "logoUrl", "heroUrl"];
function draftCompletion(draft: SavedDraft) {
  return Math.round((draftFieldNames.filter((key) => typeof draft.payload[key] === "string" && String(draft.payload[key]).trim()).length / draftFieldNames.length) * 100);
}

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

function MemberDashboard({ memberType, name, email }: { memberType: Exclude<MemberType, "founder">; name: string; email: string }) {
  const role = roleDashboard[memberType];

  return <>
    <div className="publish-console-nav"><div className="shell"><StudioBrand /><nav><Link className="active" href="/my">마이페이지</Link><Link href="/stories">피처</Link><Link href="/events">이벤트</Link><Link href="/support">기회</Link></nav><form action={signout}><button>로그아웃</button></form></div></div>
    <div className="publish-console-tabs"><div className="shell"><Link className="active" href="/my">홈</Link><Link href="/founders">Founder</Link><Link href="/products">프로덕트</Link><Link href="/communities">커뮤니티</Link></div></div>
    <main className="studio-dashboard role-dashboard">
      <div className="shell studio-dashboard-inner">
        <header className="role-dashboard-hero">
          <div><p>{role.eyebrow}</p><span>{role.label}</span><h1>{name}님,<br />{role.title}</h1><small>{role.description}</small></div>
          <Link href={role.primary.href}>{role.primary.label}<b>→</b></Link>
        </header>
        <section className="role-dashboard-state">
          <div className="role-dashboard-avatar">{name.slice(0, 1) || "F"}</div>
          <div><span>MY ROLE · {role.label}</span><strong>{role.emptyTitle}</strong><p>{role.emptyCopy}</p></div>
          <small>{email}</small>
        </section>
        <section className="role-dashboard-links">
          <div className="studio-panel-heading"><strong>{role.label}에게 필요한 메뉴</strong><span>선택한 역할을 기준으로 구성했어요.</span></div>
          <div>{role.cards.map((card, index) => <Link href={card.href} key={card.href}><i>0{index + 1}</i><span>{card.kicker}</span><strong>{card.title}</strong><p>{card.copy}</p><b>바로가기 →</b></Link>)}</div>
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

  if (memberType !== "founder") {
    return <MemberDashboard memberType={memberType} name={memberName} email={user.email ?? ""} />;
  }

  const { data: founder } = await supabase.from("founders").select("id,slug,name,headline,bio,avatar_url,sns").eq("user_id", user.id).maybeSingle();
  const sns = (founder?.sns ?? {}) as { instagram?: string; x?: string; linkedin?: string; website?: string };

  let brands: MyBrand[] = [];
  let products: MyProduct[] = [];
  if (founder) {
    const { data: brandRows } = await supabase.from("brands").select("id,slug,name,logo_url,tagline,category,status,updated_at").eq("founder_id", founder.id).order("updated_at", { ascending: false });
    brands = (brandRows ?? []) as MyBrand[];
    if (brands.length) {
      const { data: productRows } = await supabase.from("products").select("id,brand_id,name,view_count,status").in("brand_id", brands.map((brand) => brand.id));
      products = (productRows ?? []) as MyProduct[];
    }
  }

  const { data: draftRows } = await supabase.from("submission_drafts").select("draft_key,payload,current_step,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false });
  const savedDrafts = (draftRows ?? []) as SavedDraft[];
  const publishedCount = brands.filter((brand) => brand.status === "published").length;
  const totalViews = products.reduce((sum, product) => sum + (product.view_count ?? 0), 0);

  return <>
    <div className="publish-console-nav"><div className="shell"><StudioBrand /><nav><Link className="active" href="/my">대시보드</Link><a href="#brands">브랜드 관리</a><a href="#profile">Founder 프로필</a><Link href="/submit">새 프로젝트</Link></nav><form action={signout}><button>로그아웃</button></form></div></div>
    <div className="publish-console-tabs"><div className="shell"><Link className="active" href="/my">워크스페이스 홈</Link><a href="#brands">콘텐츠</a><a href="#profile">프로필 설정</a>{founder?.slug && <Link href={`/founders/${founder.slug}`}>공개 페이지 바로가기 ↗</Link>}</div></div>

    <main className="studio-dashboard">
      <div className="shell studio-dashboard-inner">
        <header className="studio-owner-head">
          <div className="studio-owner-avatar">{founder?.avatar_url ? <img src={founder.avatar_url} alt="" /> : <span>{(founder?.name || "F").slice(0, 1)}</span>}</div>
          <div><p>FOUNDER WORKSPACE</p><h1>{founder?.name ?? "Founder"}님의 스튜디오</h1><span>{founder?.headline || "브랜드와 프로덕트를 한 곳에서 관리하세요."}</span></div>
          <Link href="/submit">새 프로젝트 만들기 <b>＋</b></Link>
        </header>

        <section className="studio-overview-panel">
          <div className="studio-panel-heading"><strong>워크스페이스 인사이트</strong><span>현재 등록된 프로젝트를 기준으로 집계됩니다.</span></div>
          <div className="studio-overview-grid">
            <a href="#brands"><span>전체 조회수</span><strong>{totalViews.toLocaleString("ko-KR")}</strong><small>프로덕트 누적</small></a>
            <a href="#brands"><span>공개 중</span><strong>{publishedCount}<em>개</em></strong><small>전체 브랜드 {brands.length}개</small></a>
            <a href="#brands"><span>프로덕트</span><strong>{products.length}<em>개</em></strong><small>등록된 제품과 서비스</small></a>
            <Link href={savedDrafts[0] ? `/submit?draft=${encodeURIComponent(savedDrafts[0].draft_key)}` : "/submit"}><span>작성 중 초안</span><strong>{savedDrafts.length}<em>개</em></strong><small>{savedDrafts.length ? "최근 초안 이어서 작성" : "새 초안 만들기"}</small></Link>
          </div>
        </section>

        {savedDrafts.length > 0 && <div className="studio-draft-list">{savedDrafts.map((savedDraft) => {
          const completion = draftCompletion(savedDraft);
          const draftName = typeof savedDraft.payload.brandName === "string" && savedDraft.payload.brandName.trim() ? savedDraft.payload.brandName : "새 브랜드";
          return <section className="studio-draft-banner" key={savedDraft.draft_key}>
            <div><span>작성 중</span><strong>{draftName}</strong><p>STEP {savedDraft.current_step + 1}에서 멈췄어요 · {completion}% 완료</p></div>
            <div className="studio-draft-progress"><i style={{ width: `${completion}%` }} /></div>
            <time>{new Date(savedDraft.updated_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} 저장</time>
            <Link href={`/submit?draft=${encodeURIComponent(savedDraft.draft_key)}`}>이어서 작성 →</Link>
          </section>;
        })}</div>}

        <section id="brands" className="studio-content-panel">
          <div className="studio-panel-heading"><strong>브랜드와 프로덕트</strong><span>{brands.length}개의 브랜드</span><Link href="/submit">＋ 새 브랜드</Link></div>
          {brands.length === 0 ? <div className="studio-empty"><span>＋</span><strong>첫 브랜드를 등록해보세요.</strong><p>기본 정보부터 상세페이지까지 단계별로 만들 수 있습니다.</p><Link href="/submit">등록 시작하기</Link></div> : <div className="studio-brand-table">
            <div className="studio-brand-table-head"><span>브랜드</span><span>프로덕트</span><span>조회수</span><span>공개 상태</span><span>관리</span></div>
            {brands.map((brand) => {
              const brandProducts = products.filter((product) => product.brand_id === brand.id);
              const brandViews = brandProducts.reduce((sum, product) => sum + (product.view_count ?? 0), 0);
              return <div className="studio-brand-row" key={brand.id}>
                <div className="studio-brand-identity">{brand.logo_url ? <img src={brand.logo_url} alt="" /> : <span>{brand.name.slice(0, 1)}</span>}<div><strong>{brand.name}</strong><small>{brand.category} · {brand.tagline}</small></div></div>
                <div><strong>{brandProducts.length}개</strong><small>{brandProducts.map((product) => product.name).join(", ") || "등록 전"}</small></div>
                <div><strong>{brandViews.toLocaleString("ko-KR")}</strong><small>누적 조회</small></div>
                <BrandStatusButton brandId={brand.id} published={brand.status === "published"} />
                <div className="studio-row-actions"><Link href={`/my/edit/${brand.slug}`}>수정</Link><Link href={`/brands/${brand.slug}`}>미리보기</Link><DeleteBrandButton brandId={brand.id} brandName={brand.name} /></div>
              </div>;
            })}
          </div>}
        </section>

        <section id="profile" className="studio-profile-panel"><div className="studio-panel-heading"><strong>Founder 프로필</strong><span>공개 프로필에 표시되는 정보입니다.</span></div><ProfileEditor brandCount={brands.length} initial={{ slug: founder?.slug, name: founder?.name ?? "", headline: founder?.headline ?? "", bio: founder?.bio ?? "", avatarUrl: founder?.avatar_url ?? "", instagram: sns.instagram ?? "", x: sns.x ?? "", linkedin: sns.linkedin ?? "", website: sns.website ?? "" }} /></section>
      </div>
    </main>
  </>;
}
