"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EventRegistrationState = {
  ok?: boolean;
  status?: "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled";
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
  if (!user) return { error: "로그인 후 신청해주세요." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const consented = formData.get("consented") === "on";
  if (!consented) return { error: "신청 정보 제공에 동의해주세요." };
  if (name.length < 2 || name.length > 60) return { error: "이름은 2자 이상 60자 이하로 입력해주세요." };
  if (!email || email.length > 254 || !email.includes("@")) return { error: "이메일을 확인해주세요." };
  if (note.length > 500) return { error: "메모는 500자 이하로 입력해주세요." };

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
  revalidatePath(`/events/${slug}`);
  revalidatePath("/my/events");
  return { ok: true, status };
}

export async function cancelEventRegistration(eventId: string, slug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("cancel_my_event_registration", { target_event_id: eventId });
  revalidatePath(`/events/${slug}`);
  revalidatePath("/my/events");
}
