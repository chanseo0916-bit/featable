"use server";

import { revalidatePath } from "next/cache";
import { getMyJobAccess, jobOrganizationKey, type JobOrganizationType } from "@/lib/job-access";
import { randomSuffix, slugify } from "@/lib/slug";

export type JobEmploymentType = "정규직" | "계약직" | "인턴" | "파트타임";
export interface OrganizationJobInput {
  organizationType: JobOrganizationType;
  organizationId: string;
  title: string;
  role: string;
  type: JobEmploymentType;
  location: string;
  description: string;
  requirements: string;
  applyUrl: string;
  deadline: string;
  status: "published" | "hidden";
}

type Result = { ok: true; id: string; slug: string } | { ok: false; error: string };
type JobOwnerRow = { brand_id: string | null; community_id: string | null; partner_id: string | null };
const clean = (value: string, max: number) => value.trim().slice(0, max);
const validUrl = (value: string) => { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } };

function payload(input: OrganizationJobInput) {
  return {
    organizationType: input.organizationType,
    organizationId: clean(input.organizationId, 80),
    title: clean(input.title, 120),
    role: clean(input.role, 100),
    type: input.type,
    location: clean(input.location, 120),
    description: clean(input.description, 5000),
    requirements: input.requirements.split(/\r?\n/).map((item) => clean(item.replace(/^[-•]\s*/, ""), 180)).filter(Boolean).slice(0, 12),
    applyUrl: clean(input.applyUrl, 500),
    deadline: clean(input.deadline, 10),
    status: input.status,
  };
}

function validate(value: ReturnType<typeof payload>) {
  if (!["brand", "community", "partner"].includes(value.organizationType) || !value.organizationId) return "공고를 올릴 조직을 선택해주세요.";
  if (value.title.length < 2 || value.role.length < 2) return "공고 제목과 담당 역할을 확인해주세요.";
  if (!value.location) return "근무 위치를 입력해주세요.";
  if (value.description.length < 20) return "채용 소개를 20자 이상 입력해주세요.";
  if (!["정규직", "계약직", "인턴", "파트타임"].includes(value.type)) return "고용 형태를 확인해주세요.";
  if (!["published", "hidden"].includes(value.status)) return "노출 상태를 확인해주세요.";
  if (!validUrl(value.applyUrl)) return "지원 링크를 http:// 또는 https:// 주소로 입력해주세요.";
  if (value.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(value.deadline)) return "마감일을 확인해주세요.";
  return null;
}

function ownerColumns(type: JobOrganizationType, id: string) {
  return { brand_id: type === "brand" ? id : null, community_id: type === "community" ? id : null, partner_id: type === "partner" ? id : null };
}

function ownerKey(row: JobOwnerRow) {
  if (row.brand_id) return jobOrganizationKey("brand", row.brand_id);
  if (row.community_id) return jobOrganizationKey("community", row.community_id);
  if (row.partner_id) return jobOrganizationKey("partner", row.partner_id);
  return "";
}

function revalidateJobs(id?: string, slug?: string) {
  ["/jobs", "/my", "/my/jobs", "/sitemap.xml", "/llms-full.txt"].forEach((path) => revalidatePath(path));
  if (id) revalidatePath(`/my/jobs/${id}`);
  if (slug) revalidatePath(`/jobs/${slug}`);
}

export async function createOrganizationJob(input: OrganizationJobInput): Promise<Result> {
  const { supabase, user, organizations } = await getMyJobAccess();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const value = payload(input);
  const invalid = validate(value);
  if (invalid) return { ok: false, error: invalid };
  const allowed = new Set(organizations.map((item) => jobOrganizationKey(item.type, item.id)));
  if (!allowed.has(jobOrganizationKey(value.organizationType, value.organizationId))) return { ok: false, error: "이 조직 명의로 공고를 올릴 권한이 없습니다." };

  const base = slugify(value.title) || "job";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const slug = `${base}-${randomSuffix()}`;
    const { data, error } = await supabase.from("jobs").insert({
      ...ownerColumns(value.organizationType, value.organizationId), slug, title: value.title, role: value.role, type: value.type,
      location: value.location, description: value.description, requirements: value.requirements, apply_url: value.applyUrl,
      deadline: value.deadline || null, status: value.status, updated_at: new Date().toISOString(),
    } as never).select("id,slug").single();
    if (!error && data) { revalidateJobs(data.id, data.slug); return { ok: true, id: data.id, slug: data.slug }; }
    if (!error?.message?.toLowerCase().includes("unique")) return { ok: false, error: "채용 공고를 저장하지 못했습니다." };
  }
  return { ok: false, error: "채용 공고 주소를 만들지 못했습니다. 다시 시도해주세요." };
}

export async function updateOrganizationJob(id: string, input: OrganizationJobInput): Promise<Result> {
  const { supabase, user, organizations } = await getMyJobAccess();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const value = payload(input);
  const invalid = validate(value);
  if (invalid) return { ok: false, error: invalid };
  const allowed = new Set(organizations.map((item) => jobOrganizationKey(item.type, item.id)));
  if (!allowed.has(jobOrganizationKey(value.organizationType, value.organizationId))) return { ok: false, error: "이 조직 명의로 공고를 수정할 권한이 없습니다." };
  const { data: current } = await supabase.from("jobs").select("id,slug,brand_id,community_id,partner_id").eq("id", id).maybeSingle();
  if (!current || !allowed.has(ownerKey(current))) return { ok: false, error: "이 채용 공고를 수정할 권한이 없습니다." };
  const { error } = await supabase.from("jobs").update({
    ...ownerColumns(value.organizationType, value.organizationId), title: value.title, role: value.role, type: value.type,
    location: value.location, description: value.description, requirements: value.requirements, apply_url: value.applyUrl,
    deadline: value.deadline || null, status: value.status, updated_at: new Date().toISOString(),
  } as never).eq("id", current.id);
  if (error) return { ok: false, error: "채용 공고를 저장하지 못했습니다." };
  revalidateJobs(current.id, current.slug);
  return { ok: true, id: current.id, slug: current.slug };
}
