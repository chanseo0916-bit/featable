"use client";

import { useActionState } from "react";
import { completeOnboarding, type OnboardingState } from "./actions";

const initialState: OnboardingState = {};

const memberTypes = [
  { value: "founder", label: "창업가·대표", copy: "브랜드나 프로덕트를 만들고 있어요" },
  { value: "team", label: "팀 멤버", copy: "스타트업이나 프로젝트 팀에서 함께 일해요" },
  { value: "explorer", label: "예비 창업가", copy: "창업을 준비하며 새로운 기회를 찾고 있어요" },
  { value: "partner", label: "파트너", copy: "투자·지원사업·행사·커뮤니티를 운영해요" },
] as const;

export function OnboardingForm({ defaultName, next }: { defaultName: string; next: string }) {
  const [state, action, pending] = useActionState(completeOnboarding, initialState);

  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="mb-2 block text-sm font-bold" htmlFor="onboarding-name">이름</label>
        <input
          id="onboarding-name"
          name="fullName"
          defaultValue={defaultName}
          required
          minLength={2}
          maxLength={40}
          autoComplete="name"
          className="w-full rounded-xl border border-border px-4 py-3.5 text-sm outline-none transition-colors focus:border-accent"
          placeholder="어떻게 불러드리면 될까요?"
        />
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-bold">현재 어떤 역할로 활동하고 있나요?</legend>
        <p className="mb-3 text-xs text-muted">가장 가까운 역할을 선택해주세요.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {memberTypes.map((item) => (
            <label key={item.value} className="cursor-pointer rounded-xl border border-border p-4 transition hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input className="sr-only" type="radio" name="memberType" value={item.value} required />
              <strong className="block text-sm">{item.label}</strong>
              <span className="mt-1 block text-xs leading-5 text-muted">{item.copy}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3 rounded-xl bg-[#f7f7f7] p-4 text-xs text-[#555]">
        <label className="flex items-start gap-3"><input className="mt-0.5 accent-[#EF4125]" type="checkbox" name="termsAccepted" required /><span><b className="text-foreground">[필수]</b> Featable 이용약관에 동의합니다.</span></label>
        <label className="flex items-start gap-3"><input className="mt-0.5 accent-[#EF4125]" type="checkbox" name="privacyAccepted" required /><span><b className="text-foreground">[필수]</b> 개인정보 수집 및 이용에 동의합니다.</span></label>
        <label className="flex items-start gap-3"><input className="mt-0.5 accent-[#EF4125]" type="checkbox" name="marketingAccepted" /><span>[선택] 새로운 Founder와 행사 소식을 받아봅니다.</span></label>
      </div>

      {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="w-full rounded-xl bg-accent py-4 text-sm font-extrabold text-white transition hover:bg-accent-hover disabled:opacity-50">
        {pending ? "저장 중…" : "Featable 시작하기"}
      </button>
    </form>
  );
}

