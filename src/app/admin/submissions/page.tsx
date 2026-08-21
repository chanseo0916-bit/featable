import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "../admin-ui";
import { SubmissionReviewControls } from "./review-controls";

export const metadata: Metadata = { title: "파트너 제안 검수" };
interface SubmissionRow { id: string; submission_type: "event" | "support" | "community"; status: "draft" | "submitted" | "in_review" | "approved" | "rejected"; title: string; payload: Record<string, string | boolean>; review_note: string | null; published_path: string | null; submitted_at: string | null; user: { full_name: string | null; email: string | null } | null }
const typeLabel = (type: SubmissionRow["submission_type"]) => type === "event" ? "행사" : type === "support" ? "지원사업" : "커뮤니티";
const statusLabel = (status: SubmissionRow["status"]) => ({ draft: "작성 중", submitted: "검수 대기", in_review: "검수 중", approved: "승인 완료", rejected: "보완 필요" })[status];

export default async function AdminSubmissionsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("partner_submissions").select("id,submission_type,status,title,payload,review_note,published_path,submitted_at,user:profiles!partner_submissions_user_id_fkey(full_name,email)").neq("status", "draft").order("submitted_at", { ascending: false });
  const rows = (data ?? []) as unknown as SubmissionRow[];
  return <main className="admin-main shell"><AdminPageHeader eyebrow="PARTNER QUEUE" title="파트너 제안 검수" description="파트너가 직접 등록한 행사·지원사업·커뮤니티 정보를 확인하고 공개하세요." /><section className="admin-list-panel partner-submission-admin"><div className="admin-list-head"><h2>전체 제안 <span>{rows.length}</span></h2></div><div className="partner-submission-admin-list">
    {rows.map((row) => <article key={row.id}><header><div><span>{typeLabel(row.submission_type)}</span><h2>{row.title || "제목 없는 제안"}</h2><p>{row.user?.full_name || row.user?.email || "파트너"} · {row.submitted_at ? new Date(row.submitted_at).toLocaleString("ko-KR") : "임시저장"}</p></div><em data-status={row.status}>{statusLabel(row.status)}</em></header><dl>{Object.entries(row.payload).filter(([, value]) => value !== "" && value !== false).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === "boolean" ? "예" : value}</dd></div>)}</dl>{row.published_path ? <Link className="submission-published-link" href={row.published_path}>공개 페이지 보기 →</Link> : row.status === "submitted" || row.status === "in_review" ? <SubmissionReviewControls id={row.id} /> : row.review_note && <p className="submission-review-note">검토 메모: {row.review_note}</p>}</article>)}
    {!rows.length && <p className="admin-empty">검수할 파트너 제안이 없습니다.</p>}
  </div></section></main>;
}
