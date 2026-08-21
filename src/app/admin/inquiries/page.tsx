import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "../admin-ui";
import { InquiryReviewControls } from "./review-controls";

export const metadata: Metadata = { title: "파트너 문의" };
interface Inquiry { id: string; inquiry_type: "advertiser" | "community_partner"; organization: string; contact_name: string; contact_email: string; contact_phone: string | null; website: string | null; objective: string; budget: string | null; timeline: string | null; audience: string | null; community_size: string | null; message: string; status: "new" | "reviewing" | "approved" | "rejected" | "closed"; review_note: string | null; created_at: string }
const statusLabel = (status: Inquiry["status"]) => ({ new: "새 문의", reviewing: "검토 중", approved: "승인", rejected: "반려", closed: "종료" })[status];

export default async function AdminInquiriesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("partnership_inquiries").select("id,inquiry_type,organization,contact_name,contact_email,contact_phone,website,objective,budget,timeline,audience,community_size,message,status,review_note,created_at").order("created_at", { ascending: false });
  const rows = (data ?? []) as Inquiry[];
  return <main className="admin-main shell"><AdminPageHeader eyebrow="PARTNERSHIP CRM" title="파트너 문의" description="광고주 문의와 커뮤니티 제휴 신청을 분리해 확인하고 후속 조치를 관리하세요." publicHref="/partners/apply" /><section className="admin-list-panel partner-submission-admin"><div className="admin-list-head"><h2>전체 문의 <span>{rows.length}</span></h2></div><div className="partner-submission-admin-list">
    {rows.map((row) => <article key={row.id}><header><div><span>{row.inquiry_type === "advertiser" ? "ADVERTISER" : "COMMUNITY PARTNER"}</span><h2>{row.organization}</h2><p>{row.contact_name} · {row.contact_email} · {new Date(row.created_at).toLocaleString("ko-KR")}</p></div><em data-status={row.status}>{statusLabel(row.status)}</em></header><dl><div><dt>목적</dt><dd>{row.objective}</dd></div><div><dt>{row.inquiry_type === "advertiser" ? "예산" : "커뮤니티 규모"}</dt><dd>{row.inquiry_type === "advertiser" ? row.budget || "미정" : row.community_size || "미입력"}</dd></div><div><dt>희망 일정</dt><dd>{row.timeline || "협의"}</dd></div><div><dt>연락처</dt><dd>{row.contact_phone || row.contact_email}</dd></div><div><dt>타깃·멤버</dt><dd>{row.audience || "미입력"}</dd></div><div><dt>웹사이트</dt><dd>{row.website || "미입력"}</dd></div><div><dt>문의 내용</dt><dd>{row.message}</dd></div></dl>{row.status === "new" || row.status === "reviewing" ? <InquiryReviewControls id={row.id} /> : row.review_note && <p className="submission-review-note">검토 메모: {row.review_note}</p>}</article>)}
    {!rows.length && <p className="admin-empty">접수된 파트너 문의가 없습니다.</p>}
  </div></section></main>;
}
