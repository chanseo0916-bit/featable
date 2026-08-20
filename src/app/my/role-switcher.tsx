import type { MemberType } from "@/lib/auth";
import { updateMemberType } from "./actions";

export function RoleSwitcher({ memberType }: { memberType: MemberType }) {
  const roles: { value: MemberType; label: string; description: string }[] = [
    { value: "founder", label: "창업가·대표", description: "브랜드를 만들고 운영해요" },
    { value: "team", label: "팀 멤버", description: "브랜드 운영에 함께 참여해요" },
    { value: "explorer", label: "예비 창업가", description: "사람과 제품, 기회를 발견해요" },
    { value: "partner", label: "파트너", description: "행사와 지원 기회를 운영해요" },
  ];

  return (
    <form action={updateMemberType} className="role-settings-grid">
      {roles.map((role) => (
        <button key={role.value} type="submit" name="memberType" value={role.value} className={memberType === role.value ? "active" : ""} aria-pressed={memberType === role.value}>
          <span>{role.label}</span>
          <small>{role.description}</small>
          <i>{memberType === role.value ? "현재 역할" : "선택"}</i>
        </button>
      ))}
    </form>
  );
}
