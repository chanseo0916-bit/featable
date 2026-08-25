export const MEMBER_TYPES = ["founder", "team", "explorer", "partner"] as const;

export type MemberType = (typeof MEMBER_TYPES)[number];

export function isMemberType(value: string): value is MemberType {
  return MEMBER_TYPES.includes(value as MemberType);
}

/** 인증 이후 이동은 같은 사이트의 절대 경로만 허용한다. */
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (
    !value
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(value)
  ) return fallback;
  return value;
}

