import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "./admin-ui";

const memberLabels: Record<string, string> = {
  founder: "창업가·대표",
  team: "팀 멤버",
  explorer: "예비 창업가",
  partner: "파트너",
  unknown: "역할 미설정",
};

const contentSections = [
  { label: "브랜드", href: "/admin/brands" },
  { label: "프로덕트", href: "/admin/products" },
  { label: "스토리", href: "/admin/stories" },
  { label: "행사", href: "/admin/events" },
] as const;

const dateKey = (date: Date | string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date(date));
const shortDate = (date: string) => new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", timeZone: "Asia/Seoul" }).format(new Date(date));
const percent = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0;

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  member_type: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
}

/** 최근 7일 구간의 시작(6일 전 자정) — 렌더 중 Date.now() 직접 호출을 피한다 */
function sevenDayWindowStart(): Date {
  const start = new Date(Date.now() - 6 * 86_400_000);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const weekStart = sevenDayWindowStart();

  const [profilesResult, founderCountResult, brandCountResult, productCountResult, featureCountResult, eventCountResult, pendingBrandsResult, pendingProductsResult, pendingSubmissionsResult, pendingInquiriesResult] = await Promise.all([
    supabase.from("profiles").select("id,email,full_name,member_type,onboarding_completed_at,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(2000),
    supabase.from("founders").select("id", { count: "exact", head: true }),
    supabase.from("brands").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("features").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("brands").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("partner_submissions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("partnership_inquiries").select("id", { count: "exact", head: true }).in("status", ["new", "reviewing"]),
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const totalUsers = profilesResult.count ?? profiles.length;
  const newUsers = profiles.filter((profile) => new Date(profile.created_at) >= weekStart);
  const onboardedUsers = profiles.filter((profile) => profile.onboarding_completed_at).length;
  const founderProfiles = founderCountResult.count ?? 0;
  const roleCounts = profiles.reduce<Record<string, number>>((counts, profile) => {
    const key = profile.member_type || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const maxRoleCount = Math.max(1, ...Object.values(roleCounts));
  const queueItems = [
    { label: "브랜드 초안", count: pendingBrandsResult.count ?? 0, href: "/admin/brands" },
    { label: "프로덕트 초안", count: pendingProductsResult.count ?? 0, href: "/admin/products" },
    { label: "파트너 제안", count: pendingSubmissionsResult.count ?? 0, href: "/admin/submissions" },
    { label: "파트너 문의", count: pendingInquiriesResult.count ?? 0, href: "/admin/inquiries" },
  ];
  const totalQueue = queueItems.reduce((sum, item) => sum + item.count, 0);
  const contentCounts = [brandCountResult.count, productCountResult.count, featureCountResult.count, eventCountResult.count];
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart.getTime() + index * 86_400_000);
    const key = dateKey(date);
    return {
      key,
      label: new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "Asia/Seoul" }).format(date),
      count: newUsers.filter((profile) => dateKey(profile.created_at) === key).length,
    };
  });
  const maxDailySignups = Math.max(1, ...days.map((day) => day.count));

  return (
    <main className="admin-main shell admin-analytics-page">
      <AdminPageHeader eyebrow="USER ANALYTICS" title="사용자 현황" description="가입부터 Founder 전환까지, Featable의 성장 흐름을 한눈에 확인하세요." />

      <section className="admin-growth-metrics" aria-label="핵심 사용자 지표">
        <article className="primary"><span>전체 가입자</span><strong>{totalUsers.toLocaleString("ko-KR")}<em>명</em></strong><p>Featable에 가입한 전체 계정</p></article>
        <article><span>최근 7일 신규</span><strong>+{newUsers.length.toLocaleString("ko-KR")}<em>명</em></strong><p>일평균 {(newUsers.length / 7).toFixed(1)}명 가입</p></article>
        <article><span>온보딩 완료</span><strong>{percent(onboardedUsers, totalUsers)}<em>%</em></strong><p>{onboardedUsers.toLocaleString("ko-KR")}명이 역할 설정 완료</p></article>
        <article><span>Founder 프로필</span><strong>{founderProfiles.toLocaleString("ko-KR")}<em>명</em></strong><p>가입자 대비 {percent(founderProfiles, totalUsers)}% 전환</p></article>
      </section>

      <section className="admin-analytics-grid">
        <article className="admin-analytics-panel signup-chart-panel">
          <header><div><span>7 DAY GROWTH</span><h2>신규 가입 추이</h2></div><strong>+{newUsers.length}</strong></header>
          <div className="admin-signup-chart" aria-label="최근 7일 일별 가입자 수">
            {days.map((day) => <div key={day.key}><span className="bar-track"><i style={{ height: `${Math.max(day.count ? 12 : 2, (day.count / maxDailySignups) * 100)}%` }} /></span><b>{day.count}</b><small>{day.label}</small></div>)}
          </div>
        </article>

        <article className="admin-analytics-panel role-panel">
          <header><div><span>AUDIENCE MIX</span><h2>사용자 역할 분포</h2></div></header>
          <div className="admin-role-list">
            {["founder", "team", "explorer", "partner", "unknown"].map((role) => {
              const count = roleCounts[role] ?? 0;
              return <div key={role}><p><span>{memberLabels[role]}</span><strong>{count}<em>{percent(count, totalUsers)}%</em></strong></p><i><b style={{ width: `${(count / maxRoleCount) * 100}%` }} /></i></div>;
            })}
          </div>
        </article>
      </section>

      <section className="admin-analytics-grid lower">
        <article className="admin-analytics-panel recent-users-panel">
          <header><div><span>NEW MEMBERS</span><h2>최근 가입자</h2></div><small>최신순</small></header>
          <div className="admin-recent-users">
            {profiles.slice(0, 7).map((profile) => <div key={profile.id}><i>{(profile.full_name || profile.email || "U").slice(0, 1).toUpperCase()}</i><p><strong>{profile.full_name || "이름 미설정"}</strong><span>{profile.email || "이메일 없음"}</span></p><em>{memberLabels[profile.member_type || "unknown"]}</em><time>{shortDate(profile.created_at)}</time></div>)}
            {!profiles.length && <p className="admin-empty">아직 가입한 사용자가 없습니다.</p>}
          </div>
        </article>

        <article className="admin-analytics-panel operation-queue-panel">
          <header><div><span>ACTION REQUIRED</span><h2>처리할 운영 작업</h2></div><strong>{totalQueue}</strong></header>
          <div className="admin-operation-queue">
            {queueItems.map((item) => <Link href={item.href} key={item.label}><span>{item.label}</span><strong className={item.count ? "alert" : undefined}>{item.count}</strong><i>→</i></Link>)}
          </div>
        </article>
      </section>

      <section className="admin-content-pulse">
        <header><div><span>CONTENT PULSE</span><h2>플랫폼 콘텐츠</h2></div><p>콘텐츠 상세 관리는 각 메뉴에서 진행하세요.</p></header>
        <div>{contentSections.map((section, index) => <Link href={section.href} key={section.label}><span>{section.label}</span><strong>{contentCounts[index] ?? 0}<em>개</em></strong><i>→</i></Link>)}</div>
      </section>
    </main>
  );
}
