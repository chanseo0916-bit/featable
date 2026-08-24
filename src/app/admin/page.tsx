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

interface ActivityRow {
  user_id: string | null;
  session_id: string;
  event_name: string;
  path: string;
  source: string | null;
  created_at: string;
}

/** 최근 7일 구간의 시작(6일 전 자정) — 렌더 중 Date.now() 직접 호출을 피한다 */
function sevenDayWindowStart(): Date {
  const start = new Date(Date.now() - 6 * 86_400_000);
  start.setHours(0, 0, 0, 0);
  return start;
}

function analyticsWindow(days: number): { rangeStart: Date; todayKey: string; now: Date } {
  const now = new Date();
  const rangeStart = new Date(now.getTime() - (days - 1) * 86_400_000);
  rangeStart.setHours(0, 0, 0, 0);
  return { rangeStart, todayKey: dateKey(now), now };
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const query = await searchParams;
  const rangeDays = query.range === "7" || query.range === "90" ? Number(query.range) : 30;
  const supabase = await createClient();
  const weekStart = sevenDayWindowStart();
  const { rangeStart, todayKey, now } = analyticsWindow(rangeDays);

  const [profilesResult, founderCountResult, brandCountResult, productCountResult, featureCountResult, eventCountResult, pendingBrandsResult, pendingProductsResult, pendingSubmissionsResult, pendingInquiriesResult, activityResult] = await Promise.all([
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
    supabase.from("user_activity_events").select("user_id,session_id,event_name,path,source,created_at").gte("created_at", rangeStart.toISOString()).order("created_at", { ascending: false }).limit(20000),
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
  const activity = (activityResult.data ?? []) as ActivityRow[];
  const visitorKey = (row: ActivityRow) => row.user_id || row.session_id;
  const dailyActive = new Set(activity.filter((row) => dateKey(row.created_at) === todayKey).map(visitorKey)).size;
  const weeklyActivity = activity.filter((row) => new Date(row.created_at) >= weekStart);
  const weeklyActiveKeys = new Set(weeklyActivity.map(visitorKey));
  const weeklyActive = weeklyActiveKeys.size;
  const rangeActive = new Set(activity.map(visitorKey)).size;
  const weeklyPageViews = weeklyActivity.filter((row) => row.event_name === "page_view").length;
  const authenticatedWeekly = new Set(weeklyActivity.filter((row) => row.user_id).map((row) => row.user_id as string)).size;
  const countBy = (rows: ActivityRow[], key: (row: ActivityRow) => string) => Object.entries(rows.reduce<Record<string, number>>((counts, row) => {
    const value = key(row);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topPaths = countBy(activity.filter((row) => row.event_name === "page_view"), (row) => row.path);
  const topSources = countBy(activity.filter((row) => row.event_name === "page_view"), (row) => row.source || "직접 유입");
  const eventUsers = (eventName: string) => new Set(activity.filter((row) => row.event_name === eventName && row.user_id).map((row) => row.user_id as string));
  const visitKeys = new Set(activity.filter((row) => row.event_name === "page_view").map(visitorKey));
  const signupUsers = eventUsers("signup");
  const brandUsers = eventUsers("brand_created");
  const productUsers = eventUsers("product_published");
  const funnelSignupUsers = new Set([...signupUsers].filter((userId) => visitKeys.has(userId)));
  const funnelBrandUsers = new Set([...brandUsers].filter((userId) => funnelSignupUsers.has(userId)));
  const funnelProductUsers = new Set([...productUsers].filter((userId) => funnelBrandUsers.has(userId)));
  const funnelStages = [
    { key: "visit", label: "방문", description: "고유 사용자·세션", count: visitKeys.size },
    { key: "signup", label: "회원가입", description: "방문 후 계정 생성", count: funnelSignupUsers.size },
    { key: "brand", label: "브랜드 등록", description: "가입 후 기업 생성", count: funnelBrandUsers.size },
    { key: "publish", label: "프로덕트 발행", description: "브랜드 생성 후 발행", count: funnelProductUsers.size },
  ];
  const funnelMax = Math.max(1, ...funnelStages.map((stage) => stage.count));
  const signupEvents = activity.filter((row) => row.event_name === "signup" && row.user_id);
  const firstSignupByUser = new Map<string, number>();
  signupEvents.forEach((row) => {
    const time = Date.parse(row.created_at);
    const previous = firstSignupByUser.get(row.user_id as string);
    if (!previous || time < previous) firstSignupByUser.set(row.user_id as string, time);
  });
  const retentionCutoff = now.getTime() - 7 * 86_400_000;
  const eligibleCohort = [...firstSignupByUser.entries()].filter(([, signupAt]) => signupAt <= retentionCutoff);
  const retainedUsers = eligibleCohort.filter(([userId, signupAt]) => activity.some((row) => row.user_id === userId && Date.parse(row.created_at) >= signupAt + 86_400_000 && Date.parse(row.created_at) <= signupAt + 7 * 86_400_000)).length;
  const retentionRate = percent(retainedUsers, eligibleCohort.length);
  const profileRoles = new Map(profiles.map((profile) => [profile.id, profile.member_type || "unknown"]));
  const authenticatedActive = new Set(activity.filter((row) => row.user_id).map((row) => row.user_id as string));
  const roleConversions = ["founder", "team", "explorer", "partner"].map((role) => {
    const active = [...authenticatedActive].filter((userId) => profileRoles.get(userId) === role);
    const published = active.filter((userId) => productUsers.has(userId));
    return { role, active: active.length, published: published.length, rate: percent(published.length, active.length) };
  });
  const sourceMap = new Map<string, { visitors: Set<string>; signups: Set<string>; published: Set<string> }>();
  activity.filter((row) => row.event_name === "page_view").forEach((row) => {
    const source = row.source || "직접 유입";
    const current = sourceMap.get(source) ?? { visitors: new Set<string>(), signups: new Set<string>(), published: new Set<string>() };
    const key = visitorKey(row);
    current.visitors.add(key);
    if (row.user_id && signupUsers.has(row.user_id)) current.signups.add(row.user_id);
    if (row.user_id && productUsers.has(row.user_id)) current.published.add(row.user_id);
    sourceMap.set(source, current);
  });
  const sourceConversions = [...sourceMap.entries()].map(([source, values]) => ({ source, visitors: values.visitors.size, signups: values.signups.size, published: values.published.size })).sort((a, b) => b.visitors - a.visitors).slice(0, 6);
  const warnings = [
    visitKeys.size >= 20 && percent(funnelSignupUsers.size, visitKeys.size) < 3 ? `방문→가입 전환이 ${percent(funnelSignupUsers.size, visitKeys.size)}%로 낮아요.` : null,
    funnelSignupUsers.size >= 5 && percent(funnelBrandUsers.size, funnelSignupUsers.size) < 20 ? `가입→브랜드 등록 전환이 ${percent(funnelBrandUsers.size, funnelSignupUsers.size)}%예요.` : null,
    funnelBrandUsers.size >= 3 && percent(funnelProductUsers.size, funnelBrandUsers.size) < 30 ? `브랜드→프로덕트 발행 전환이 ${percent(funnelProductUsers.size, funnelBrandUsers.size)}%예요.` : null,
    eligibleCohort.length >= 5 && retentionRate < 20 ? `신규 가입자의 7일 재방문율이 ${retentionRate}%예요.` : null,
  ].filter((warning): warning is string => Boolean(warning));

  return (
    <main className="admin-main shell admin-analytics-page">
      <AdminPageHeader eyebrow="PLATFORM ANALYTICS" title="운영 대시보드" description="방문, 활성 사용자, 가입과 콘텐츠 전환까지 Featable의 성장 흐름을 한눈에 확인하세요." />

      <nav className="admin-range-filter" aria-label="분석 기간">
        <span>분석 기간</span>
        {[7, 30, 90].map((days) => <Link href={`/admin?range=${days}`} className={rangeDays === days ? "active" : undefined} key={days}>{days}일</Link>)}
      </nav>

      {!activity.length && <section className="admin-analytics-empty"><strong>아직 분석 데이터가 없습니다.</strong><p>migration 41 적용 후 실제 방문부터 자동으로 집계됩니다.</p></section>}

      <section className="admin-growth-metrics" aria-label="실시간 플랫폼 지표">
        <article className="primary"><span>오늘 활성 사용자</span><strong>{dailyActive.toLocaleString("ko-KR")}<em>명</em></strong><p>오늘 방문한 고유 사용자와 세션</p></article>
        <article><span>최근 7일 활성</span><strong>{weeklyActive.toLocaleString("ko-KR")}<em>명</em></strong><p>{rangeDays}일 활성 {rangeActive.toLocaleString("ko-KR")}명</p></article>
        <article><span>최근 7일 페이지뷰</span><strong>{weeklyPageViews.toLocaleString("ko-KR")}<em>회</em></strong><p>사용자가 실제로 열어본 페이지</p></article>
        <article><span>로그인 활성 비율</span><strong>{percent(authenticatedWeekly, weeklyActive)}<em>%</em></strong><p>활성 사용자 중 로그인 사용자</p></article>
      </section>

      <section className="admin-funnel-panel">
        <header><div><span>CORE FUNNEL · {rangeDays} DAYS</span><h2>방문에서 발행까지</h2></div><p>각 단계는 선택 기간 안에 행동을 완료한 고유 사용자 기준입니다.</p></header>
        <div className="admin-funnel-grid">
          {funnelStages.map((stage, index) => {
            const previous = index ? funnelStages[index - 1].count : stage.count;
            const rate = index ? percent(stage.count, previous) : 100;
            return <article key={stage.key}><div><i>{String(index + 1).padStart(2, "0")}</i><span>{stage.label}<small>{stage.description}</small></span><strong>{stage.count.toLocaleString("ko-KR")}<em>명</em></strong></div><span className="funnel-track"><b style={{ width: `${Math.max(stage.count ? 5 : 0, (stage.count / funnelMax) * 100)}%` }} /></span>{index > 0 && <p>이전 단계 대비 <strong>{rate}%</strong><em>이탈 {Math.max(0, 100 - rate)}%</em></p>}</article>;
          })}
        </div>
      </section>

      {warnings.length > 0 && <section className="admin-conversion-alert"><i>!</i><div><strong>확인이 필요한 전환 구간</strong>{warnings.map((warning) => <p key={warning}>{warning}</p>)}</div></section>}

      <section className="admin-analytics-grid admin-conversion-grid">
        <article className="admin-analytics-panel retention-panel">
          <header><div><span>7 DAY RETENTION</span><h2>신규 가입자 재방문</h2></div><strong>{retentionRate}%</strong></header>
          <div className="retention-visual"><span><b style={{ width: `${retentionRate}%` }} /></span><p><strong>{retainedUsers}명</strong> 재방문<em>측정 가능 코호트 {eligibleCohort.length}명</em></p></div>
          <small>가입 다음 날부터 7일 안에 다시 방문하거나 활동한 사용자입니다.</small>
        </article>
        <article className="admin-analytics-panel role-conversion-panel">
          <header><div><span>ROLE CONVERSION</span><h2>역할별 발행 전환</h2></div></header>
          <div>{roleConversions.map((row) => <p key={row.role}><span>{memberLabels[row.role]}</span><em>활성 {row.active}</em><strong>{row.rate}%</strong></p>)}</div>
        </article>
      </section>

      <section className="admin-source-performance">
        <header><div><span>CHANNEL PERFORMANCE · {rangeDays} DAYS</span><h2>유입 채널별 성과</h2></div><p>UTM source가 없는 방문은 직접 유입으로 집계됩니다.</p></header>
        <div className="admin-source-table"><div className="head"><span>채널</span><span>방문</span><span>가입</span><span>발행</span><span>가입 전환</span></div>{sourceConversions.map((row) => <div key={row.source}><strong>{row.source}</strong><span>{row.visitors}</span><span>{row.signups}</span><span>{row.published}</span><em>{percent(row.signups, row.visitors)}%</em></div>)}{!sourceConversions.length && <p className="admin-empty">유입 데이터가 쌓이면 채널별 성과가 표시됩니다.</p>}</div>
      </section>

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

      <section className="admin-analytics-grid admin-traffic-grid">
        <article className="admin-analytics-panel traffic-panel">
          <header><div><span>TOP PAGES · 30 DAYS</span><h2>많이 본 페이지</h2></div></header>
          <div className="admin-traffic-list">
            {topPaths.map(([path, count], index) => <div key={path}><i>{String(index + 1).padStart(2, "0")}</i><span title={path}>{path}</span><strong>{count.toLocaleString("ko-KR")}<em>뷰</em></strong></div>)}
            {!topPaths.length && <p className="admin-empty">데이터가 쌓이면 인기 페이지가 표시됩니다.</p>}
          </div>
        </article>
        <article className="admin-analytics-panel traffic-panel">
          <header><div><span>ACQUISITION · 30 DAYS</span><h2>유입 채널</h2></div></header>
          <div className="admin-traffic-list">
            {topSources.map(([source, count], index) => <div key={source}><i>{String(index + 1).padStart(2, "0")}</i><span>{source}</span><strong>{count.toLocaleString("ko-KR")}<em>뷰</em></strong></div>)}
            {!topSources.length && <p className="admin-empty">UTM 유입 데이터가 쌓이면 채널별로 표시됩니다.</p>}
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
