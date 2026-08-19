"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { login, signup, type AuthState } from "./actions";

const initialState: AuthState = {};

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const urlError = searchParams.get("error");

  const [loginState, loginAction, loginPending] = useActionState(
    login,
    initialState,
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
    initialState,
  );

  const state = mode === "login" ? loginState : signupState;
  const pending = mode === "login" ? loginPending : signupPending;

  return (
    <div>
      <div className="mb-6 flex rounded-lg border border-border p-1 text-sm font-semibold">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-2 transition-colors ${
              mode === m
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {m === "login" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>

      <form action={mode === "login" ? loginAction : signupAction}>
        <input type="hidden" name="next" value={next} />
        <label className="mb-1 block text-xs font-semibold text-muted">
          이메일
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="mb-4 w-full rounded-lg border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
        <label className="mb-1 block text-xs font-semibold text-muted">
          비밀번호
        </label>
        <input
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={mode === "signup" ? "8자 이상" : "비밀번호"}
          className="mb-5 w-full rounded-lg border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />

        {(state.error || urlError) && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-600">
            {state.error ?? "인증에 실패했습니다. 다시 시도해주세요."}
          </p>
        )}
        {state.message && (
          <p className="mb-4 rounded-lg bg-accent-soft px-4 py-3 text-xs text-accent">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-accent py-3 text-sm font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending
            ? "처리 중…"
            : mode === "login"
              ? "로그인"
              : "가입하기"}
        </button>
      </form>
    </div>
  );
}
