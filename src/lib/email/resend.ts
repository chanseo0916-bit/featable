import "server-only";

type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

export type EmailDeliveryResult = { ok: true; id?: string } | { ok: false; error: string };

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}

export async function sendTransactionalEmail(email: TransactionalEmail): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    console.error("[email] RESEND_API_KEY or RESEND_FROM is not configured");
    return { ok: false, error: "email_not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": email.idempotencyKey.slice(0, 256),
        "User-Agent": "Featable/1.0",
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(process.env.RESEND_REPLY_TO?.trim() ? { reply_to: process.env.RESEND_REPLY_TO.trim() } : {}),
      }),
    });
    const payload = await response.json().catch(() => null) as { id?: string; message?: string } | null;
    if (!response.ok) {
      console.error("[email] Resend request failed", response.status, payload?.message ?? "unknown_error");
      return { ok: false, error: "email_delivery_failed" };
    }
    return { ok: true, id: payload?.id };
  } catch (error) {
    console.error("[email] Resend request failed", error instanceof Error ? error.message : "unknown_error");
    return { ok: false, error: "email_delivery_failed" };
  }
}
