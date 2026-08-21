"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reviewEventRegistration(registrationId: string, eventSlug: string, decision: "confirm" | "reject") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { error } = await supabase.rpc("review_event_registration", {
    target_registration_id: registrationId,
    decision,
  });
  if (error) return { ok: false, error: "신청 상태를 변경하지 못했습니다." };
  revalidatePath(`/my/events/${eventSlug}`);
  revalidatePath("/my/events");
  return { ok: true };
}
