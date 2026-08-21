import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewPartnerSubmissionWithClient } from "@/lib/partner-submission-review";
import { reviewPartnershipInquiryWithClient } from "@/lib/partnership-inquiry-review";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function verifySlackRequest(body: string, timestamp: string | null, signature: string | null) {
  const secret = process.env.SLACK_SIGNING_SECRET?.trim();
  if (!secret || !timestamp || !signature) return false;
  const requestTime = Number(timestamp);
  if (!Number.isFinite(requestTime) || Math.abs(Date.now() / 1000 - requestTime) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`v0:${timestamp}:${body}`));
  const expected = `v0=${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  return safeEqual(expected, signature);
}

interface SlackInteractionPayload {
  type?: string;
  user?: { id?: string; name?: string; username?: string };
  actions?: { action_id?: string; value?: string }[];
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifySlackRequest(rawBody, request.headers.get("x-slack-request-timestamp"), request.headers.get("x-slack-signature"));
  if (!verified) return new NextResponse("Invalid Slack signature", { status: 401 });

  const encodedPayload = new URLSearchParams(rawBody).get("payload");
  if (!encodedPayload) return new NextResponse("Missing payload", { status: 400 });
  let payload: SlackInteractionPayload;
  try { payload = JSON.parse(encodedPayload) as SlackInteractionPayload; } catch { return new NextResponse("Invalid payload", { status: 400 }); }

  const action = payload.actions?.[0];
  if (payload.type !== "block_actions" || !action?.action_id || !action.value) return NextResponse.json({ text: "지원하지 않는 요청입니다." });
  if (action.action_id === "open_partner_submission" || action.action_id === "open_partnership_inquiry") return new NextResponse(null, { status: 200 });
  if (action.action_id !== "approve_partner_submission" && action.action_id !== "approve_partnership_inquiry") return NextResponse.json({ text: "지원하지 않는 작업입니다." });

  const approvers = (process.env.SLACK_APPROVER_USER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (approvers.length && (!payload.user?.id || !approvers.includes(payload.user.id))) {
    return NextResponse.json({ replace_original: false, response_type: "ephemeral", text: "이 Slack 계정에는 승인 권한이 없습니다." });
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ replace_original: false, response_type: "ephemeral", text: "서버의 Supabase 관리 키가 설정되지 않았습니다." });

  if (action.action_id === "approve_partnership_inquiry") {
    const inquiryResult = await reviewPartnershipInquiryWithClient(supabase, { id: action.value, decision: "approve", reviewedBy: null, note: `Slack에서 ${payload.user?.name || payload.user?.username || "관리자"}님이 승인` });
    if (!inquiryResult.ok) return NextResponse.json({ replace_original: false, response_type: "ephemeral", text: `승인 실패: ${inquiryResult.error}` });
    revalidatePath("/admin/inquiries");
    revalidatePath("/my");
    const target = inquiryResult.registrationType === "partner" ? "파트너 프로필" : "커뮤니티 페이지";
    const delivery = inquiryResult.linked ? "사이트 알림 발송 완료" : "동일 이메일 계정의 다음 로그인 시 알림 발송";
    return NextResponse.json({ replace_original: true, text: "등록 초대 발급 완료", blocks: [
      { type: "header", text: { type: "plain_text", text: "✅ 등록 권한 승인 완료", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `*${inquiryResult.organization}*에 ${target} 등록 권한을 발급했습니다.\n• ${delivery}\n• 신청자가 정보를 완성한 뒤 직접 공개합니다.\n<${SITE_URL}/admin/inquiries|등록 진행 상태 확인>` } },
    ] });
  }

  const result = await reviewPartnerSubmissionWithClient(supabase, { id: action.value, decision: "approve", reviewedBy: null, note: `Slack에서 ${payload.user?.name || payload.user?.username || "관리자"}님이 승인` });
  if (!result.ok) return NextResponse.json({ replace_original: false, response_type: "ephemeral", text: `승인 실패: ${result.error}` });

  ["/", "/events", "/support", "/communities", "/sitemap.xml", "/admin/submissions", "/my", "/my/partner/register", result.path].filter(Boolean).forEach((path) => revalidatePath(path!));
  return NextResponse.json({
    replace_original: true,
    text: "파트너 제안 승인 완료",
    blocks: [
      { type: "header", text: { type: "plain_text", text: "✅ 승인 및 공개 완료", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `*${payload.user?.name || payload.user?.username || "관리자"}*님이 제안을 승인했습니다.\n<${SITE_URL}${result.path}|공개 페이지 확인하기>` } },
    ],
  });
}
