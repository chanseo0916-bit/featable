/**
 * 한국 시간 기준 날짜 표기.
 *
 * 서버가 Cloudflare Workers(UTC)에서 돌기 때문에 timeZone을 지정하지 않으면
 * 한국 새벽 0~9시에 쓴 글이 전날 날짜로 찍힌다. 사용자 화면의 시각 표기는
 * 전부 여기를 거친다.
 */

const KST = "Asia/Seoul";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATE_TIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const dateOnly = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST, year: "numeric", month: "short", day: "numeric",
});
const monthDay = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST, month: "short", day: "numeric",
});
const dateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
});
const eventDateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST, year: "numeric", month: "long", day: "numeric",
  weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
});

function parse(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * datetime-local 값을 한국 현지 시각으로 해석합니다.
 *
 * datetime-local에는 타임존 정보가 없으므로 `new Date(value)`로 파싱하면
 * 실행 환경(브라우저/KST 또는 Workers/UTC)에 따라 서로 다른 순간이 됩니다.
 */
export function parseKstDateTimeInput(value: string): Date | null {
  const match = DATE_TIME_LOCAL_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "0"] = match;
  const parts = [year, month, day, hour, minute, second].map(Number);
  const [y, m, d, h, min, s] = parts;
  const localTimestamp = Date.UTC(y, m - 1, d, h, min, s);
  const localDate = new Date(localTimestamp);
  const isValid = localDate.getUTCFullYear() === y
    && localDate.getUTCMonth() === m - 1
    && localDate.getUTCDate() === d
    && localDate.getUTCHours() === h
    && localDate.getUTCMinutes() === min
    && localDate.getUTCSeconds() === s;

  return isValid ? new Date(localTimestamp - KST_OFFSET_MS) : null;
}

/** 저장된 절대 시각을 한국 시간의 datetime-local 입력값으로 변환합니다. */
export function formatKstDateTimeInput(value: string | null): string {
  if (!value) return "";
  const date = parse(value);
  return date ? new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 16) : "";
}

/** "2026년 8월 26일" */
export function formatDateKst(value: string): string {
  const date = parse(value);
  return date ? dateOnly.format(date) : "";
}

/** "8월 26일" */
export function formatMonthDayKst(value: string): string {
  const date = parse(value);
  return date ? monthDay.format(date) : "";
}

/** "8월 26일 오전 04:02" */
export function formatDateTimeKst(value: string): string {
  const date = parse(value);
  return date ? dateTime.format(date) : "";
}

/** "2026년 8월 26일 (수) 오후 07:00" — 행사 시작 시각처럼 요일까지 필요한 곳 */
export function formatEventDateTimeKst(value: string): string {
  const date = parse(value);
  return date ? eventDateTime.format(date) : "";
}

/**
 * 대화형 화면(댓글, 피드)용 상대 시각. 하루가 지나면 날짜로 떨어진다.
 * 같은 날 안에서 순서를 읽을 수 있어야 해서 절대 날짜만 쓰지 않는다.
 */
export function formatRelativeKst(value: string): string {
  const date = parse(value);
  if (!date) return "";

  const elapsedMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (elapsedMinutes < 0) return dateTime.format(date);
  if (elapsedMinutes < 1) return "방금";
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}시간 전`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}일 전`;

  return monthDay.format(date);
}
