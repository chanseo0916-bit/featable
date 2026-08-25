"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { MemberType } from "@/lib/auth";

const guideByRole: Record<MemberType, {
  label: string;
  title: string;
  description: string;
  steps: { title: string; copy: string }[];
  action: { href: string; label: string };
}> = {
  founder: {
    label: "FOUNDER STUDIO",
    title: "내 이야기와 제품을 세상에 보여주는 공간이에요.",
    description: "프로필부터 기업·프로덕트·인터뷰까지 등록하고, 공개 상태와 반응을 한곳에서 관리할 수 있어요.",
    steps: [
      { title: "내 프로필", copy: "인터뷰와 팀 페이지에 표시될 내 정보를 완성해요." },
      { title: "기업과 프로덕트", copy: "기업 정보는 한 번 등록하고 제품은 그 안에 추가해요." },
      { title: "공개하고 관리", copy: "초안을 확인한 뒤 공개하고 조회와 반응을 살펴봐요." },
    ],
    action: { href: "/my/profile", label: "내 프로필부터 확인하기 →" },
  },
  team: {
    label: "TEAM WORKSPACE",
    title: "소속된 팀의 공개 정보를 함께 관리하는 공간이에요.",
    description: "초대받은 브랜드를 확인하고 팀 프로필과 콘텐츠 작업을 이어갈 수 있어요. 내 인터뷰도 별도로 등록할 수 있습니다.",
    steps: [
      { title: "팀 초대 확인", copy: "초대를 수락하면 참여 중인 브랜드가 이곳에 나타나요." },
      { title: "팀 프로필", copy: "브랜드 공개 페이지에 표시될 역할과 소개를 입력해요." },
      { title: "콘텐츠 작업", copy: "권한에 따라 팀 콘텐츠를 확인하고 함께 수정해요." },
    ],
    action: { href: "/my/profile", label: "내 프로필 확인하기 →" },
  },
  explorer: {
    label: "DISCOVERY HOME",
    title: "창업가와 제품, 다음 기회를 모아보는 공간이에요.",
    description: "관심 있는 Founder와 프로덕트를 저장하고, 행사와 지원사업까지 나만의 목록으로 관리할 수 있어요.",
    steps: [
      { title: "발견하기", copy: "Founder·프로덕트·인터뷰를 둘러보세요." },
      { title: "저장과 응원", copy: "다시 보고 싶은 항목을 내 목록에 모아요." },
      { title: "직접 참여", copy: "행사와 지원사업을 확인하고 다음 행동으로 이어가요." },
    ],
    action: { href: "/founders", label: "Founder 둘러보기 →" },
  },
  partner: {
    label: "PARTNER CENTER",
    title: "Founder에게 좋은 기회를 연결하는 공간이에요.",
    description: "파트너 정보와 행사·지원사업을 제안하고, 승인된 콘텐츠를 직접 등록하고 관리할 수 있어요.",
    steps: [
      { title: "파트너 제안", copy: "조직과 담당자 정보를 제출해요." },
      { title: "승인 후 등록", copy: "행사와 지원사업 정보를 직접 완성해요." },
      { title: "운영과 확인", copy: "등록 상태와 참여 가능한 기회를 한곳에서 확인해요." },
    ],
    action: { href: "/my/partner/register", label: "파트너 도구 확인하기 →" },
  },
};

export function StudioWelcomeGuide({ userId, memberType }: { userId: string; memberType: MemberType }) {
  const storageKey = `featable:studio-guide:v1:${userId}`;
  const guide = guideByRole[memberType];

  // Read the browser-only preference through the external-store API so the
  // server can render a stable closed snapshot without an effect setState.
  const subscribe = useCallback((onStoreChange: () => void) => {
    const onStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey) onStoreChange();
    };
    const onGuideChange = () => onStoreChange();
    window.addEventListener("storage", onStorageChange);
    window.addEventListener("featable:studio-guide-change", onGuideChange);
    return () => {
      window.removeEventListener("storage", onStorageChange);
      window.removeEventListener("featable:studio-guide-change", onGuideChange);
    };
  }, [storageKey]);
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey) === "seen";
    } catch {
      return false;
    }
  }, [storageKey]);
  const getServerSnapshot = useCallback(() => true, []);
  const seen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);
  const open = !seen && !dismissed;

  const close = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, "seen");
    } catch {
      // 저장소가 차단된 환경에서는 현재 화면에서만 닫힌 상태를 유지한다.
    }
    setDismissed(true);
    window.dispatchEvent(new Event("featable:studio-guide-change"));
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [close, open]);

  if (!open) return null;

  return <div className="studio-guide-backdrop" role="presentation">
    <section className="studio-guide" role="dialog" aria-modal="true" aria-labelledby="studio-guide-title">
      <header>
        <div><span>{guide.label}</span><h2 id="studio-guide-title">Featable Studio에 오신 걸 환영해요.</h2></div>
        <button type="button" onClick={close} aria-label="스튜디오 안내 닫기">×</button>
      </header>
      <div className="studio-guide-intro">
        <strong>{guide.title}</strong>
        <p>{guide.description}</p>
      </div>
      <ol>
        {guide.steps.map((step, index) => <li key={step.title}>
          <i>0{index + 1}</i>
          <div><strong>{step.title}</strong><p>{step.copy}</p></div>
        </li>)}
      </ol>
      <footer>
        <button className="button-secondary button-small" type="button" onClick={close}>안내 닫기</button>
        <Link className="button button-small" href={guide.action.href} onClick={close}>{guide.action.label}</Link>
      </footer>
    </section>
  </div>;
}
