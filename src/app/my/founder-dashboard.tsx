import Link from "next/link";
import Image from "next/image";
import { BrandStatusButton } from "./brand-status-button";
import { DashNav } from "./dash-nav";
import { DeleteBrandButton } from "./delete-button";
import { DraftDeleteButton } from "./draft-delete-button";
import { ProductAnalytics, type AnalyticsDay } from "./product-analytics";
import { StudioWelcomeGuide } from "./studio-welcome-guide";
import { PendingInviteControl } from "./team-management-controls";
import { TeamInviteButton } from "./team-invite-button";
import type { BrandMemberRole } from "./team-actions";
import { formatDateTimeKst } from "@/lib/datetime";

export interface DashboardBrand {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly logo_url: string | null;
  readonly tagline: string;
  readonly category: string;
  readonly status: "draft" | "published" | "hidden";
  readonly updated_at: string;
}

export interface DashboardProduct {
  readonly id: string;
  readonly brand_id: string;
  readonly slug: string;
  readonly name: string;
  readonly hero_url: string | null;
  readonly view_count: number;
  readonly status: string;
}

export interface DashboardStory {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly kind: string;
  readonly cover_url: string | null;
  readonly view_count: number | null;
  readonly status: string;
  readonly published_at: string | null;
  readonly hook_label: string | null;
}

export interface DashboardDraft {
  readonly draft_key: string;
  readonly payload: { readonly name?: string; readonly tagline?: string; readonly brandId?: string };
  readonly updated_at: string;
}

export interface DashboardTeamMember {
  readonly brand_id: string;
  readonly user_id: string;
  readonly display_name: string | null;
  readonly title: string;
  readonly bio: string | null;
  readonly avatar_url: string | null;
  readonly is_public: boolean;
  readonly member_role: BrandMemberRole;
  readonly sort_order: number;
}

export interface DashboardInvite {
  readonly id: string;
  readonly brand_id: string;
  readonly email: string;
  readonly member_role: BrandMemberRole;
  readonly expires_at: string;
}

interface FounderDashboardProps {
  readonly userId: string;
  readonly founder: {
    readonly name: string;
    readonly roleTitle: string;
    readonly avatarUrl: string | null;
  } | null;
  readonly brands: readonly DashboardBrand[];
  readonly products: readonly DashboardProduct[];
  readonly stories: readonly DashboardStory[];
  readonly storyLikes: Readonly<Record<string, number>>;
  readonly teamMembers: readonly DashboardTeamMember[];
  readonly pendingInvites: readonly DashboardInvite[];
  readonly writingDrafts: readonly DashboardDraft[];
  readonly analyticsSeries: readonly AnalyticsDay[];
}

const QUICK_LINKS = [
  { href: "/submit/event", title: "행사 등록", copy: "팝업·모임을 열고 모집하세요", icon: "calendar" },
  { href: "/submit/community", title: "커뮤니티 만들기", copy: "함께 만드는 창업가 네트워크", icon: "people" },
  { href: "/my/partner/register", title: "파트너 등록", copy: "지원사업·혜택을 알려주세요", icon: "plus" },
  { href: "/my/jobs/new", title: "채용 올리기", copy: "팀원을 찾는 가장 빠른 방법", icon: "briefcase" },
] as const;

function QuickIcon({ name }: { readonly name: (typeof QUICK_LINKS)[number]["icon"] }) {
  if (name === "calendar") return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
  if (name === "people") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.2a4 4 0 0 1 0 7.6"/></svg>;
  if (name === "plus") return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
}

export function FounderDashboard({ userId, founder, brands, products, stories, storyLikes, teamMembers, pendingInvites, writingDrafts, analyticsSeries }: FounderDashboardProps) {
  const publishedProducts = products.filter((product) => product.status === "published");
  const draftProducts = products.filter((product) => product.status !== "published");
  const draftBrands = brands.filter((brand) => brand.status !== "published");
  const totalViews = products.reduce((sum, product) => sum + (product.view_count ?? 0), 0)
    + stories.reduce((sum, story) => sum + (story.view_count ?? 0), 0);
  const mainBrand = brands[0];
  const role = [founder?.roleTitle, mainBrand?.name].filter(Boolean).join(" · ") || "브랜드와 프로덕트를 한 곳에서 관리하세요.";

  return <>
    <StudioWelcomeGuide userId={userId} memberType="founder" />
    <DashNav founder />
    <main className="dash-page">
      <div className="shell dash-shell">
        <section className="dash-hero-card">
          <div className="dash-profile-head">
            <div className="dash-profile-avatar">{founder?.avatarUrl ? <Image src={founder.avatarUrl} alt="" width={76} height={76} unoptimized /> : <span>{(founder?.name || "F").slice(0, 1)}</span>}</div>
            <div className="dash-profile-main">
              <h1>{founder?.name ?? "Founder"}{founder && <span className="dash-check" aria-label="인증된 Founder">✓</span>}</h1>
              <p className="dash-profile-role">{role}</p>
            </div>
          </div>
          <div className="dash-stat-strip">
            <div><b>{brands.length}</b><span>브랜드</span></div>
            <div><b>{products.length}</b><span>프로덕트</span></div>
            <div className="accent"><b>{totalViews.toLocaleString("ko-KR")}</b><span>누적 조회</span></div>
            <div><b>{analyticsSeries.reduce((sum, day) => sum + day.clicks, 0).toLocaleString("ko-KR")}</b><span>링크 클릭</span></div>
          </div>
        </section>

        {(draftBrands.length > 0 || draftProducts.length > 0) && <section className="dash-unpublished-alert">
          <div><strong>아직 공개되지 않은 항목이 {draftBrands.length + draftProducts.length}개 있어요.</strong><p>공개해야 다른 사람들이 발견할 수 있어요.</p></div>
          <div className="dash-unpublished-links">
            {draftBrands.map((brand) => <span className="dash-unpublished-item" key={brand.id}><b>{brand.name}</b><BrandStatusButton brandId={brand.id} published={false} /></span>)}
            {draftProducts.map((product) => <Link className="dash-unpublished-item" href={`/my/product/${product.slug}`} key={product.id}><b>{product.name}</b><em>공개하기 →</em></Link>)}
          </div>
        </section>}

        {brands.length === 0 && <section className="dash-first-start">
          <div className="dash-first-copy"><span>처음 시작하기</span><h2>가장 쉬운 시작은 내 이야기예요.</h2><p>인터뷰는 기업 정보 없이도 올릴 수 있어요.<span>기업 등록은 나중에 해도 됩니다.</span></p><Link href="/submit/interview">인터뷰 쓰기 →</Link><Link className="dash-first-alt" href="/my/brand/new">기업 정보 등록하기</Link></div>
        </section>}

        <div className="dash-cols">
          <div className="dash-main">
            {brands.length > 0 && <ProductAnalytics series={analyticsSeries} />}

            {stories.length > 0 && <section className="dash-section dash-panel">
              <div className="dash-panel-head"><strong>내 인터뷰</strong><small>{stories.length}개</small></div>
              <div className="dash-rows">{stories.map((story) => <article className="dash-row-item" key={story.id}>
                {story.cover_url ? <Image src={story.cover_url} alt="" width={52} height={52} unoptimized className="dash-row-thumb" /> : <div className="dash-row-thumb is-initial">인</div>}
                <div className="dash-row-info"><strong>{story.hook_label ?? story.title}<span className={story.status === "published" ? "badge-live" : "badge-draft"}>{story.status === "published" ? "공개 중" : "비공개"}</span></strong><small>{story.title} · 좋아요 {(storyLikes[story.slug] ?? 0).toLocaleString("ko-KR")}</small></div>
                <div className="dash-row-views"><b>{(story.view_count ?? 0).toLocaleString("ko-KR")}</b><span>조회수</span></div>
                <Link className="dash-btn-secondary" href={`/submit/interview?edit=${encodeURIComponent(story.slug)}`}>수정</Link><Link className="dash-btn-ghost" href={`/stories/${story.slug}`}>공개 페이지</Link>
              </article>)}</div>
            </section>}

            {brands.length > 0 && <section id="products" className="dash-section dash-panel">
              <div className="dash-panel-head"><strong>내 프로덕트 <small>{publishedProducts.length}개 · 공개 중</small></strong><Link className="dash-btn-primary" href="/submit/product">새 프로덕트 등록</Link></div>
              {publishedProducts.length > 0 ? <div className="dash-rows">{publishedProducts.map((product) => {
                const brand = brands.find((item) => item.id === product.brand_id);
                return <article className="dash-row-item" key={product.id}>
                  {product.hero_url ? <Image src={product.hero_url} alt="" width={52} height={52} unoptimized className="dash-row-thumb" /> : <div className="dash-row-thumb is-initial">{product.name.slice(0, 1)}</div>}
                  <div className="dash-row-info"><strong>{product.name}<span className="badge-live">공개 중</span></strong><small>{brand?.name ?? "브랜드"}</small></div>
                  <div className="dash-row-views"><b>{(product.view_count ?? 0).toLocaleString("ko-KR")}</b><span>조회수</span></div>
                  <Link className="dash-btn-ghost" href={`/products/${product.slug}`} target="_blank">공개 페이지</Link><Link className="dash-btn-secondary" href={`/my/product/${product.slug}`}>수정</Link>
                </article>;
              })}</div> : <p className="dash-empty-note">등록된 프로덕트가 없어요.</p>}
            </section>}

            {(draftProducts.length > 0 || writingDrafts.length > 0) && <section className="dash-section dash-panel">
              <div className="dash-panel-head"><div><strong>임시저장 <small>{draftProducts.length + writingDrafts.length}개</small></strong><p>작성을 완료하지 않은 프로덕트예요.</p></div></div>
              <div className="dash-rows">
                {draftProducts.map((product) => <article className="dash-row-item is-draft" key={product.id}><div className="dash-row-thumb is-initial is-dashed">{product.name.slice(0, 1)}</div><div className="dash-row-info"><strong>{product.name}<span className="badge-draft">비공개</span></strong><small>공개하면 홈 피드에 노출됩니다.</small></div><Link className="dash-btn-secondary" href={`/my/product/${product.slug}`}>이어서 수정</Link><span className="dash-delete-action"><DraftDeleteButton kind="product" id={product.id} name={product.name} /></span></article>)}
                {writingDrafts.map((draft) => { const brand = brands.find((item) => item.id === draft.payload.brandId); return <article className="dash-row-item is-draft" key={draft.draft_key}><div className="dash-row-thumb is-initial is-dashed" aria-hidden="true">+</div><div className="dash-row-info"><strong>{draft.payload.name?.trim() || "제목 없는 프로덕트"}<span className="badge-draft">작성 중</span></strong><small>{brand?.name ?? "브랜드"} · 마지막 저장 {formatDateTimeKst(draft.updated_at)}</small><div className="draft-progress"><i /></div></div><Link className="dash-btn-secondary" href={brand ? `/submit/product?brand=${brand.id}` : "/submit/product"}>이어서 작성</Link><span className="dash-delete-action"><DraftDeleteButton kind="draft" id={draft.draft_key} name={draft.payload.name?.trim() || "제목 없는 프로덕트"} /></span></article>; })}
              </div>
            </section>}

            <section className="cta-band"><div><h3>다음 발견을 준비하세요</h3><p>새 프로덕트나 인터뷰를 등록하고 더 많은 사람을 만나보세요.</p></div><Link className="dash-btn-primary" href="/submit/interview">인터뷰 등록</Link></section>
          </div>

          <aside className="side-stack">
            {brands.length > 0 && <section id="brands" className="dash-panel"><div className="dash-panel-head"><strong>내 브랜드</strong></div><div className="dash-rows">{brands.map((brand) => {
              const brandProducts = products.filter((item) => item.brand_id === brand.id);
              return <div className="dash-brand-block" key={brand.id}><div className="dash-brand-summary">{brand.logo_url ? <Image src={brand.logo_url} alt="" width={44} height={44} unoptimized className="dash-row-thumb" /> : <div className="dash-row-thumb is-initial">{brand.name.slice(0, 1)}</div>}<div className="dash-row-info"><strong>{brand.name}<span className={brand.status === "published" ? "badge-live" : "badge-draft"}>{brand.status === "published" ? "공개" : "비공개"}</span></strong><small>{brand.category || "브랜드"} · 프로덕트 {brandProducts.length}개</small></div></div><div className="dash-brand-actions"><Link className="dash-btn-ghost" href={`/my/edit/${brand.slug}`}>수정</Link><Link className="dash-btn-ghost" href={`/brands/${brand.slug}`} target="_blank">미리보기</Link><TeamInviteButton brandId={brand.id} brandName={brand.name} /><DeleteBrandButton brandId={brand.id} brandName={brand.name} /></div></div>;
            })}</div></section>}

            {teamMembers.length > 0 && mainBrand && <section className="dash-panel"><div className="dash-panel-head"><strong>브랜드 팀</strong><Link href={`/my/team/${mainBrand.id}`}>관리 →</Link></div><div className="dash-rows">{teamMembers.map((member) => <div className="dash-team-member" key={member.user_id}>{member.avatar_url ? <Image src={member.avatar_url} alt="" width={44} height={44} unoptimized className="dash-row-thumb" /> : <div className="dash-row-thumb is-initial">{(member.display_name || "팀").slice(0, 1)}</div>}<div className="dash-row-info"><strong>{member.display_name || "팀 멤버"}</strong><small>{member.title || "팀 멤버"}{member.is_public ? "" : " · 비공개"}</small></div></div>)}</div></section>}

            {pendingInvites.length > 0 && <section className="dash-panel"><div className="dash-panel-head"><strong>초대 대기</strong><small>{pendingInvites.length}명</small></div><div className="dash-rows">{pendingInvites.map((invite) => <div className="dash-row-item" key={invite.id}><div className="dash-row-info"><strong>{invite.email}</strong><small>{invite.member_role === "editor" ? "편집 가능" : "보기만"}</small></div><PendingInviteControl invitationId={invite.id} /></div>)}</div></section>}

            <nav className="dash-panel dash-quick" aria-label="빠른 등록 메뉴">{QUICK_LINKS.map((item) => <Link href={item.href} key={item.href}><span className="q-ico"><QuickIcon name={item.icon} /></span><span><b>{item.title}</b><small>{item.copy}</small></span><span className="arr" aria-hidden="true">›</span></Link>)}</nav>
          </aside>
        </div>
      </div>
    </main>
  </>;
}
