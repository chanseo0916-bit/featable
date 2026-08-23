import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "가입 정보 설정",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const { next: requestedNext } = await searchParams;
  const next = safeNextPath(requestedNext, "/my");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed_at) redirect(next);

  const metadataName = typeof user.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name
    : typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : "";

  return (
    <main className="min-h-screen bg-[#f6f6f4] px-5 py-10 sm:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[28px] border border-border bg-white lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="flex flex-col justify-between bg-[#111] p-8 text-white sm:p-11">
          <Image src="/featable-logo.png" alt="FEATABLE" width={142} height={28} className="h-auto w-36 brightness-0 invert" priority />
          <div className="my-16">
            <p className="mb-4 text-xs font-extrabold tracking-[0.18em] text-[#ff765f]">마지막 단계</p>
            <h1 className="text-4xl font-black leading-[1.15] tracking-[-0.055em]">발견될 준비를<br />마쳐볼까요?</h1>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/60">딱 필요한 정보만 알려주세요. 브랜드와 Founder 프로필은 나중에 천천히 완성할 수 있어요.</p>
          </div>
          <span className="text-xs text-white/35">FEATABLE</span>
        </aside>
        <section className="p-7 sm:p-11 lg:p-14">
          <p className="text-xs font-extrabold tracking-[0.16em] text-accent">환영합니다</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">가입 정보를 확인해주세요</h2>
          <p className="mb-8 mt-3 text-sm text-muted">이 설정은 맞춤 콘텐츠와 워크스페이스 구성에 사용됩니다.</p>
          <OnboardingForm defaultName={profile?.full_name ?? metadataName} next={next} />
        </section>
      </div>
    </main>
  );
}

