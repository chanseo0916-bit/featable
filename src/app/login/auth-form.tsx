"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { login, signup, type AuthState } from "./actions";

const initialState: AuthState = {};
const memberTypes = [
  { value: "founder", label: "창업가·대표", copy: "브랜드나 프로덕트를 만들고 있어요", icon: "↗" },
  { value: "team", label: "팀 멤버", copy: "팀에서 제품을 함께 만들고 있어요", icon: "+" },
  { value: "explorer", label: "예비 창업가", copy: "창업을 준비하며 기회를 찾고 있어요", icon: "⌕" },
  { value: "partner", label: "파트너", copy: "투자·지원·행사·커뮤니티를 운영해요", icon: "◎" },
] as const;
const fieldClass = "w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-[#b2b2b2] focus:border-accent focus:ring-2 focus:ring-[#EF41251A]";

export function AuthForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login",
  );
  const next = searchParams.get("next") ?? "/";
  const urlError = searchParams.get("error");
  const [loginState, loginAction, loginPending] = useActionState(login, initialState);
  const [signupState, signupAction, signupPending] = useActionState(signup, initialState);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [consents, setConsents] = useState({ terms: false, privacy: false, marketing: false });
  const allAgreed = consents.terms && consents.privacy && consents.marketing;
  const toggleAllConsents = () => {
    const next = !allAgreed;
    setConsents({ terms: next, privacy: next, marketing: next });
  };
  const state = mode === "login" ? loginState : signupState;
  const pending = mode === "login" ? loginPending : signupPending;

  async function signInWithGoogle() {
    setGoogleError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setGoogleError("구글 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }

  return (
    <div>
      <div className="mb-7 flex border-b border-border">
        {(["login", "signup"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setMode(item)} className={`relative flex-1 pb-3 text-sm font-extrabold transition ${mode === item ? "text-foreground" : "text-muted hover:text-foreground"}`}>
            {item === "login" ? "로그인" : "회원가입"}
            {mode === item && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <p className="text-xs font-extrabold tracking-[0.14em] text-accent">{mode === "login" ? "로그인" : "회원가입"}</p>
        <h1 className="mt-2 text-[28px] font-black tracking-[-0.045em]">{mode === "login" ? "다시 만나서 반가워요" : "어떤 사람인지 알려주세요"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{mode === "login" ? "계속해서 새로운 제품과 Founder를 만나보세요." : "가입에 필요한 최소 정보만 받아요. 브랜드 정보는 나중에 등록할 수 있습니다."}</p>
      </div>

      <button type="button" onClick={signInWithGoogle} className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white py-3.5 text-sm font-extrabold transition hover:border-[#aaa] hover:bg-[#fafafa]">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Google로 {mode === "login" ? "로그인" : "시작하기"}
      </button>

      {(googleError || urlError) && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">{googleError ?? "인증에 실패했습니다. 다시 시도해주세요."}</p>}
      <div className="my-6 flex items-center gap-3 text-[10px] font-bold tracking-[0.1em] text-[#aaa]"><span className="h-px flex-1 bg-border" />이메일로 계속<span className="h-px flex-1 bg-border" /></div>

      <form action={mode === "login" ? loginAction : signupAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {mode === "signup" && <div><label className="mb-2 block text-xs font-bold" htmlFor="signup-name">이름</label><input id="signup-name" name="fullName" type="text" required minLength={2} maxLength={40} autoComplete="name" placeholder="어떻게 불러드리면 될까요?" className={fieldClass} /></div>}
        <div><label className="mb-2 block text-xs font-bold" htmlFor="auth-email">이메일</label><input id="auth-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={fieldClass} /></div>

        <div className={mode === "signup" ? "grid gap-3 sm:grid-cols-2" : ""}>
          <div><label className="mb-2 block text-xs font-bold" htmlFor="auth-password">비밀번호</label><input id="auth-password" name="password" type="password" required minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "signup" ? "8자 이상" : "비밀번호"} className={fieldClass} /></div>
          {mode === "signup" && <div><label className="mb-2 block text-xs font-bold" htmlFor="password-confirm">비밀번호 확인</label><input id="password-confirm" name="passwordConfirm" type="password" required minLength={8} autoComplete="new-password" placeholder="한 번 더 입력" className={fieldClass} /></div>}
        </div>

        {mode === "signup" && (
          <fieldset className="pt-2">
            <legend className="mb-1 text-xs font-bold">현재 어떤 역할로 활동하고 있나요?</legend>
            <p className="mb-3 text-[11px] text-muted">가장 가까운 역할을 선택해주세요.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {memberTypes.map((item) => (
                <label key={item.value} className="group flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3.5 transition hover:border-[#bbb] has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                  <input className="sr-only" type="radio" name="memberType" value={item.value} required />
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f3f3f3] text-sm font-black text-[#777] group-has-[:checked]:bg-accent group-has-[:checked]:text-white">{item.icon}</span>
                  <span><strong className="block text-xs">{item.label}</strong><small className="mt-1 block text-[11px] leading-4 text-muted">{item.copy}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {mode === "signup" && (
          <div className="space-y-3 rounded-xl bg-[#f6f6f6] p-4 text-xs text-[#555]">
            <label className="flex items-start gap-3 border-b border-[#e3e3e3] pb-3">
              <input className="mt-0.5 accent-[#EF4125]" type="checkbox" checked={allAgreed} onChange={toggleAllConsents} />
              <span className="text-[13px] font-bold text-foreground">전체 동의합니다.</span>
            </label>
            <label className="flex items-start gap-3"><input className="mt-0.5 accent-[#EF4125]" type="checkbox" name="termsAccepted" required checked={consents.terms} onChange={(e) => setConsents((c) => ({ ...c, terms: e.target.checked }))} /><span><b className="text-foreground">[필수]</b> Featable <Link href="/terms" target="_blank" className="underline hover:text-accent">이용약관</Link>에 동의합니다.</span></label>
            <label className="flex items-start gap-3"><input className="mt-0.5 accent-[#EF4125]" type="checkbox" name="privacyAccepted" required checked={consents.privacy} onChange={(e) => setConsents((c) => ({ ...c, privacy: e.target.checked }))} /><span><b className="text-foreground">[필수]</b> <Link href="/privacy" target="_blank" className="underline hover:text-accent">개인정보 수집 및 이용</Link>에 동의합니다.</span></label>
            <label className="flex items-start gap-3"><input className="mt-0.5 accent-[#EF4125]" type="checkbox" name="marketingAccepted" checked={consents.marketing} onChange={(e) => setConsents((c) => ({ ...c, marketing: e.target.checked }))} /><span>[선택] 새로운 Founder와 행사 소식을 받아봅니다.</span></label>
          </div>
        )}

        {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">{state.error}</p>}
        {state.message && <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-xs font-semibold text-accent">{state.message}</p>}
        <button type="submit" disabled={pending} className="w-full rounded-xl bg-accent py-4 text-sm font-extrabold text-white transition hover:bg-accent-hover disabled:opacity-50">{pending ? "처리 중…" : mode === "login" ? "로그인" : "Featable 가입하기"}</button>
      </form>
    </div>
  );
}
