"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { JobOrganizationChoice, JobOrganizationType } from "@/lib/job-access";
import { createOrganizationJob, updateOrganizationJob, type JobEmploymentType, type OrganizationJobInput } from "../actions";

const organizationTypeLabel: Record<JobOrganizationType, string> = { brand: "브랜드", community: "커뮤니티", partner: "파트너" };

export function OrganizationJobEditor({ organizations, jobId, initial }: { organizations: JobOrganizationChoice[]; jobId?: string; initial: OrganizationJobInput }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<OrganizationJobInput>) => { setSaved(false); setForm((current) => ({ ...current, ...patch })); };
  const organization = organizations.find((item) => item.id === form.organizationId && item.type === form.organizationType) ?? organizations[0];

  function save() {
    setMessage("");
    startTransition(async () => {
      const result = jobId ? await updateOrganizationJob(jobId, form) : await createOrganizationJob(form);
      if (!result.ok) return setMessage(result.error);
      setSaved(true); setMessage(form.status === "published" ? "채용 공고를 공개했습니다." : "채용 공고를 저장하고 숨겼습니다.");
      if (!jobId) router.replace(`/my/jobs/${result.id}`);
      router.refresh();
    });
  }

  return <div className="approved-publishing-layout"><section className="approved-publishing-form partner-job-editor">
    <header><span>JOB POSTING</span><h1>{jobId ? "채용 공고 수정" : "채용 공고 등록"}</h1><p>지원자가 역할과 근무 조건을 빠르게 이해할 수 있도록 작성해주세요.</p></header>
    <div className="approved-form-fields">
      <label><span>게시 조직 *</span><select value={`${form.organizationType}:${form.organizationId}`} onChange={(event) => { const [organizationType, organizationId] = event.target.value.split(":"); set({ organizationType: organizationType as JobOrganizationType, organizationId }); }}>{organizations.map((item) => <option value={`${item.type}:${item.id}`} key={`${item.type}:${item.id}`}>{organizationTypeLabel[item.type]} · {item.name}</option>)}</select></label>
      <label><span>고용 형태 *</span><select value={form.type} onChange={(event) => set({ type: event.target.value as JobEmploymentType })}>{["정규직", "계약직", "인턴", "파트타임"].map((type) => <option value={type} key={type}>{type}</option>)}</select></label>
      <label className="wide"><span>공고 제목 *</span><input minLength={2} maxLength={120} value={form.title} onChange={(event) => set({ title: event.target.value })} placeholder="예: Product Designer를 찾습니다" /></label>
      <label><span>담당 역할 *</span><input minLength={2} maxLength={100} value={form.role} onChange={(event) => set({ role: event.target.value })} placeholder="예: 제품 디자인" /></label>
      <label><span>근무 위치 *</span><input maxLength={120} value={form.location} onChange={(event) => set({ location: event.target.value })} placeholder="예: 서울 / 하이브리드" /></label>
      <label className="wide"><span>채용 소개 * <small>20자 이상</small></span><textarea minLength={20} value={form.description} onChange={(event) => set({ description: event.target.value })} placeholder="팀과 포지션, 함께 해결할 문제를 소개해주세요." /></label>
      <label className="wide"><span>자격 요건 <small>한 줄에 하나씩</small></span><textarea value={form.requirements} onChange={(event) => set({ requirements: event.target.value })} placeholder={"관련 경력 2년 이상\n원활한 커뮤니케이션 능력"} /></label>
      <label><span>지원 링크 *</span><input type="text" inputMode="url" value={form.applyUrl} onChange={(event) => set({ applyUrl: event.target.value })} onBlur={() => { const value = form.applyUrl.trim(); if (value && !/^https?:\/\//i.test(value)) set({ applyUrl: `https://${value}` }); }} placeholder="https://" /></label>
      <label><span>지원 마감일</span><input type="date" value={form.deadline} onChange={(event) => set({ deadline: event.target.value })} /></label>
      <label><span>노출 상태</span><select value={form.status} onChange={(event) => set({ status: event.target.value as "published" | "hidden" })}><option value="published">바로 공개</option><option value="hidden">숨김</option></select></label>
    </div>
    {message && <p className="approved-publishing-message" data-success={saved || undefined}>{message}</p>}
    <footer><span><i data-state={pending ? "saving" : saved ? "saved" : "idle"} />{pending ? "저장 중" : saved ? "저장됨" : "작성 내용을 확인해주세요"}</span><button type="button" className="secondary" onClick={() => router.push("/my/jobs")}>목록</button><button type="button" disabled={pending} onClick={save}>{pending ? "저장 중…" : jobId ? "변경사항 저장" : "채용 공고 등록"}</button></footer>
  </section><aside className="approved-publishing-preview partner-job-preview"><header><div><span>LIVE PREVIEW</span><strong>채용 목록 카드</strong></div></header><article><div className="partner-job-preview-brand">{organization?.logoUrl ? <img src={organization.logoUrl} alt="" /> : <b>{organization?.name.slice(0, 1)}</b>}<span>{organization?.name}</span></div><small>{form.type || "고용 형태"}</small><h2>{form.title || "채용 공고 제목"}</h2><p>{form.role || "담당 역할"}</p><footer><span>{form.location || "근무 위치"}</span><b>지원하기 →</b></footer></article></aside></div>;
}
