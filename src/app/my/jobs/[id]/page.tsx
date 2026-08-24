import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getMyJobAccess, jobOrganizationKey } from "@/lib/job-access";
import { DashNav } from "../../dash-nav";
import { OrganizationJobEditor } from "./partner-job-editor";

export const metadata: Metadata = { title: "채용 공고 편집 · FEATABLE", robots: { index: false, follow: false } };

export default async function OrganizationJobEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, organizations } = await getMyJobAccess();
  if (!user) redirect(`/login?next=/my/jobs/${encodeURIComponent(id)}`);
  if (!organizations.length) redirect("/my/jobs");
  const job = id === "new" ? null : await supabase.from("jobs").select("id,slug,brand_id,community_id,partner_id,title,role,type,location,description,requirements,apply_url,deadline,status").eq("id", id).maybeSingle().then((result) => result.data);
  const jobOrganization = job?.brand_id ? { type: "brand" as const, id: job.brand_id } : job?.community_id ? { type: "community" as const, id: job.community_id } : job?.partner_id ? { type: "partner" as const, id: job.partner_id } : null;
  if (id !== "new" && (!job || !jobOrganization || !organizations.some((item) => jobOrganizationKey(item.type, item.id) === jobOrganizationKey(jobOrganization.type, jobOrganization.id)))) notFound();
  const initialOrganization = jobOrganization ?? organizations[0];
  return <><DashNav active="jobs" /><main className="approved-publishing-page"><div className="shell"><div className="approved-publishing-heading"><div><span>ORGANIZATION RECRUITING</span><h2>{job ? "채용 공고 관리" : "새 채용 공고"}</h2></div><p>저장하면 공개 채용 페이지에 바로 반영됩니다.</p></div><OrganizationJobEditor organizations={organizations} jobId={job?.id} initial={job ? { organizationType: initialOrganization.type, organizationId: initialOrganization.id, title: job.title, role: job.role, type: job.type, location: job.location, description: job.description ?? "", requirements: (job.requirements ?? []).join("\n"), applyUrl: job.apply_url ?? "", deadline: job.deadline ?? "", status: job.status === "published" ? "published" : "hidden" } : { organizationType: initialOrganization.type, organizationId: initialOrganization.id, title: "", role: "", type: "정규직", location: "", description: "", requirements: "", applyUrl: "", deadline: "", status: "published" }} /></div></main></>;
}
