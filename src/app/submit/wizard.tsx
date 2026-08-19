"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";
import type { StoryBlock } from "@/lib/types";
import { deleteSubmissionDraft, publishBrand, saveSubmissionDraft, updateBrand, type PublishInput, type SubmissionDraftInput } from "./actions";

const CATEGORIES = [
  "AI", "SaaS", "F&B", "패션", "뷰티", "콘텐츠", "커머스", "라이프스타일", "교육", "개발", "기타",
];

const STEPS = [
  "기본정보", "Founder", "브랜드", "프로덕트", "상세페이지", "AI 소개", "미리보기", "공개",
];

type Draft = SubmissionDraftInput;

/** 수정 모드에서 서버 페이지가 넘겨주는 초기값 */
export type WizardInitial = Partial<Draft>;
export interface WizardEditTarget {
  brandId: string;
  productId: string;
}

const emptyDraft: Draft = {
  brandName: "", brandSlug: "", category: "기타", tagline: "",
  founderName: "", founderHeadline: "", founderBio: "",
  description: "", problem: "", audience: "", website: "", instagram: "", foundedAt: "",
  productName: "", productSlug: "", productTagline: "",
  productProblem: "", productSolution: "", productFeatures: "",
  price: "", officialUrl: "", logoUrl: "", coverUrl: "", heroUrl: "", story: [],
};

/** AI 생성 결과 */
interface AiResult {
  tagline?: string;
  description?: string;
  productTagline?: string;
  founderHeadline?: string;
}

export function SubmitWizard({
  initial,
  initialStep,
  edit,
}: {
  initial?: WizardInitial;
  initialStep?: number;
  edit?: WizardEditTarget;
} = {}) {
  const [step, setStep] = useState(Math.min(Math.max(initialStep ?? 0, 0), STEPS.length - 1));
  const [draft, setDraft] = useState<Draft>(
    initial ? { ...emptyDraft, ...initial } : emptyDraft,
  );
  const [uploading, setUploading] = useState<"logo" | "cover" | "hero" | null>(null);
  const [storyUploading, setStoryUploading] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ brandSlug: string; productSlug: string } | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "local" | "error">("idle");

  // AI 단계
  const [aiAnswers, setAiAnswers] = useState({ what: "", why: "", who: "", diff: "", say: "" });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    if (initial) return;
    try {
      const cached = window.localStorage.getItem("featable:submission-draft");
      if (!cached) return;
      const parsed = JSON.parse(cached) as { draft?: Partial<Draft>; step?: number };
      if (parsed.draft) setDraft((current) => ({ ...current, ...parsed.draft }));
      if (typeof parsed.step === "number") setStep(Math.min(Math.max(parsed.step, 0), STEPS.length - 1));
    } catch {}
  }, [initial]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem("featable:submission-draft", JSON.stringify({ draft, step, savedAt: Date.now() }));
        setSaveState((state) => state === "saving" ? state : "local");
      } catch {}
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draft, step]);

  async function saveProgress(nextStep = step) {
    setSaveState("saving");
    try {
      window.localStorage.setItem("featable:submission-draft", JSON.stringify({ draft, step: nextStep, savedAt: Date.now() }));
    } catch {}
    const result = await saveSubmissionDraft(draft, nextStep);
    setSaveState(result.ok ? "saved" : "local");
    return result.ok;
  }

  async function goNext() {
    const nextStep = Math.min(step + 1, STEPS.length - 1);
    await saveProgress(nextStep);
    setStep(nextStep);
  }

  async function uploadImage(kind: "logo" | "cover" | "hero", file: File) {
    setUploading(kind);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${window.crypto.randomUUID()}-${kind}.${ext}`;
      const { error: upErr } = await supabase.storage.from("images").upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("images").getPublicUrl(path);
      set(
        kind === "logo"
          ? { logoUrl: data.publicUrl }
          : kind === "cover"
            ? { coverUrl: data.publicUrl }
            : { heroUrl: data.publicUrl },
      );
    } catch {
      setError("이미지 업로드에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setUploading(null);
    }
  }

  function updateStory(index: number, block: StoryBlock) {
    set({ story: draft.story.map((item, itemIndex) => itemIndex === index ? block : item) });
  }

  function addStoryBlock(type: StoryBlock["type"]) {
    const block: StoryBlock = type === "text"
      ? { type: "text", heading: "", body: "" }
      : { type: "image", src: "", alt: "" };
    set({ story: [...draft.story, block] });
  }

  function moveStoryBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.story.length) return;
    const next = [...draft.story];
    [next[index], next[target]] = [next[target], next[index]];
    set({ story: next });
  }

  function removeStoryBlock(index: number) {
    set({ story: draft.story.filter((_, itemIndex) => itemIndex !== index) });
  }

  async function uploadStoryImage(index: number, file: File) {
    setStoryUploading(index);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${window.crypto.randomUUID()}-story.${ext}`;
      const { error: uploadError } = await supabase.storage.from("images").upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("images").getPublicUrl(path);
      const current = draft.story[index];
      if (current?.type === "image") updateStory(index, { ...current, src: data.publicUrl, alt: current.alt || draft.productName });
    } catch {
      setError("상세 이미지 업로드에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setStoryUploading(null);
    }
  }

  async function generateAi() {
    setAiLoading(true);
    setAiNotice(null);
    try {
      const res = await fetch("/api/ai/feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: draft.brandName,
          productName: draft.productName,
          category: draft.category,
          answers: aiAnswers,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAiNotice(json.error ?? "AI 생성에 실패했습니다.");
        return;
      }
      setAiResult(json);
    } catch {
      setAiNotice("AI 생성 중 오류가 발생했습니다.");
    } finally {
      setAiLoading(false);
    }
  }

  function applyAi() {
    if (!aiResult) return;
    set({
      tagline: aiResult.tagline ?? draft.tagline,
      description: aiResult.description ?? draft.description,
      productTagline: aiResult.productTagline ?? draft.productTagline,
      founderHeadline: aiResult.founderHeadline ?? draft.founderHeadline,
      story: draft.story.length > 0 ? draft.story : [
        { type: "text", heading: "왜 만들었나요?", body: aiAnswers.why || draft.productProblem },
        { type: "text", heading: "어떻게 해결하나요?", body: aiAnswers.diff || draft.productSolution },
      ],
    });
    setAiNotice("생성된 문구를 반영했습니다. 미리보기에서 확인하세요.");
  }

  async function submit(publish: boolean) {
    setSubmitting(true);
    setError(null);
    const payload: PublishInput = {
      ...draft,
      productFeatures: draft.productFeatures.split("\n").map((s) => s.trim()).filter(Boolean),
      publish,
    };
    const result = edit
      ? await updateBrand(payload, edit)
      : await publishBrand(payload);
    setSubmitting(false);
    if (result.ok) {
      await deleteSubmissionDraft();
      try { window.localStorage.removeItem("featable:submission-draft"); } catch {}
      setDone({ brandSlug: result.brandSlug, productSlug: result.productSlug });
      setStep(STEPS.length); // 완료 화면
    } else {
      setError(result.error);
    }
  }

  // 단계별 다음 버튼 활성 조건
  const canNext = [
    Boolean(draft.brandName.trim() && draft.tagline.trim()),
    Boolean(draft.founderName.trim() && draft.founderHeadline.trim()),
    Boolean(draft.description.trim()),
    Boolean(draft.productName.trim() && draft.productTagline.trim()),
    true, // 이미지 선택 사항
    true, // AI 선택 사항
    true, // 미리보기
    true, // 공개
  ][step];

  const input = "w-full rounded-lg border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent";
  const label = "mb-1 mt-4 block text-xs font-semibold text-muted";
  const completion = useMemo(() => {
    const values = [draft.brandName, draft.tagline, draft.founderName, draft.founderHeadline, draft.description, draft.productName, draft.productTagline, draft.logoUrl, draft.heroUrl];
    return Math.round((values.filter((value) => value?.trim()).length / values.length) * 100);
  }, [draft]);

  // ---------- 완료 화면 ----------
  if (done) {
    const brandUrl = `/brands/${done.brandSlug}`;
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="mb-3 text-[11px] font-extrabold tracking-[0.13em] text-accent">
          {edit ? "UPDATED" : "PUBLISHED"}
        </p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">
          {edit
            ? `${draft.brandName}, 수정이 저장되었습니다 ✓`
            : `${draft.brandName}, 세상에 소개되었습니다 🎉`}
        </h1>
        <p className="mb-8 text-sm text-muted">
          이제 이 페이지가 브랜드의 공개 자산입니다. 링크를 공유해보세요.
        </p>
        <div className="mb-8 rounded-xl border border-border p-4 text-sm">
          <code className="text-accent">featable.com{brandUrl}</code>
        </div>
        <div className="flex justify-center gap-3">
          <Link href={brandUrl} className="rounded-lg bg-accent px-6 py-3 text-sm font-bold text-white hover:bg-accent-hover">
            내 브랜드 페이지 보기
          </Link>
          <button
            onClick={() => navigator.clipboard.writeText(`${location.origin}${brandUrl}`)}
            className="rounded-lg border border-border px-6 py-3 text-sm font-bold hover:border-accent hover:text-accent"
          >
            링크 복사
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="submit-console-workspace" id="editor">
      <header className="submit-channel-head">
        <div className="submit-channel-logo">{draft.logoUrl ? <img src={draft.logoUrl} alt="" /> : <span>{draft.brandName.slice(0, 1) || "F"}</span>}</div>
        <div><p>브랜드 워크스페이스</p><h1>{draft.brandName || "새 브랜드"}</h1><span>{draft.brandSlug ? `featable.com/brands/${draft.brandSlug}` : "아직 공개 주소가 없습니다."}</span></div>
        <button type="button" onClick={() => setStep(6)}>미리보기</button>
      </header>

      <section className="submit-insight-panel">
        <div className="submit-insight-head"><strong>등록 현황</strong><span>필수 정보를 채우면 언제든 공개할 수 있어요.</span></div>
        <div className="submit-insight-grid">
          <button type="button" onClick={() => setStep(0)}><span>프로필 완성도</span><strong>{completion}<small>%</small></strong><i><em style={{ width: `${completion}%` }} /></i></button>
          <button type="button" onClick={() => setStep(1)}><span>Founder</span><strong>{draft.founderName ? "완료" : "미입력"}</strong><small>{draft.founderName || "사람을 소개해주세요"}</small></button>
          <button type="button" onClick={() => setStep(3)}><span>프로덕트</span><strong>{draft.productName ? "1" : "0"}<small>개</small></strong><small>{draft.productName || "첫 제품을 등록하세요"}</small></button>
          <button type="button" onClick={() => setStep(4)}><span>상세 블록</span><strong>{draft.story.length}<small>개</small></strong><small>{draft.story.length ? "상세페이지 작성 중" : "콘텐츠를 추가하세요"}</small></button>
        </div>
      </section>

      <div className="submit-editor-heading"><div><strong>브랜드 등록</strong><span>{STEPS[step]} 편집 중</span></div><div className={`submit-persist-state ${saveState}`}><i />{saveState === "saving" ? "저장 중" : saveState === "saved" ? "클라우드 저장됨" : saveState === "local" ? "브라우저에 자동 저장됨" : "변경사항 없음"}</div><button type="button" onClick={() => saveProgress()} disabled={saveState === "saving"}>임시저장</button></div>

      <div className="submit-wizard-layout">
      <aside className="submit-step-aside">
        <p>{edit ? "EDIT" : "REGISTRATION"}</p>
        <h2>{edit ? "브랜드 수정" : "브랜드 등록"}</h2>
        <nav>{STEPS.map((item, index) => <button type="button" key={item} className={index === step ? "active" : index < step ? "done" : ""} onClick={() => index <= step && setStep(index)}><span>{index < step ? "✓" : String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></button>)}</nav>
        <div><span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span><p>입력한 내용은<br />마지막 단계에서 공개됩니다.</p></div>
      </aside>

      <section className="submit-form-card">
      {/* 진행 표시 */}
      <div className="submit-mobile-progress mb-10 flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? "bg-accent" : "bg-border"}`} />
            <p className={`mt-2 hidden text-[10px] font-semibold sm:block ${i === step ? "text-accent" : "text-muted"}`}>
              {i + 1}. {s}
            </p>
          </div>
        ))}
      </div>

      <div className="submit-form-title"><span>STEP {String(step + 1).padStart(2, "0")}</span><h1>{STEPS[step]}</h1></div>

      {/* STEP 1 기본정보 */}
      {step === 0 && (
        <div>
          <p className="text-sm text-muted">브랜드의 기본 정보를 입력하세요.</p>
          <label className={label}>브랜드명 *</label>
          <input className={input} value={draft.brandName} placeholder="예: 카라멜랩"
            onChange={(e) => set({ brandName: e.target.value, brandSlug: slugify(e.target.value) })} />
          <label className={label}>URL 주소 (영문 추천)</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">featable.com/brands/</span>
            <input className={input} value={draft.brandSlug} placeholder="caramel-lab"
              onChange={(e) => set({ brandSlug: e.target.value })} />
          </div>
          <label className={label}>카테고리 *</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => set({ category: c })}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                  draft.category === c ? "border-accent bg-accent text-white" : "border-border text-muted hover:border-accent hover:text-accent"
                }`}>
                {c}
              </button>
            ))}
          </div>
          <label className={label}>한 줄 소개 *</label>
          <input className={input} value={draft.tagline} placeholder="대학생 팀이 만든 AI 노트 서비스"
            onChange={(e) => set({ tagline: e.target.value })} />
        </div>
      )}

      {/* STEP 2 Founder */}
      {step === 1 && (
        <div>
          <p className="text-sm text-muted">제품 뒤에 있는 사람을 보여주세요. Featable의 핵심입니다.</p>
          <label className={label}>이름 *</label>
          <input className={input} value={draft.founderName} placeholder="김OO"
            onChange={(e) => set({ founderName: e.target.value })} />
          <label className={label}>한 줄 소개 *</label>
          <input className={input} value={draft.founderHeadline} placeholder="기록을 사랑하는 개발자"
            onChange={(e) => set({ founderHeadline: e.target.value })} />
          <label className={label}>이야기 (선택)</label>
          <textarea className={`${input} min-h-28`} value={draft.founderBio}
            placeholder="왜 창업했는지, 어떤 여정을 지나왔는지"
            onChange={(e) => set({ founderBio: e.target.value })} />
        </div>
      )}

      {/* STEP 3 Brand */}
      {step === 2 && (
        <div>
          <label className={label}>브랜드 소개 *</label>
          <textarea className={`${input} min-h-32`} value={draft.description}
            placeholder="우리 브랜드는 어떤 문제를 어떻게 풀고 있나요?"
            onChange={(e) => set({ description: e.target.value })} />
          <label className={label}>해결하는 문제</label>
          <input className={input} value={draft.problem} onChange={(e) => set({ problem: e.target.value })} />
          <label className={label}>대상 고객</label>
          <input className={input} value={draft.audience} onChange={(e) => set({ audience: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>홈페이지</label>
              <input className={input} value={draft.website} placeholder="https://"
                onChange={(e) => set({ website: e.target.value })} />
            </div>
            <div>
              <label className={label}>인스타그램</label>
              <input className={input} value={draft.instagram} placeholder="@handle"
                onChange={(e) => set({ instagram: e.target.value })} />
            </div>
          </div>
          <label className={label}>설립 시기</label>
          <input className={input} value={draft.foundedAt} placeholder="2025-03"
            onChange={(e) => set({ foundedAt: e.target.value })} />
        </div>
      )}

      {/* STEP 4 Product */}
      {step === 3 && (
        <div>
          <label className={label}>제품/서비스명 *</label>
          <input className={input} value={draft.productName}
            onChange={(e) => set({ productName: e.target.value, productSlug: slugify(e.target.value) })} />
          <label className={label}>한 줄 소개 *</label>
          <input className={input} value={draft.productTagline}
            onChange={(e) => set({ productTagline: e.target.value })} />
          <label className={label}>어떤 문제를 풀었나요?</label>
          <textarea className={`${input} min-h-24`} value={draft.productProblem}
            onChange={(e) => set({ productProblem: e.target.value })} />
          <label className={label}>어떻게 해결하나요?</label>
          <textarea className={`${input} min-h-24`} value={draft.productSolution}
            onChange={(e) => set({ productSolution: e.target.value })} />
          <label className={label}>주요 특징 (한 줄에 하나씩)</label>
          <textarea className={`${input} min-h-24`} value={draft.productFeatures}
            placeholder={"원터치 요약\n실시간 동기화"}
            onChange={(e) => set({ productFeatures: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>가격 (선택)</label>
              <input className={input} value={draft.price} placeholder="월 9,900원"
                onChange={(e) => set({ price: e.target.value })} />
            </div>
            <div>
              <label className={label}>공식 사이트</label>
              <input className={input} value={draft.officialUrl} placeholder="https://"
                onChange={(e) => set({ officialUrl: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {/* STEP 5 상세페이지 */}
      {step === 4 && (
        <div className="story-builder">
          <div className="story-builder-intro">
            <p className="text-sm text-muted">쿠팡·와디즈 상세페이지처럼 이미지와 설명을 원하는 순서대로 쌓아주세요. 등록한 순서 그대로 긴 상세 스토리가 만들어집니다.</p>
            <div><span>텍스트 블록</span><b>+</b><span>이미지 블록</span><b>+</b><span>순서 변경</span><b>=</b><strong>상세페이지</strong></div>
          </div>

          <section className="story-asset-section">
            <p className="story-editor-label">대표 에셋</p>
          {(["logo", "cover", "hero"] as const).map((kind) => {
            const url = kind === "logo" ? draft.logoUrl : kind === "cover" ? draft.coverUrl : draft.heroUrl;
            const labelText = kind === "logo" ? "브랜드 로고" : kind === "cover" ? "기업 커버 이미지 (브랜드 페이지 상단 배경)" : "제품 대표 이미지";
            const previewClass = kind === "logo" ? "h-16 w-16" : kind === "cover" ? "h-20 w-52" : "h-24 w-40";
            return (
              <div key={kind} className="story-main-asset">
                <label className={label}>{labelText}</label>
                <div className="flex items-center gap-4">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className={`${previewClass} rounded-xl border border-border object-cover`} />
                  ) : (
                    <div className={`grid place-items-center rounded-xl border border-dashed border-border text-xs text-muted ${previewClass}`}>
                      없음
                    </div>
                  )}
                  <label className="cursor-pointer rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:border-accent hover:text-accent">
                    {uploading === kind ? "업로드 중…" : "파일 선택"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading !== null}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(kind, f); }} />
                  </label>
                </div>
              </div>
            );
          })}
          </section>

          <section className="story-block-section">
            <div className="story-block-heading"><div><p className="story-editor-label">상세 스토리</p><h2>{draft.story.length}개의 블록</h2></div><span>위에서 아래로 노출됩니다</span></div>

            {draft.story.length === 0 && <div className="story-empty"><strong>아직 상세 내용이 없어요</strong><p>텍스트나 이미지를 추가해 첫 장면을 만들어보세요.<br />완성된 통이미지 한 장만 올려도 됩니다.</p></div>}

            <div className="story-editor-list">
              {draft.story.map((block, index) => (
                <article className="story-editor-block" key={`${block.type}-${index}`}>
                  <div className="story-block-bar">
                    <div><span className="story-block-number">{String(index + 1).padStart(2, "0")}</span><strong>{block.type === "text" ? "텍스트" : "이미지"}</strong></div>
                    <div><button type="button" onClick={() => moveStoryBlock(index, -1)} disabled={index === 0} aria-label="위로 이동">↑</button><button type="button" onClick={() => moveStoryBlock(index, 1)} disabled={index === draft.story.length - 1} aria-label="아래로 이동">↓</button><button type="button" className="story-remove" onClick={() => removeStoryBlock(index)}>삭제</button></div>
                  </div>

                  {block.type === "text" ? <div className="story-text-fields"><label>큰 제목<input className={input} value={block.heading ?? ""} placeholder="예: 좋은 아이디어는 왜 사라질까요?" onChange={(event) => updateStory(index, { ...block, heading: event.target.value })} /></label><label>본문<textarea className={`${input} min-h-32`} value={block.body} placeholder="이 장면에서 전달할 이야기를 입력하세요." onChange={(event) => updateStory(index, { ...block, body: event.target.value })} /></label></div> : <div className="story-image-fields"><div className="story-image-preview">{block.src ? <img src={block.src} alt="상세 이미지 미리보기" /> : <div><span>IMAGE</span><p>세로 이미지 권장<br />4:5 또는 3:4</p></div>}</div><div><label className="story-upload-button">{storyUploading === index ? "업로드 중…" : block.src ? "이미지 교체" : "이미지 업로드"}<input type="file" accept="image/*" disabled={storyUploading !== null} onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadStoryImage(index, file); }} /></label><label className={label}>이미지 설명 (접근성)<input className={input} value={block.alt} placeholder="이미지에 보이는 내용을 설명해주세요" onChange={(event) => updateStory(index, { ...block, alt: event.target.value })} /></label><label className={label}>캡션 (선택)<input className={input} value={block.caption ?? ""} placeholder="이미지 아래에 표시할 짧은 설명" onChange={(event) => updateStory(index, { ...block, caption: event.target.value })} /></label></div></div>}
                </article>
              ))}
            </div>

            <div className="story-add-buttons"><button type="button" onClick={() => addStoryBlock("text")}><span>T</span><div><strong>텍스트 추가</strong><small>제목과 설명을 입력합니다</small></div></button><button type="button" onClick={() => addStoryBlock("image")}><span>▧</span><div><strong>이미지 추가</strong><small>긴 상세컷을 업로드합니다</small></div></button></div>
          </section>
        </div>
      )}

      {/* STEP 6 AI */}
      {step === 5 && (
        <div>
          <p className="text-sm text-muted">
            몇 가지 질문에 답하면 AI가 소개 문구 초안을 만들어드립니다. 결과는 언제든 수정할 수 있어요.
          </p>
          {([
            ["what", "무엇을 만들고 있나요?"],
            ["why", "왜 시작했나요?"],
            ["who", "누구를 위한 제품인가요?"],
            ["diff", "기존 방식과 무엇이 다른가요?"],
            ["say", "지금 가장 알리고 싶은 것은?"],
          ] as const).map(([key, q]) => (
            <div key={key}>
              <label className={label}>{q}</label>
              <textarea className={`${input} min-h-16`} value={aiAnswers[key]}
                onChange={(e) => setAiAnswers((a) => ({ ...a, [key]: e.target.value }))} />
            </div>
          ))}
          <button type="button" onClick={generateAi} disabled={aiLoading}
            className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-50">
            {aiLoading ? "생성 중…" : "✨ AI로 소개 문구 생성"}
          </button>
          {aiNotice && <p className="mt-3 rounded-lg bg-accent-soft px-4 py-3 text-xs text-accent">{aiNotice}</p>}
          {aiResult && (
            <div className="mt-5 rounded-xl border border-border p-5 text-sm">
              <p className="mb-2 text-[10px] font-extrabold tracking-widest text-accent">AI DRAFT</p>
              {aiResult.tagline && <p className="mb-2"><b>한 줄 소개:</b> {aiResult.tagline}</p>}
              {aiResult.productTagline && <p className="mb-2"><b>제품 소개:</b> {aiResult.productTagline}</p>}
              {aiResult.founderHeadline && <p className="mb-2"><b>Founder:</b> {aiResult.founderHeadline}</p>}
              {aiResult.description && <p className="whitespace-pre-line text-muted">{aiResult.description}</p>}
              <button type="button" onClick={applyAi}
                className="mt-4 rounded-lg border border-accent px-4 py-2 text-xs font-bold text-accent hover:bg-accent-soft">
                이 문구 사용하기
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 7 미리보기 */}
      {step === 6 && (
        <div className="rounded-2xl border border-border p-6">
          <div className="flex items-center gap-4">
            {draft.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.logoUrl} alt="" className="h-14 w-14 rounded-xl border border-border object-cover" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-accent-soft text-lg font-black text-accent">
                {draft.brandName.slice(0, 1) || "F"}
              </div>
            )}
            <div>
              <span className="rounded bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">{draft.category}</span>
              <h2 className="mt-1 text-xl font-bold">{draft.brandName || "브랜드명"}</h2>
              <p className="text-sm text-muted">{draft.tagline}</p>
            </div>
          </div>
          {draft.heroUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.heroUrl} alt="" className="mt-5 w-full rounded-xl border border-border object-cover" />
          )}
          <div className="mt-5 border-t border-border pt-5 text-sm">
            <p className="font-bold">{draft.productName} <span className="font-normal text-muted">— {draft.productTagline}</span></p>
            <p className="mt-3 whitespace-pre-line text-muted">{draft.description}</p>
            <p className="mt-4 text-xs text-muted">
              by <b className="text-foreground">{draft.founderName}</b> · {draft.founderHeadline}
            </p>
          </div>
          {draft.story.length > 0 && <div className="wizard-story-preview"><p className="story-editor-label">상세페이지 미리보기</p>{draft.story.map((block, index) => block.type === "text" ? <section key={`${block.type}-${index}`}><span>STORY {String(index + 1).padStart(2, "0")}</span>{block.heading && <h3>{block.heading}</h3>}<p>{block.body}</p></section> : <figure key={`${block.type}-${index}`}>{block.src ? <img src={block.src} alt={block.alt} /> : <div>이미지를 업로드해주세요</div>}{block.caption && <figcaption>{block.caption}</figcaption>}</figure>)}</div>}
        </div>
      )}

      {/* STEP 8 공개 */}
      {step === 7 && (
        <div>
          <p className="text-sm text-muted">
            공개하면 고유 URL이 생성되고 홈 피드에 노출됩니다. 비공개 저장을 선택하면 나중에 공개할 수 있습니다.
          </p>
          <div className="mt-6 rounded-xl border border-border p-4 text-sm">
            공개 주소: <code className="text-accent">featable.com/brands/{slugify(draft.brandSlug) || slugify(draft.brandName) || "…"}</code>
          </div>
        </div>
      )}

      {error && <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-600">{error}</p>}

      {/* 하단 네비게이션 */}
      <div className="mt-10 flex items-center justify-between">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-muted hover:border-accent hover:text-accent disabled:opacity-40">
          이전
        </button>
        {step < 7 ? (
          <button type="button" onClick={goNext} disabled={!canNext || saveState === "saving"}
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-40">
            다음
          </button>
        ) : (
          <div className="flex gap-3">
            <button type="button" onClick={() => submit(false)} disabled={submitting}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:border-accent hover:text-accent disabled:opacity-50">
              비공개 저장
            </button>
            <button type="button" onClick={() => submit(true)} disabled={submitting}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-50">
              {submitting ? "게시 중…" : "🚀 공개하기"}
            </button>
          </div>
        )}
      </div>
      </section>

      <aside className="submit-help-aside">
        <div><span>STEP {step + 1}</span><strong>{STEPS[step]}</strong><p>{step === 4 ? "상세페이지는 이미지와 텍스트 블록을 원하는 만큼 추가할 수 있어요." : step === 6 ? "실제 공개 화면처럼 스토리 순서를 확인해보세요." : "필수 항목부터 작성하고 언제든 비공개로 저장할 수 있어요."}</p></div>
        <div className="submit-save-state"><i />비공개 저장 지원</div>
      </aside>
      </div>
    </div>
  );
}
