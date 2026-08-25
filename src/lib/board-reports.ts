export const BOARD_REPORT_REASONS = [
  { value: "spam", label: "광고·도배" },
  { value: "abuse", label: "욕설·혐오·괴롭힘" },
  { value: "privacy", label: "개인정보 노출" },
  { value: "scam", label: "사기·허위정보" },
  { value: "copyright", label: "저작권 침해" },
  { value: "other", label: "기타" },
] as const;

export type BoardReportReason = (typeof BOARD_REPORT_REASONS)[number]["value"];

export const BOARD_REPORT_DETAIL_MAX_LENGTH = 500;

export function isBoardReportReason(value: unknown): value is BoardReportReason {
  return (
    typeof value === "string" &&
    BOARD_REPORT_REASONS.some((reason) => reason.value === value)
  );
}

export function boardReportReasonLabel(value: string) {
  return BOARD_REPORT_REASONS.find((reason) => reason.value === value)?.label ?? value;
}
