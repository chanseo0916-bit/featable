"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createFounderInterview } from "./actions";

interface BrandChoice { id: string; name: string; }

const QUESTIONS = [
  { key: "item", label: "아이템 한 줄 소개", placeholder: "무엇을 만들고 있는지 한두 문장으로 소개해주세요.", required: true },
  { key: "background", label: "창업 배경", placeholder: "어떤 문제를 발견했고, 왜 직접 하게 됐나요?", required: true },
  { key: "hardest", label: "가장 힘들었던 순간", placeholder: "솔직할수록 좋아요. 어떻게 버텼는지도 함께.", required: false },
  { key: "turning", label: "결정적 터닝 포인트", placeholder: "방향이 바뀐 순간이나 배움이 있었다면.", required: false },
  { key: "vision", label: "제품에 대한 비전", placeholder: "이 제품이 어디까지 갔으면 하나요?", required: false },
  { key: "life", label: "인생 목표", placeholder: "숫자여도 좋고, 문장이어도 좋아요.", required: false },
];

export function InterviewForm({ brands, founderName }: { brands: BrandChoice[]; founderName: string }) {
  const router = useRouter();
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [hookIntro, setHookIntro] = useState("");
  const [title, setTitle] = useState("");
  const [hookLabel, setHookLabel] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const brandName = brands.find((brand) => brand.id === brandId)?.name ?? "";
  const previewLabel = hookLabel.trim() || [brandName, founderName].filter(Boolean).join(" ") || "Featable 멤버";

  async function uploadCover(file: File) {
    setUploading(true); setError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("로그인이 풀렸어요. 새로고침한 뒤 다시 시도해주세요.");
      if (file.size > 15 * 1024 * 1024) throw new Error("사진 용량이 너무 커요. 15MB 이하로 올려주세요.");
      // 아이폰 사진은 확장자가 없거나 HEIC 인 경우가 있어 타입을 명시해 올린다
      const rawExt = (file.name.split(".").pop() || "").toLowerCase();
      const ext = /^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : "jpg";
      const path = `${user.id}/${crypto.randomUUID()}-interview.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      setCoverUrl(supabase.storage.from("images").getPublicUrl(path).data.publicUrl);
    } catch (uploadFailure) {
      const reason = uploadFailure instanceof Error && uploadFailure.message ? uploadFailure.message : "알 수 없는 오류";
      setError(`사진 업로드에 실패했습니다. (${reason})`);
    }
    finally { setUploading(false); }
  }

  async function submit() {
    setSaving(true); setError("");
    const result = await createFounderInterview({
      brandId,
      hookIntro,
      title,
      hookLabel: hookLabel.trim() || previewLabel,
      coverUrl,
      answers: QUESTIONS.map((question) => ({ question: question.label, answer: answers[question.key] ?? "" })),
    });
    setSaving(false);
    if (!result.ok || !result.slug) { setError(result.error ?? "저장에 실패했습니다."); return; }
    router.push(`/stories/${result.slug}`);
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
          {QUESTIONS.map((question) => (
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
          {saving ? "게시 중..." : uploading ? "사진 업로드 중..." : "인터뷰 게시하기"}
        </button>
        <p className="interview-form-note">게시하면 홈 ‘이번 주 인터뷰’와 스토리에 바로 공개됩니다. 어드민 스토리 도구에서 언제든 수정할 수 있어요.</p>
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
