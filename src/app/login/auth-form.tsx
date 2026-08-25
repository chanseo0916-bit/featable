"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { login, signup, type AuthState } from "./actions";

const initialState: AuthState = {};
const memberTypes = [
  { value: "founder", label: "창업가·대표", icon: "↗" },
  { value: "team", label: "팀 멤버", icon: "+" },
  { value: "explorer", label: "예비 창업가", icon: "⌕" },
  { value: "partner", label: "파트너", icon: "◎" },
] as const;
const fieldClass = "w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20";

export function AuthForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login",
  );
  const next = searchParams.get("next") ?? "/";
  const unlocksBalanceResult = next === "/balance" || next.startsWith("/balance?");
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
  const description = unlocksBalanceResult
    ? "로그인하면 내 표는 그대로 유지되고, 실시간 결과와 선택 이유가 바로 열려요."
    : mode === "login"
      ? "오늘도 새로운 발견을 준비했어요."
      : "필수 정보만 입력하면 끝나요.";

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
      <div className="mb-10 flex border-b border-border">
        {(["login", "signup"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setMode(item)} className={`relative flex-1 pb-3 text-sm font-bold transition ${mode === item ? "text-foreground" : "text-muted hover:text-foreground"}`}>
            {item === "login" ? "로그인" : "회원가입"}
            {mode === item && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
          </button>
        ))}
      </div>

      <div className="mb-12 text-center">
        <p className="font-bold tracking-[-0.02em] text-foreground" style={{ fontSize: "var(--fs-t8)" }}>{description}</p>
      </div>

      <button type="button" onClick={signInWithGoogle} className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white py-3.5 text-sm font-bold transition hover:border-muted hover:bg-surface">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Google로 {unlocksBalanceResult ? "결과 보기" : mode === "login" ? "로그인" : "시작하기"}
      </button>

      {(googleError || urlError) && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">{googleError ?? "인증에 실패했습니다. 다시 시도해주세요."}</p>}
      <div className="my-6 flex items-center gap-3 text-xs font-medium tracking-[0.02em] text-muted"><span className="h-px flex-1 bg-border" />이메일로 계속<span className="h-px flex-1 bg-border" /></div>

      <form action={mode === "login" ? loginAction : signupAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {mode === "signup" && <div><label className="mb-2 block text-xs font-medium text-muted" htmlFor="signup-name">이름</label><input id="signup-name" name="fullName" type="text" required minLength={2} maxLength={40} autoComplete="name" placeholder="이름" className={fieldClass} /></div>}
        <div><label className="mb-2 block text-xs font-medium text-muted" htmlFor="auth-email">이메일</label><input id="auth-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={fieldClass} /></div>

        <div className={mode === "signup" ? "grid gap-3 sm:grid-cols-2" : ""}>
          <div><label className="mb-2 block text-xs font-medium text-muted" htmlFor="auth-password">비밀번호</label><input id="auth-password" name="password" type="password" required minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "signup" ? "8자 이상" : "비밀번호"} className={fieldClass} /></div>
          {mode === "signup" && <div><label className="mb-2 block text-xs font-medium text-muted" htmlFor="password-confirm">비밀번호 확인</label><input id="password-confirm" name="passwordConfirm" type="password" required minLength={8} autoComplete="new-password" placeholder="비밀번호 확인" className={fieldClass} /></div>}
        </div>

        {mode === "signup" && (
          <fieldset className="pt-2">
            <legend className="mb-3 text-xs font-medium text-muted">역할을 선택해주세요</legend>
            <div className="grid grid-cols-2 gap-2">
              {memberTypes.map((item) => (
                <label key={item.value} className="group flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 transition hover:border-muted has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                  <input className="sr-only" type="radio" name="memberType" value={item.value} required />
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md text-xs font-medium text-muted">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {mode === "signup" && (
          <div className="space-y-3 rounded-xl bg-surface p-4 text-xs text-muted">
            <label className="flex items-start gap-3 border-b border-border pb-3">
              <input className="mt-0.5 accent-[#EF4125]" type="checkbox" checked={allAgreed} onChange={toggleAllConsents} />
              <span className="text-sm font-bold text-foreground">전체 동의합니다.</span>
            </label>
            <label className="flex items-start gap-3"><input className="mt-0.5 accent-[#EF4125]" type="checkbox" name="termsAccepted" required checked={consents.terms} onChange={(e) => setConsents((c) => ({ ...c, terms: e.target.checked }))} /><span><b className="text-foreground">[필수]</b> Featable <Link href="/terms" target="_blank" className="underline hover:text-accent">이용약관</Link>에 동의합니다.</span></label>
            <label className="flex items-start gap-3"><input className="mt-0.5 accent-[#EF4125]" type="checkbox" name="privacyAccepted" required checked={consents.privacy} onChange={(e) => setConsents((c) => ({ ...c, privacy: e.target.checked }))} /><span><b className="text-foreground">[필수]</b> <Link href="/privacy" target="_blank" className="underline hover:text-accent">개인정보 수집 및 이용</Link>에 동의합니다.</span></label>
            <label className="flex items-start gap-3"><input className="mt-0.5 accent-[#EF4125]" type="checkbox" name="marketingAccepted" checked={consents.marketing} onChange={(e) => setConsents((c) => ({ ...c, marketing: e.target.checked }))} /><span>[선택] 새로운 Founder와 행사 소식을 받아봅니다.</span></label>
          </div>
        )}

        {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">{state.error}</p>}
        {state.message && <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-xs font-semibold text-accent">{state.message}</p>}
        <button type="submit" disabled={pending} className="w-full rounded-xl bg-accent py-4 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-50">{pending ? "처리 중…" : unlocksBalanceResult ? mode === "login" ? "로그인하고 결과 보기" : "가입하고 결과 보기" : mode === "login" ? "로그인" : "Featable 가입하기"}</button>
      </form>
    </div>
  );
}
