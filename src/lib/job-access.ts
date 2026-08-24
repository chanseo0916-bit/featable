import "server-only";

import { createClient } from "@/lib/supabase/server";

export type JobOrganizationType = "brand" | "community" | "partner";
export interface JobOrganizationChoice {
  id: string;
  type: JobOrganizationType;
  name: string;
  logoUrl: string | null;
}

interface LinkedOrganization { id: string; name: string; logo_url: string | null; }

export function jobOrganizationKey(type: JobOrganizationType, id: string) {
  return `${type}:${id}`;
}

export async function getMyJobAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, organizations: [] as JobOrganizationChoice[] };

  const [{ data: founder }, { data: memberships }, { data: ownedCommunities }, { data: managedCommunities }, { data: partners }, { data: partnerMemberships }] = await Promise.all([
    supabase.from("founders").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("brand_members").select("member_role,brand:brands(id,name,logo_url)").eq("user_id", user.id).eq("member_role", "editor"),
    supabase.from("communities").select("id,name,logo_url").eq("manager_user_id", user.id),
    supabase.from("community_managers").select("community:communities(id,name,logo_url)").eq("user_id", user.id),
    supabase.from("partners").select("id,name,logo_url").eq("owner_user_id", user.id),
    supabase.from("partner_members").select("member_role,partner:partners(id,name,logo_url)").eq("user_id", user.id).in("member_role", ["manager", "editor"]),
  ]);
  const { data: ownedBrands } = founder
    ? await supabase.from("brands").select("id,name,logo_url").eq("founder_id", founder.id)
    : { data: [] };

  const organizations = new Map<string, JobOrganizationChoice>();
  const add = (type: JobOrganizationType, item: LinkedOrganization | null) => {
    if (!item) return;
    organizations.set(jobOrganizationKey(type, item.id), { id: item.id, type, name: item.name, logoUrl: item.logo_url });
  };
  (ownedBrands ?? []).forEach((item) => add("brand", item));
  ((memberships ?? []) as unknown as { brand: LinkedOrganization | null }[]).forEach((row) => add("brand", row.brand));
  (ownedCommunities ?? []).forEach((item) => add("community", item));
  ((managedCommunities ?? []) as unknown as { community: LinkedOrganization | null }[]).forEach((row) => add("community", row.community));
  (partners ?? []).forEach((item) => add("partner", item));
  ((partnerMemberships ?? []) as unknown as { partner: LinkedOrganization | null }[]).forEach((row) => add("partner", row.partner));

  const partnerIds = [...organizations.values()].filter((item) => item.type === "partner").map((item) => item.id);
  if (partnerIds.length) {
    const { data: partnerCommunities } = await supabase.from("communities").select("id,name,logo_url").in("partner_id", partnerIds);
    (partnerCommunities ?? []).forEach((item) => add("community", item));
  }
  return { supabase, user, organizations: [...organizations.values()] };
}
