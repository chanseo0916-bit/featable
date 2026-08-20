"use client";

import { useMemo, useState } from "react";

interface PromptInput {
  name: string;
  category: string;
  tagline?: string;
  problem?: string;
  solution?: string;
  features?: string; // 줄바꿈 구분
}

const STYLE_SUFFIX =
  "\n\n스타일: 미니멀한 한국 스타트업 브랜드 상세페이지 이미지. 완전한 흰색 배경, 포인트 컬러는 오렌지(#EF4125) 하나만 사용. 깔끔한 여백, 부드러운 자연광, 과장 없는 사실적인 연출. 이미지 안에 글자·로고·워터마크는 넣지 말 것.";

function buildPrompts(input: PromptInput) {
  const name = input.name.trim() || "이 제품";
  const tagline = input.tagline?.trim() || "";
  const problem = input.problem?.trim();
  const solution = input.solution?.trim() || tagline;
  const firstFeature = input.features?.split("\n").map((s) => s.trim()).filter(Boolean)[0];

  return [
    {
      key: "hero",
      title: "① 대표 이미지",
      ratio: "16:9",
      body: `${name}의 대표 컷. ${tagline ? `${tagline}. ` : ""}흰색 스튜디오 배경 중앙에 제품(서비스라면 기기 화면 속 인터페이스)을 하나만 배치하고, 오렌지색 소품 하나로 포인트. 45도 위에서 내려다보는 앵글, 부드러운 그림자.${STYLE_SUFFIX}`,
    },
    {
      key: "intro",
      title: "② 인트로 무드컷",
      ratio: "4:5",
      body: `${input.category} 분야의 제품 ${name}${tagline ? `(${tagline})` : ""}을 타깃 고객이 일상 공간에서 자연스럽게 사용하는 라이프스타일 사진. 밝고 따뜻한 자연광, 흰색과 우드톤 위주의 공간, 오렌지색 소품 하나가 은은하게 보임. 깨끗한 현대적 톤.${STYLE_SUFFIX}`,
    },
    {
      key: "problem",
      title: "③ 문제 제기 컷",
      ratio: "4:5",
      body: `${problem ? `"${problem}" 라는 문제 상황` : `${name}이 해결하려는 문제 상황`}을 보여주는 연출 사진. 답답하고 비효율적인 느낌이 들도록 약간 어수선하게, 하지만 지저분하지 않게. 채도를 살짝 낮춘 회색조 톤으로, 이 컷만 예외적으로 오렌지 포인트 없이 (다음 솔루션 컷과의 대비 목적).\n\n스타일: 미니멀한 한국 스타트업 브랜드 상세페이지 이미지. 이미지 안에 글자는 넣지 말 것.`,
    },
    {
      key: "solution",
      title: "④ 솔루션 컷",
      ratio: "4:5",
      body: `문제 컷과 같은 공간·같은 앵글에서, ${name}으로 문제가 해결된 정돈된 모습. ${solution ? `${solution}. ` : ""}밝은 흰색 톤에 오렌지 포인트가 선명하게 살아있는 대비 연출.${STYLE_SUFFIX}`,
    },
    {
      key: "feature",
      title: "⑤ 기능 클로즈업",
      ratio: "1:1",
      body: `${name}의 ${firstFeature ? `"${firstFeature}" 기능` : "핵심 기능"}이 작동하는 순간을 보여주는 클로즈업 컷. 흰색 배경, 해당 부분에 초점을 맞춘 매크로 촬영 느낌. 화살표나 라벨 없이 구도 자체로 기능이 보이게.${STYLE_SUFFIX}`,
    },
    {
      key: "closing",
      title: "⑥ 클로징 컷",
      ratio: "16:9",
      body: `${name}이 창가 햇살 아래 놓인 모습처럼 여운을 주는 상징적인 클로징 컷. 화면 오른쪽 절반은 텍스트를 얹을 수 있게 흰 여백으로 비워둘 것. 미니멀하고 감성적인 분위기.${STYLE_SUFFIX}`,
    },
  ];
}

/**
 * 상세페이지 이미지가 없는 파운더를 위한 프롬프트 생성기.
 * 입력한 제품 정보로 자동 완성된 프롬프트를 외부 이미지 생성 AI(GPT, 미드저니 등)에
 * 붙여넣어 상세컷을 만들 수 있게 한다. Featable이 이미지를 직접 생성하지는 않는다.
 */
export function ImagePromptHelper(input: PromptInput) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const prompts = useMemo(() => buildPrompts(input), [input]);

  async function copy(key: string, body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("아래 프롬프트를 복사하세요:", body);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-border bg-accent-soft/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-extrabold">
          ✨ 상세페이지 이미지가 아직 없나요?
          <span className="ml-2 font-medium text-muted">
            제품 정보로 완성된 AI 이미지 프롬프트를 복사해 쓰세요
          </span>
        </span>
        <span className="text-lg text-muted">{open ? "–" : "+"}</span>
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-5">
          <p className="py-3 text-xs leading-relaxed text-muted">
            아래 프롬프트를 GPT·미드저니 등 이미지 생성 AI에 붙여넣으면 상세페이지용
            컷이 나옵니다. <b>①→⑥ 순서로 한 대화 안에서</b> 생성해야 톤이 유지되고,
            만든 이미지를 순서대로 이미지 블록에 올리면 상세페이지가 완성됩니다.
          </p>
          <div className="grid gap-2">
            {prompts.map((p) => (
              <div key={p.key} className="flex items-start gap-3 rounded-xl border border-border bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">
                    {p.title} <span className="ml-1 font-medium text-muted">{p.ratio} 권장</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">{p.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copy(p.key, p.body)}
                  className={`flex-none rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${
                    copied === p.key
                      ? "bg-accent text-white"
                      : "border border-border text-muted hover:border-accent hover:text-accent"
                  }`}
                >
                  {copied === p.key ? "복사됨 ✓" : "복사"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
