import "server-only";
import { SITE_URL } from "@/lib/site";

type SlackBlock = Record<string, unknown>;

async function postSlack(webhookUrl: string | undefined, text: string, blocks: SlackBlock[]) {
  webhookUrl = webhookUrl?.trim();
  if (!webhookUrl) return { ok: false, skipped: true };
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, blocks }),
      cache: "no-store",
    });
    return { ok: response.ok, skipped: false };
  } catch {
    return { ok: false, skipped: false };
  }
}

const roleLabel = (type: string) => ({ founder: "창업가·대표", team: "팀 멤버", explorer: "예비 창업가", partner: "파트너" })[type] ?? type;

export async function notifySlackNewSignup(input: { name: string; email: string; memberType: string; marketingAccepted: boolean }) {
  const text = `새 가입자: ${input.name} (${input.email})`;
  return postSlack(process.env.SLACK_SIGNUP_WEBHOOK_URL ?? process.env.SLACK_WEBHOOK_URL, text, [
    { type: "header", text: { type: "plain_text", text: "👋 Featable 새 가입자", emoji: true } },
    { type: "section", fields: [
      { type: "mrkdwn", text: `*이름*\n${input.name}` },
      { type: "mrkdwn", text: `*역할*\n${roleLabel(input.memberType)}` },
      { type: "mrkdwn", text: `*이메일*\n${input.email}` },
      { type: "mrkdwn", text: `*마케팅 수신*\n${input.marketingAccepted ? "동의" : "미동의"}` },
    ] },
    { type: "context", elements: [{ type: "mrkdwn", text: `가입 완료 · ${new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date())}` }] },
  ]);
}

export async function notifySlackPartnerSubmission(input: { id: string; title: string; type: "event" | "support" | "community"; partnerName: string; partnerEmail: string }) {
  const typeLabel = input.type === "event" ? "행사" : input.type === "support" ? "지원사업" : "커뮤니티";
  const reviewUrl = `${SITE_URL}/admin/submissions`;
  const text = `파트너 검수 요청: ${input.title}`;
  return postSlack(process.env.SLACK_REVIEW_WEBHOOK_URL ?? process.env.SLACK_WEBHOOK_URL, text, [
    { type: "header", text: { type: "plain_text", text: "📥 새로운 파트너 검수 요청", emoji: true } },
    { type: "section", text: { type: "mrkdwn", text: `*${input.title || "제목 없는 제안"}*\n${typeLabel} · ${input.partnerName} (${input.partnerEmail})` } },
    { type: "actions", block_id: `partner_submission_${input.id}`, elements: [
      { type: "button", action_id: "approve_partner_submission", style: "primary", text: { type: "plain_text", text: "승인하고 공개", emoji: true }, value: input.id, confirm: { title: { type: "plain_text", text: "바로 공개할까요?" }, text: { type: "mrkdwn", text: "입력된 정보로 공개 페이지가 즉시 생성됩니다." }, confirm: { type: "plain_text", text: "승인" }, deny: { type: "plain_text", text: "취소" } } },
      { type: "button", action_id: "open_partner_submission", text: { type: "plain_text", text: "상세 검수", emoji: true }, url: reviewUrl, value: input.id },
    ] },
    { type: "context", elements: [{ type: "mrkdwn", text: "승인은 즉시 공개됩니다. 보완 요청은 관리자 검수함에서 메모와 함께 처리하세요." }] },
  ]);
}

export async function notifySlackPartnershipInquiry(input: { id: string; inquiryType: "advertiser" | "community_partner"; organization: string; contactName: string; contactEmail: string; objective: string; budget?: string }) {
  const typeLabel = input.inquiryType === "advertiser" ? "광고·브랜디드 콘텐츠" : "커뮤니티 제휴";
  const reviewUrl = `${SITE_URL}/admin/inquiries`;
  return postSlack(process.env.SLACK_REVIEW_WEBHOOK_URL ?? process.env.SLACK_WEBHOOK_URL, `새 파트너 문의: ${input.organization}`, [
    { type: "header", text: { type: "plain_text", text: "🤝 새로운 파트너 문의", emoji: true } },
    { type: "section", fields: [
      { type: "mrkdwn", text: `*유형*\n${typeLabel}` },
      { type: "mrkdwn", text: `*기업·커뮤니티*\n${input.organization}` },
      { type: "mrkdwn", text: `*담당자*\n${input.contactName}` },
      { type: "mrkdwn", text: `*이메일*\n${input.contactEmail}` },
      { type: "mrkdwn", text: `*목적*\n${input.objective}` },
      { type: "mrkdwn", text: `*예산·규모*\n${input.budget || "미정"}` },
    ] },
    { type: "actions", block_id: `partnership_inquiry_${input.id}`, elements: [
      { type: "button", action_id: "approve_partnership_inquiry", style: "primary", text: { type: "plain_text", text: "제휴 승인", emoji: true }, value: input.id, confirm: { title: { type: "plain_text", text: "제휴를 승인할까요?" }, text: { type: "mrkdwn", text: "문의 상태가 승인 완료로 변경됩니다. 공개 파트너 등록은 관리자 페이지에서 별도로 진행합니다." }, confirm: { type: "plain_text", text: "승인" }, deny: { type: "plain_text", text: "취소" } } },
      { type: "button", action_id: "open_partnership_inquiry", text: { type: "plain_text", text: "문의 상세", emoji: true }, url: reviewUrl, value: input.id },
    ] },
  ]);
}
