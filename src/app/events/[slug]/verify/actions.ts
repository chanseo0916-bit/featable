"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sendRegistrationStatusEmail, type RegistrationEmailStatus } from "@/lib/email/event-registration";
import { createAdminClient } from "@/lib/supabase/admin";

export type GuestVerificationState = {
  ok?: boolean;
  status?: RegistrationEmailStatus;
  eventName?: string;
  cancelled?: boolean;
  error?: string;
};

function tokenHash(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  return createHash("sha256").update(token).digest("hex");
}

function verificationError(message: string) {
  if (message.includes("verification_link_expired")) return "확인 링크가 만료됐어요. 행사 페이지에서 다시 신청해주세요.";
  if (message.includes("registration_closed")) return "신청이 마감된 행사입니다.";
  if (message.includes("event_full")) return "정원이 모두 찼습니다.";
  return "유효하지 않은 확인 링크입니다. 행사 페이지에서 다시 신청해주세요.";
}

export async function verifyGuestRegistration(slug: string, token: string, _previous: GuestVerificationState): Promise<GuestVerificationState> {
  void _previous;
  const hash = tokenHash(token);
  const admin = createAdminClient();
  if (!hash || !admin) return { error: "유효하지 않은 확인 링크입니다." };
  const { data, error } = await admin.rpc("verify_guest_event_registration", { input_token_hash: hash });
  if (error) return { error: verificationError(error.message) };
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || result.event_slug !== slug) return { error: "유효하지 않은 확인 링크입니다." };
  const status = result.registration_status as RegistrationEmailStatus;
  await sendRegistrationStatusEmail({
    registrationId: result.registration_id,
    email: result.applicant_email,
    name: result.applicant_name,
    eventName: result.event_name,
    slug: result.event_slug,
    status,
  });
  revalidatePath(`/events/${slug}`);
  revalidatePath(`/my/events/${slug}`);
  return { ok: true, status, eventName: result.event_name };
}

export async function cancelGuestRegistration(slug: string, token: string, _previous: GuestVerificationState): Promise<GuestVerificationState> {
  void _previous;
  const hash = tokenHash(token);
  const admin = createAdminClient();
  if (!hash || !admin) return { error: "신청 정보를 확인하지 못했습니다." };
  const { data, error } = await admin.rpc("cancel_guest_event_registration", { input_token_hash: hash });
  if (error) return { error: "신청을 취소하지 못했습니다. 이미 취소됐거나 유효하지 않은 링크입니다." };
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || result.event_slug !== slug) return { error: "신청 정보를 확인하지 못했습니다." };
  await sendRegistrationStatusEmail({
    registrationId: result.registration_id,
    email: result.applicant_email,
    name: result.applicant_name,
    eventName: result.event_name,
    slug: result.event_slug,
    status: "cancelled",
  });
  if (result.promoted_registration_id && result.promoted_email && result.promoted_name) await sendRegistrationStatusEmail({
    registrationId: result.promoted_registration_id,
    email: result.promoted_email,
    name: result.promoted_name,
    eventName: result.event_name,
    slug: result.event_slug,
    status: "confirmed",
    version: new Date().toISOString(),
  });
  revalidatePath(`/events/${slug}`);
  revalidatePath(`/my/events/${slug}`);
  return { ok: true, status: "cancelled", eventName: result.event_name, cancelled: true };
}
