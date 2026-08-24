import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth";
import { recordServerActivity } from "@/lib/activity";

/** 이메일 인증 링크 클릭 후 세션 교환 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/my");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await recordServerActivity({ userId: user.id, eventName: "login", path: "/auth/callback", entityType: "user", entityId: user.id, metadata: { method: user.app_metadata.provider || "oauth" } });
        if (user.app_metadata.provider && user.app_metadata.provider !== "email") {
          const createdAt = Date.parse(user.created_at);
          if (Number.isFinite(createdAt) && Date.now() - createdAt < 10 * 60 * 1000) {
            await recordServerActivity({ userId: user.id, eventName: "signup", path: "/auth/callback", entityType: "user", entityId: user.id, metadata: { method: user.app_metadata.provider } });
          }
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed_at")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.onboarding_completed_at) {
          const onboardingUrl = new URL("/onboarding", origin);
          onboardingUrl.searchParams.set("next", next);
          return NextResponse.redirect(onboardingUrl);
        }
      }
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
