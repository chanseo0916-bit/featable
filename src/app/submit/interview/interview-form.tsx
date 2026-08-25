"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFounderInterview, updateFounderInterview } from "./actions";

interface BrandChoice { id: string; name: string; }
export interface InterviewFormInitialValue {
  slug: string;
  brandId: string;
  hookIntro: string;
  title: string;
  hookLabel: string;
  coverUrl: string;
  answers: Record<string, string>;
}

export const INTERVIEW_QUESTIONS = [
  { key: "item", label: "아이템 한 줄 소개", placeholder: "무엇을 만들고 있는지 한두 문장으로 소개해주세요.", required: true },
  { key: "background", label: "창업 배경", placeholder: "어떤 문제를 발견했고, 왜 직접 하게 됐나요?", required: true },
  { key: "hardest", label: "가장 힘들었던 순간", placeholder: "솔직할수록 좋아요. 어떻게 버텼는지도 함께.", required: false },
  { key: "turning", label: "결정적 터닝 포인트", placeholder: "방향이 바뀐 순간이나 배움이 있었다면.", required: false },
  { key: "vision", label: "제품에 대한 비전", placeholder: "이 제품이 어디까지 갔으면 하나요?", required: false },
  { key: "life", label: "인생 목표", placeholder: "숫자여도 좋고, 문장이어도 좋아요.", required: false },
];

async function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("SAVE_TIMEOUT")), milliseconds);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function InterviewForm({ brands, founderName, initial }: { brands: BrandChoice[]; founderName: string; initial?: InterviewFormInitialValue }) {
  const router = useRouter();
  const [brandId, setBrandId] = useState(initial?.brandId ?? brands[0]?.id ?? "");
  const [hookIntro, setHookIntro] = useState(initial?.hookIntro ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [hookLabel, setHookLabel] = useState(initial?.hookLabel ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>(initial?.answers ?? {});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const brandName = brands.find((brand) => brand.id === brandId)?.name ?? "";
  const previewLabel = hookLabel.trim() || [brandName, founderName].filter(Boolean).join(" ") || "Featable 멤버";

  async function uploadCover(file: File) {
    setUploading(true); setError("");
    try {
      // 인앱 브라우저에서도 되도록 서버를 통해 올린다
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "interview");
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "업로드에 실패했습니다.");
      setCoverUrl(payload.url);
    } catch (uploadFailure) {
      const reason = uploadFailure instanceof Error && uploadFailure.message ? uploadFailure.message : "알 수 없는 오류";
      setError(`사진 업로드에 실패했습니다. (${reason})`);
    }
    finally { setUploading(false); }
  }

  async function submit() {
    setSaving(true); setError("");
    const payload = {
      brandId,
      hookIntro,
      title,
      hookLabel: hookLabel.trim() || previewLabel,
      coverUrl,
      answers: INTERVIEW_QUESTIONS.map((question) => ({ question: question.label, answer: answers[question.key] ?? "" })),
    };
    try {
      const result = await withTimeout(
        initial
          ? updateFounderInterview(initial.slug, payload)
          : createFounderInterview(payload),
        25_000,
      );
      if (!result.ok || !result.slug) {
        setError(result.error ?? "저장에 실패했습니다.");
        return;
      }
      router.push(`/stories/${result.slug}`);
    } catch (saveError) {
      setError(saveError instanceof Error && saveError.message === "SAVE_TIMEOUT"
        ? "저장 응답이 늦어지고 있어요. 새로고침 후 반영 여부를 확인하고 다시 시도해주세요."
        : "저장 중 연결이 끊겼습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="interview-form-layout">
      <div className="interview-form-main">
        <div className="product-basic-grid">
          <label><span>연결할 브랜드 <small>선택</small></span><select value={brandId} onChange={(event) => setBrandId(event.target.value)}><option value="">브랜드 없이 게시</option>{brands.map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}</select></label>
          <label><span>첫 줄 훅</span><input value={hookIntro} onChange={(event) => setHookIntro(event.target.value)} placeholder="예: 03년생, 24살" maxLength={30} /></label>
          <label className="full"><span>나를 소개하는 한 줄 *</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 연구용 AI 스타트업 대표 · 1년만에 4개 지점" maxLength={40} /></label>
          <label className="full"><span>꺾쇠 라벨 <small>비우면 &lt;{previewLabel || "브랜드 이름"}&gt; 자동</small></span><input value={hookLabel} onChange={(event) => setHookLabel(event.target.value)} placeholder={previewLabel} maxLength={40} /></label>
          <label className="full product-hero-upload"><span>커버 사진 * <small>얼굴이 잘 보이는 세로 사진이 좋아요</small></span>{coverUrl && <img src={coverUrl} alt="커버 사진" />}<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && uploadCover(event.target.files[0])} /></label>
        </div>

        <div className="interview-questions">
          {INTERVIEW_QUESTIONS.map((question) => (
            <label key={question.key}>
              <span>{question.label}{question.required ? " *" : ""}</span>
              <textarea
                value={answers[question.key] ?? ""}
                onChange={(event) => setAnswers((value) => ({ ...value, [question.key]: event.target.value }))}
                placeholder={question.placeholder}
                rows={4}
              />
            </label>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}
        <button className="button" type="button" disabled={saving || uploading} onClick={submit}>
          {saving ? "저장 중..." : uploading ? "사진 업로드 중..." : initial ? "수정 내용 저장하기" : "인터뷰 게시하기"}
        </button>
        <p className="interview-form-note">{initial ? "저장하면 공개 인터뷰에 바로 반영됩니다." : "게시하면 홈 ‘이번 주 인터뷰’와 스토리에 바로 공개됩니다. 내 스튜디오에서 언제든 수정할 수 있어요."}</p>
      </div>

      <aside className="interview-preview">
        <p className="interview-preview-title">카드 미리보기</p>
        <div className="founder-hook-card interview-preview-card">
          {coverUrl
            ? <img src={coverUrl} alt="" />
            : <span className="interview-preview-empty">커버 사진을 올리면<br />여기에 카드가 보여요</span>}
          <span className="founder-hook-shade" aria-hidden="true" />
          <span className="founder-hook-copy">
            {hookIntro && <strong>{hookIntro}</strong>}
            <strong>{title || "나를 소개하는 한 줄"}</strong>
            <small>&lt;{previewLabel || "브랜드 이름"}&gt;</small>
          </span>
        </div>
      </aside>
    </div>
  );
}
