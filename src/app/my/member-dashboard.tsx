import Link from "next/link";
import Image from "next/image";
import { TeamProfileCard } from "@/components/team-profile-card";
import type { MemberType } from "@/lib/auth";
import { DashNav } from "./dash-nav";
import { StudioWelcomeGuide } from "./studio-welcome-guide";
import type { DashboardTeamMember } from "./founder-dashboard";

export interface SavedCollectionItem {
  readonly type: string;
  readonly slug: string;
  readonly title: string;
  readonly meta: string;
  readonly href: string;
}

export interface TeamBrand {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly tagline: string;
  readonly logoUrl: string | null;
  readonly role: string;
}

export interface TeamHubBrand {
  readonly brand: TeamBrand;
  readonly owner: {
    readonly slug: string;
    readonly name: string;
    readonly headline: string;
    readonly bio: string | null;
    readonly avatar_url: string | null;
  } | null;
  readonly members: readonly DashboardTeamMember[];
}

const ROLE_DASHBOARD = {
  team: {
    eyebrow: "TEAM WORKSPACE", label: "팀 멤버", title: "팀의 다음 작업을 이어가세요.", description: "참여 중인 브랜드와 공동 작업을 한곳에서 확인하는 공간입니다.", primary: { href: "/brands", label: "브랜드 둘러보기" }, emptyTitle: "아직 연결된 팀이 없어요.", emptyCopy: "팀 초대를 받으면 참여 중인 브랜드와 작성 중인 콘텐츠가 여기에 표시됩니다.",
    cards: [{ href: "/stories", kicker: "REFERENCE", title: "잘 만든 피처 살펴보기", copy: "다른 팀의 스토리와 구성 방식을 참고해보세요." }, { href: "/events", kicker: "NETWORK", title: "팀과 함께할 행사 찾기", copy: "데모데이와 네트워킹 일정을 확인하세요." }, { href: "/support", kicker: "OPPORTUNITY", title: "지원사업 확인하기", copy: "지금 지원할 수 있는 프로그램을 모아봅니다." }],
  },
  explorer: {
    eyebrow: "DISCOVERY HOME", label: "예비 창업가", title: "다음 시작을 발견해보세요.", description: "먼저 시작한 사람과 제품, 지금 참여할 수 있는 기회를 모았습니다.", primary: { href: "/stories", label: "추천 피처 보기" }, emptyTitle: "관심 있는 Founder를 찾아보세요.", emptyCopy: "저장과 팔로우 기능이 연결되면 나만의 발견 목록이 이곳에 쌓입니다.",
    cards: [{ href: "/founders", kicker: "PEOPLE", title: "Founder 만나기", copy: "제품보다 먼저, 만드는 사람의 이야기를 발견하세요." }, { href: "/products", kicker: "PRODUCT", title: "새 프로덕트 보기", copy: "막 나온 제품과 서비스를 빠르게 살펴보세요." }, { href: "/events", kicker: "EVENT", title: "이번 주 행사 찾기", copy: "직접 만나고 연결될 수 있는 자리를 확인하세요." }],
  },
  partner: {
    eyebrow: "PARTNER CENTER", label: "파트너", title: "좋은 기회를 더 멀리 연결하세요.", description: "행사와 지원사업, 커뮤니티를 Founder에게 소개하는 파트너 공간입니다.", primary: { href: "/events", label: "행사 페이지 보기" }, emptyTitle: "파트너 등록 도구를 준비하고 있어요.", emptyCopy: "곧 행사·지원사업을 직접 등록하고 성과를 확인할 수 있습니다.",
    cards: [{ href: "/events", kicker: "EVENT", title: "행사 큐레이션", copy: "현재 공개된 행사와 운영 방식을 살펴보세요." }, { href: "/support", kicker: "PROGRAM", title: "지원사업 모아보기", copy: "Founder에게 필요한 지원 기회를 확인하세요." }, { href: "/communities", kicker: "COMMUNITY", title: "커뮤니티 연결하기", copy: "함께 성장하는 창업 커뮤니티를 만나보세요." }],
  },
} satisfies Record<Exclude<MemberType, "founder">, {
  readonly eyebrow: string;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly primary: { readonly href: string; readonly label: string };
  readonly emptyTitle: string;
  readonly emptyCopy: string;
  readonly cards: readonly { readonly href: string; readonly kicker: string; readonly title: string; readonly copy: string }[];
}>;

interface MemberDashboardProps {
  readonly memberType: Exclude<MemberType, "founder">;
  readonly name: string;
  readonly email: string;
  readonly savedItems: readonly SavedCollectionItem[];
  readonly teamBrands: readonly TeamBrand[];
  readonly teamHub?: readonly TeamHubBrand[];
  readonly myUserId: string;
}

export function MemberDashboard({ memberType, name, email, savedItems, teamBrands, teamHub = [], myUserId }: MemberDashboardProps) {
  const role = ROLE_DASHBOARD[memberType];
  const stateTitle = teamBrands.length ? `${teamBrands.length}개 브랜드의 팀으로 참여 중이에요.` : savedItems.length ? `${savedItems.length}개의 항목을 저장했어요.` : role.emptyTitle;
  const stateCopy = teamBrands.length ? "초대받은 브랜드의 콘텐츠를 함께 편집할 수 있습니다." : savedItems.length ? "관심 있는 콘텐츠를 다시 확인하고 다음 행동으로 이어가세요." : role.emptyCopy;

  return <>
    <StudioWelcomeGuide userId={myUserId} memberType={memberType} />
    <DashNav />
    <main className="dash-page dash"><div className="shell dash-shell">
      <header className="dash-hero"><div><p>{role.eyebrow}</p><span>{role.label}</span><h1>{name}님,<br />{role.title}</h1><small>{role.description}</small></div><Link href={role.primary.href}>{role.primary.label}<b>→</b></Link></header>
      <section className="dash-state-row"><div className="dash-avatar">{name.slice(0, 1) || "F"}</div><div><span>MY ROLE · {role.label}</span><strong>{stateTitle}</strong><p>{stateCopy}</p></div><small>{email}</small></section>
      {teamHub.length > 0 && <section className="ig-founder-preview dash-team-hub"><div className="dash-panel-title"><strong>TEAM PROFILE</strong><span>참여 중인 브랜드의 팀과 공개 프로필입니다.</span></div><div className="dash-team-brand-list">{teamHub.map(({ brand, owner, members }) => <article className="dash-team-brand" key={brand.id}>
        <header><div className="dash-team-brand-logo">{brand.logoUrl ? <Image src={brand.logoUrl} alt="" width={56} height={56} unoptimized /> : <span>{brand.name.slice(0, 1)}</span>}</div><div><small>BRAND TEAM</small><h3>{brand.name}</h3><p>대표 포함 {members.length + (owner ? 1 : 0)}명 · 내 역할 {brand.role === "editor" ? "EDITOR" : "VIEWER"}</p></div><Link className="dash-team-hub-edit-link" href={`/my/team/${brand.id}`}>내 팀 카드 편집 →</Link></header>
        <div className="dash-team-member-list dash-team-card-grid">{owner && <div className="dash-team-admin-card owner"><TeamProfileCard name={owner.name} title={owner.headline || "Founder"} avatarUrl={owner.avatar_url} bio={owner.bio} label="대표" href={`/founders/${owner.slug}`} actionLabel="프로필" /></div>}{members.map((member) => <div className="dash-team-admin-card" key={member.user_id}><TeamProfileCard name={member.display_name || "팀 멤버"} title={member.title || "팀 멤버"} avatarUrl={member.avatar_url} bio={member.bio} label={member.member_role === "editor" ? "편집자" : "열람"} muted={!member.is_public} />{member.user_id === myUserId && <div className="team-owner-card-action"><span>내 카드</span><Link href={`/my/team/${brand.id}`}>내 카드 편집 →</Link></div>}</div>)}</div>
        <footer><Link href={`/brands/${brand.slug}`} target="_blank">공개 팀 페이지 보기 →</Link></footer>
      </article>)}</div></section>}
      <section className="dash-cta-card"><div><strong>만드는 사람이기도 한가요?</strong><p>역할을 바꾸지 않아도 바로 올릴 수 있어요. 인터뷰는 사진 한 장과 질문 답변이면 충분합니다.</p></div><div className="dash-cta-row"><Link className="button" href="/submit/interview">내 인터뷰 쓰기 →</Link><Link href="/my/brand/new">브랜드 등록하기</Link></div></section>
      <section className="dash-links"><div className="dash-panel-title"><strong>{role.label}에게 필요한 메뉴</strong><span>선택한 역할을 기준으로 구성했어요.</span></div><div>{role.cards.map((card, index) => <Link href={card.href} key={card.href}><i>0{index + 1}</i><span>{card.kicker}</span><strong>{card.title}</strong><p>{card.copy}</p><b>바로가기 →</b></Link>)}</div></section>
      <section className="dash-collection"><div className="dash-panel-title"><strong>내 저장 목록</strong><span>프로덕트·피처·행사·지원사업을 한곳에 모았어요.</span></div>{savedItems.length ? <div>{savedItems.map((item) => <Link href={item.href} key={`${item.type}-${item.slug}`}><span>{item.type}</span><strong>{item.title}</strong><small>{item.meta}</small><b>→</b></Link>)}</div> : <p>상세 페이지의 저장 버튼을 누르면 여기에 표시됩니다.</p>}</section>
    </div></main>
  </>;
}
