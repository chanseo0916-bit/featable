import "server-only";
import { SITE_URL } from "@/lib/site";
import type { StoryBlock } from "@/lib/types";
import { escapeHtml, sendTransactionalEmail } from "./resend";

function plainText(blocks: StoryBlock[]) {
  return blocks.flatMap((block) => block.type === "text" ? [block.body] : []).join(" ").replace(/\s+/g, " ").trim();
}

export function sendInterviewTeaserEmail(input: {
  deliveryId: string;
  email: string;
  displayName?: string | null;
  title: string;
  excerpt: string;
  coverUrl?: string | null;
  hookIntro?: string | null;
  hookLabel?: string | null;
  body: StoryBlock[];
}) {
  const name = input.displayName?.trim() || "Featable 멤버";
  const previewSource = plainText(input.body) || input.excerpt;
  const preview = previewSource.length > 230 ? `${previewSource.slice(0, 227)}…` : previewSource;
  const clickUrl = `${SITE_URL}/api/email/interview/${encodeURIComponent(input.deliveryId)}`;
  const settingsUrl = `${SITE_URL}/my/settings`;
  const image = input.coverUrl
    ? `<img src="${escapeHtml(input.coverUrl)}" alt="" width="560" style="display:block;width:100%;height:auto;max-height:430px;object-fit:cover;border:0">`
    : "";
  const label = [input.hookIntro, input.hookLabel].filter(Boolean).join(" · ");
  const teaser = `<div style="position:relative;margin-top:18px;overflow:hidden;max-height:126px"><p style="margin:0;color:#3f4449;font-size:15px;line-height:1.85">${escapeHtml(preview)}</p><p aria-hidden="true" style="margin:12px 0 0;color:transparent;font-size:15px;line-height:1.85;text-shadow:0 0 8px rgba(63,68,73,.58);user-select:none">그가 처음 제품을 세상에 내놓은 뒤 마주한 예상 밖의 변화와 다음 이야기는 인터뷰에서 이어집니다.</p><div style="position:absolute;right:0;bottom:0;left:0;height:82px;background:linear-gradient(180deg,rgba(255,255,255,0),#fff 88%)"></div></div>`;
  const html = `<!doctype html><html lang="ko"><body style="margin:0;background:#f2f3f4;font-family:Arial,'Apple SD Gothic Neo',sans-serif;color:#17191b"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(input.excerpt)}</div><div style="max-width:600px;margin:0 auto;padding:32px 18px"><div style="overflow:hidden;border:1px solid #dedfe1;border-radius:18px;background:#fff">${image}<div style="padding:28px 28px 32px"><strong style="font-size:20px">Featable</strong><p style="margin:32px 0 8px;color:#EF4125;font-size:11px;font-weight:800;letter-spacing:.12em">NEW FOUNDER INTERVIEW</p>${label ? `<p style="margin:0 0 10px;color:#8a8f95;font-size:12px;font-weight:700">${escapeHtml(label)}</p>` : ""}<h1 style="margin:0;font-size:28px;line-height:1.35;letter-spacing:-.04em">${escapeHtml(input.title)}</h1><p style="margin:14px 0 0;color:#737980;font-size:13px;line-height:1.7"><strong>${escapeHtml(name)}</strong>님께 먼저 소개하는 새로운 창업가 이야기입니다.</p>${teaser}<a href="${escapeHtml(clickUrl)}" style="display:block;margin-top:24px;padding:15px 18px;border-radius:10px;background:#EF4125;color:#fff;text-align:center;text-decoration:none;font-size:14px;font-weight:800">인터뷰 전체 보기 →</a><p style="margin:28px 0 0;color:#a0a4aa;font-size:10px;line-height:1.7">이 메일은 Featable 마케팅 소식 수신에 동의한 회원에게 발송되었습니다.<br>수신 설정은 <a href="${escapeHtml(settingsUrl)}" style="color:#737980">계정 설정</a>에서 언제든 변경할 수 있습니다.</p></div></div></div></body></html>`;
  return sendTransactionalEmail({
    to: input.email,
    subject: `[Featable] ${input.title} · 새로운 창업가 인터뷰`,
    html,
    text: `${name}님, 새로운 창업가 인터뷰가 공개됐습니다.\n\n${input.title}\n${input.excerpt}\n\n인터뷰 전체 보기: ${clickUrl}\n수신 설정: ${settingsUrl}`,
    idempotencyKey: `interview-campaign/${input.deliveryId}`,
  });
}
