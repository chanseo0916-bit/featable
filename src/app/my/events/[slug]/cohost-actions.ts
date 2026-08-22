"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertOwner(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, admin: null, error: "로그인이 필요합니다." };
  const admin = createAdminClient();
  if (!admin) return { user, admin: null, error: "관리 도구를 준비하지 못했습니다." };
  const { data: event } = await admin.from("events").select("submitted_by").eq("id", eventId).maybeSingle();
  if (!event || event.submitted_by !== user.id) return { user, admin, error: "행사 주최자만 공동 주최자를 관리할 수 있습니다." };
  return { user, admin, error: null };
}

export async function inviteEventCohost(eventId: string, slug: string, emailInput: string) {
  const checked = await assertOwner(eventId);
  if (checked.error || !checked.admin || !checked.user) return { ok: false, error: checked.error ?? "권한을 확인하지 못했습니다." };
  const email = emailInput.trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 254) return { ok: false, error: "이메일 주소를 확인해주세요." };
  const { data: invitee } = await checked.admin.from("profiles").select("id,email,full_name").ilike("email", email).maybeSingle();
  if (!invitee) return { ok: false, error: "Featable에 가입한 계정의 이메일만 초대할 수 있어요." };
  if (invitee.id === checked.user.id) return { ok: false, error: "본인은 이미 주최자입니다." };
  const { error } = await checked.admin.from("event_cohosts").upsert({ event_id: eventId, user_id: invitee.id, email: invitee.email ?? email, role: "cohost", created_by: checked.user.id }, { onConflict: "event_id,user_id" });
  if (error) return { ok: false, error: "공동 주최자를 추가하지 못했습니다. migration-34 적용 여부를 확인해주세요." };
  await checked.admin.from("notifications").insert({ user_id: invitee.id, actor_id: checked.user.id, type: "system", title: "행사 공동 주최자로 추가됐어요", message: `${invitee.full_name || email}님이 행사 관리에 참여할 수 있습니다.`, href: `/my/events/${slug}`, data: { kind: "event_cohost_invite", event_id: eventId, event_slug: slug } });
  revalidatePath(`/my/events/${slug}`);
  return { ok: true };
}

export async function removeEventCohost(eventId: string, slug: string, cohostId: string) {
  const checked = await assertOwner(eventId);
  if (checked.error || !checked.admin) return { ok: false, error: checked.error ?? "권한을 확인하지 못했습니다." };
  const { error } = await checked.admin.from("event_cohosts").delete().eq("id", cohostId).eq("event_id", eventId);
  if (error) return { ok: false, error: "공동 주최자를 삭제하지 못했습니다." };
  revalidatePath(`/my/events/${slug}`);
  return { ok: true };
}
