"use server";

import { revalidatePath } from "next/cache";
import { sendRegistrationStatusEmail, type RegistrationEmailStatus } from "@/lib/email/event-registration";
import { createClient } from "@/lib/supabase/server";

export async function reviewEventRegistration(registrationId: string, eventSlug: string, decision: "confirm" | "reject") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { data, error } = await supabase.rpc("review_event_registration", {
    target_registration_id: registrationId,
    decision,
  });
  if (error) return { ok: false, error: "신청 상태를 변경하지 못했습니다." };
  const result = Array.isArray(data) ? data[0] : data;
  const [{ data: registration }, { data: event }] = await Promise.all([
    supabase.from("event_registrations").select("applicant_name,applicant_email").eq("id", registrationId).maybeSingle(),
    supabase.from("events").select("name,slug").eq("slug", eventSlug).maybeSingle(),
  ]);
  if (result && registration && event) await sendRegistrationStatusEmail({
    registrationId,
    email: registration.applicant_email,
    name: registration.applicant_name,
    eventName: event.name,
    slug: event.slug,
    status: result.registration_status as RegistrationEmailStatus,
    version: new Date().toISOString(),
  });
  revalidatePath(`/my/events/${eventSlug}`);
  revalidatePath("/my/events");
  return { ok: true };
}
