"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sendGuestVerificationEmail, sendRegistrationStatusEmail, type RegistrationEmailStatus } from "@/lib/email/event-registration";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type EventRegistrationState = {
  ok?: boolean;
  status?: "verification_pending" | "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled";
  error?: string;
};

function registrationError(message: string) {
  if (message.includes("authentication_required")) return "로그인 후 신청해주세요.";
  if (message.includes("registration_closed")) return "신청이 마감된 행사입니다.";
  if (message.includes("event_full")) return "정원이 모두 찼습니다.";
  if (message.includes("internal_registration_unavailable")) return "현재 Featable 신청을 받을 수 없는 행사입니다.";
  if (message.includes("invalid_name")) return "이름을 2자 이상 입력해주세요.";
  if (message.includes("invalid_email")) return "이메일을 확인해주세요.";
  if (message.includes("note_too_long")) return "메모는 500자 이하로 입력해주세요.";
  return "신청을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

export async function registerForEvent(
  eventId: string,
  slug: string,
  _previous: EventRegistrationState,
  formData: FormData,
): Promise<EventRegistrationState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const consented = formData.get("consented") === "on";
  if (!consented) return { error: "신청 정보 제공에 동의해주세요." };
  if (name.length < 2 || name.length > 60) return { error: "이름은 2자 이상 60자 이하로 입력해주세요." };
  if (!email || email.length > 254 || !email.includes("@")) return { error: "이메일을 확인해주세요." };
  if (note.length > 500) return { error: "메모는 500자 이하로 입력해주세요." };

  if (!user) {
    const admin = createAdminClient();
    if (!admin) return { error: "신청 메일 설정을 확인하고 있습니다. 잠시 후 다시 시도해주세요." };
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { data, error } = await admin.rpc("request_guest_event_registration", {
      target_event_id: eventId,
      input_name: name,
      input_email: email,
      input_note: note || null,
      input_token_hash: tokenHash,
    });
    if (error) return { error: registrationError(error.message) };
    const result = Array.isArray(data) ? data[0] : data;
    if (result?.should_send_email) {
      const { data: event } = await admin.from("events").select("name,slug").eq("id", eventId).maybeSingle();
      if (!event) return { error: "행사 정보를 확인하지 못했습니다." };
      const delivery = await sendGuestVerificationEmail({
        registrationId: result.registration_id,
        email,
        name,
        eventName: event.name,
        slug: event.slug,
        token,
      });
      if (!delivery.ok) {
        await admin.from("event_registrations").update({ verification_requested_at: null }).eq("id", result.registration_id).eq("status", "verification_pending");
        return { error: "확인 메일을 보내지 못했습니다. Resend 설정을 확인한 뒤 다시 시도해주세요." };
      }
    }
    return { ok: true, status: "verification_pending" };
  }

  const { data, error } = await supabase.rpc("register_for_event", {
    target_event_id: eventId,
    input_name: name,
    input_email: email,
    input_note: note || null,
  });
  if (error) return { error: registrationError(error.message) };

  const result = Array.isArray(data) ? data[0] : data;
  const status = result?.registration_status as EventRegistrationState["status"] | undefined;
  if (!status) return { error: "신청 상태를 확인하지 못했습니다." };
  if (status !== "verification_pending") {
    const { data: event } = await supabase.from("events").select("name,slug").eq("id", eventId).maybeSingle();
    if (event) await sendRegistrationStatusEmail({
      registrationId: result.registration_id,
      email,
      name,
      eventName: event.name,
      slug: event.slug,
      status: status as RegistrationEmailStatus,
    });
  }
  revalidatePath(`/events/${slug}`);
  revalidatePath("/my/events");
  return { ok: true, status };
}

export async function cancelEventRegistration(eventId: string, slug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const [{ data: registration }, { data: event }] = await Promise.all([
    supabase.from("event_registrations").select("id,applicant_name,applicant_email").eq("event_id", eventId).eq("user_id", user.id).maybeSingle(),
    supabase.from("events").select("name,slug").eq("id", eventId).maybeSingle(),
  ]);
  const { data, error } = await supabase.rpc("cancel_my_event_registration", { target_event_id: eventId });
  const result = Array.isArray(data) ? data[0] : data;
  if (!error && registration && event) await sendRegistrationStatusEmail({
    registrationId: registration.id,
    email: registration.applicant_email,
    name: registration.applicant_name,
    eventName: event.name,
    slug: event.slug,
    status: "cancelled",
  });
  if (!error && result?.promoted_registration_id && result.promoted_email && result.promoted_name) {
    await sendRegistrationStatusEmail({
      registrationId: result.promoted_registration_id,
      email: result.promoted_email,
      name: result.promoted_name,
      eventName: result.event_name ?? event?.name ?? "행사",
      slug: result.event_slug ?? slug,
      status: "confirmed",
      version: new Date().toISOString(),
    });
  }
  revalidatePath(`/events/${slug}`);
  revalidatePath("/my/events");
}
