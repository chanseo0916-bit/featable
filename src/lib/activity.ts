import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActivityEventName =
  | "page_view"
  | "signup"
  | "login"
  | "brand_created"
  | "product_published"
  | "story_published"
  | "event_created"
  | "partner_inquiry";

export async function recordServerActivity(input: {
  userId?: string | null;
  eventName: ActivityEventName;
  path: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const admin = createAdminClient();
  if (!admin) return;

  await admin.from("user_activity_events").insert({
    user_id: input.userId ?? null,
    session_id: input.userId ? `account:${input.userId}` : "server:anonymous",
    event_name: input.eventName,
    path: input.path.slice(0, 500),
    entity_type: input.entityType?.slice(0, 80) ?? null,
    entity_id: input.entityId?.slice(0, 160) ?? null,
    metadata: input.metadata ?? {},
  });
}
