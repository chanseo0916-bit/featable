import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyJobAccess, jobOrganizationKey, type JobOrganizationType } from "@/lib/job-access";
import { DashNav } from "../dash-nav";

export const metadata: Metadata = { title: "내 채용 공고 · FEATABLE", robots: { index: false, follow: false } };

interface JobRow { id: string; slug: string; title: string; role: string; type: string; location: string; status: "published" | "hidden" | "draft"; created_at: string; brand_id: string | null; community_id: string | null; partner_id: string | null; }
const typeLabel: Record<JobOrganizationType, string> = { brand: "브랜드", community: "커뮤니티", partner: "파트너" };

export default async function MyJobsPage() {
  const { supabase, user, organizations } = await getMyJobAccess();
  if (!user) redirect("/login?next=/my/jobs");
  const queries = (["brand", "community", "partner"] as const).map(async (type) => {
    const ids = organizations.filter((item) => item.type === type).map((item) => item.id);
    if (!ids.length) return [] as JobRow[];
    const column = type === "brand" ? "brand_id" : type === "community" ? "community_id" : "partner_id";
    const { data } = await supabase.from("jobs").select("id,slug,title,role,type,location,status,created_at,brand_id,community_id,partner_id").in(column, ids);
    return (data ?? []) as JobRow[];
  });
  const jobs = [...new Map((await Promise.all(queries)).flat().map((job) => [job.id, job])).values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const organizationMap = new Map(organizations.map((item) => [jobOrganizationKey(item.type, item.id), item]));
  const jobOrganization = (job: JobRow) => job.brand_id ? organizationMap.get(jobOrganizationKey("brand", job.brand_id)) : job.community_id ? organizationMap.get(jobOrganizationKey("community", job.community_id)) : job.partner_id ? organizationMap.get(jobOrganizationKey("partner", job.partner_id)) : undefined;

  return <><DashNav active="jobs" /><main className="dash-page managed-community-page"><div className="shell dash-shell">
    <header className="managed-community-heading"><div><h1>내 채용 공고</h1><p>내가 관리하는 브랜드·커뮤니티·파트너의 채용 소식을 직접 등록하세요.</p></div>{organizations.length ? <Link href="/my/jobs/new">새 채용 공고 +</Link> : <Link href="/my">내 조직 확인 →</Link>}</header>
    {jobs.length ? <section className="partner-job-list">{jobs.map((job) => { const organization = jobOrganization(job); return <article key={job.id}><div><small>{organization ? `${typeLabel[organization.type]} · ${organization.name} · ${job.type}` : job.type}</small><h2>{job.title}</h2><p>{job.role} · {job.location}</p></div><span data-status={job.status}>{job.status === "published" ? "공개 중" : "숨김"}</span><footer><Link href={`/my/jobs/${job.id}`}>수정·관리</Link>{job.status === "published" && <Link href={`/jobs/${job.slug}`}>공개 페이지 ↗</Link>}</footer></article>; })}</section> : <section className="managed-community-empty"><h2>{organizations.length ? "첫 채용 공고를 올려보세요." : "관리할 수 있는 조직이 필요해요."}</h2><p>{organizations.length ? "조직을 선택하면 채용 공고를 등록할 수 있어요." : "조직에 등록되거나 초대받으면 채용 공고를 게시할 수 있어요."}</p><Link href={organizations.length ? "/my/jobs/new" : "/my"}>{organizations.length ? "채용 공고 등록하기 →" : "내 워크스페이스 확인 →"}</Link></section>}
  </div></main></>;
}
