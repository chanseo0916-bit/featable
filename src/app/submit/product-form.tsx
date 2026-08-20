"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { StoryBlock } from "@/lib/types";
import { createStandaloneProduct, updateStandaloneProduct, type ProductRegistrationInput } from "./actions";

interface BrandChoice { id: string; name: string; }
const categories = ["AI", "SaaS", "F&B", "패션", "뷰티", "콘텐츠", "커머스", "라이프스타일", "교육", "개발", "기타"];

type ProductFormInitial = Omit<ProductRegistrationInput, "features" | "publish"> & { features: string; published?: boolean };

interface ProductFormState {
  brandId: string;
  name: string;
  tagline: string;
  category: string;
  problem: string;
  solution: string;
  features: string;
  price: string;
  officialUrl: string;
  heroUrl: string;
  story: StoryBlock[];
}

export function ProductRegistrationForm({ brands, initialBrandId, initial, editProductId }: { brands: BrandChoice[]; initialBrandId?: string; initial?: ProductFormInitial; editProductId?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0);
  const defaultBrandId = initial?.brandId || initialBrandId || brands[0]?.id || "";
  const initialCacheKey = editProductId ? `featable:product-edit:${editProductId}` : `featable:product-draft:${defaultBrandId}`;
  const [form, setForm] = useState<ProductFormState>(() => {
    const defaults: ProductFormState = { brandId: defaultBrandId, name: initial?.name ?? "", tagline: initial?.tagline ?? "", category: initial?.category ?? "기타", problem: initial?.problem ?? "", solution: initial?.solution ?? "", features: initial?.features ?? "", price: initial?.price ?? "", officialUrl: initial?.officialUrl ?? "", heroUrl: initial?.heroUrl ?? "", story: initial?.story ?? [] };
    if (typeof window === "undefined") return defaults;
    try {
      const cached = window.localStorage.getItem(initialCacheKey);
      if (cached) return { ...defaults, ...JSON.parse(cached), brandId: defaults.brandId } as ProductFormState;
    } catch {}
    return defaults;
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<typeof form>) => setForm((value) => ({ ...value, ...patch }));

  useEffect(() => {
    const timer = window.setTimeout(() => window.localStorage.setItem(editProductId ? `featable:product-edit:${editProductId}` : `featable:product-draft:${form.brandId}`, JSON.stringify(form)), 500);
    return () => window.clearTimeout(timer);
  }, [form]);

  async function upload(file: File, storyIndex?: number) {
    setUploading(true); setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${crypto.randomUUID()}-product.${ext}`;
      const { error: uploadError } = await supabase.storage.from("images").upload(path, file);
      if (uploadError) throw uploadError;
      const url = supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
      if (storyIndex === undefined) set({ heroUrl: url });
      else set({ story: form.story.map((block, index) => index === storyIndex && block.type === "image" ? { ...block, src: url, alt: form.name } : block) });
    } catch { setError("이미지 업로드에 실패했습니다."); }
    finally { setUploading(false); }
  }

  function addBlock(type: "text" | "image") {
    set({ story: [...form.story, type === "text" ? { type: "text", heading: "", body: "" } : { type: "image", src: "", alt: "" }] });
  }
  function updateBlock(index: number, block: StoryBlock) { set({ story: form.story.map((item, itemIndex) => itemIndex === index ? block : item) }); }
  function removeBlock(index: number) { set({ story: form.story.filter((_, itemIndex) => itemIndex !== index) }); }
  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= form.story.length) return;
    const story = [...form.story];
    [story[index], story[target]] = [story[target], story[index]];
    set({ story });
  }

  async function submit(publish: boolean) {
    setSaving(true); setError("");
    const payload = { ...form, features: form.features.split("\n"), publish };
    const result = editProductId ? await updateStandaloneProduct(editProductId, payload) : await createStandaloneProduct(payload);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    window.localStorage.removeItem(editProductId ? `featable:product-edit:${editProductId}` : `featable:product-draft:${form.brandId}`);
    router.push(publish ? `/products/${result.productSlug}` : "/my");
  }

  return <section className="simple-registration-card product-registration-card">
    <div className="product-registration-tabs"><button className={step === 0 ? "active" : ""} onClick={() => setStep(0)}><i>1</i> 프로덕트 정보</button><span>→</span><button className={step === 1 ? "active" : ""} onClick={() => form.name && form.tagline && setStep(1)}><i>2</i> 상세페이지</button><small>자동 저장됨</small></div>
    {step === 0 ? <>
      <div className="simple-registration-heading"><span>프로덕트</span><h1>{editProductId ? "프로덕트 정보를 수정하세요." : "무엇을 만들고 있나요?"}</h1><p>필수 정보와 상세페이지를 각각 나누어 관리합니다.</p></div>
      <div className="product-basic-grid">
        <label><span>소속 브랜드 *</span><select value={form.brandId} onChange={(event) => set({ brandId: event.target.value })}>{brands.map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}</select></label>
        <label><span>카테고리</span><select value={form.category} onChange={(event) => set({ category: event.target.value })}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="full"><span>프로덕트명 *</span><input autoFocus value={form.name} onChange={(event) => set({ name: event.target.value })} placeholder="예: 카라멜 노트" /></label>
        <label className="full"><span>한 줄 소개 *</span><input value={form.tagline} onChange={(event) => set({ tagline: event.target.value })} placeholder="고객이 바로 이해할 수 있는 한 문장" /></label>
        <label><span>가격</span><input value={form.price} onChange={(event) => set({ price: event.target.value })} placeholder="예: 월 9,900원" /></label>
        <label><span>공식 링크</span><input value={form.officialUrl} onChange={(event) => set({ officialUrl: event.target.value })} placeholder="https://" /></label>
        <label className="full product-hero-upload"><span>대표 이미지</span>{form.heroUrl && <img src={form.heroUrl} alt="대표 이미지" />}<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} /></label>
        <details className="product-optional-fields full"><summary>제품 설명 더 입력하기 <small>선택</small></summary><div><label><span>해결하려는 문제</span><textarea value={form.problem} onChange={(event) => set({ problem: event.target.value })} /></label><label><span>해결 방법</span><textarea value={form.solution} onChange={(event) => set({ solution: event.target.value })} /></label><label><span>주요 특징</span><textarea value={form.features} onChange={(event) => set({ features: event.target.value })} placeholder="한 줄에 하나씩 입력" /></label></div></details>
      </div>
    </> : <>
      <div className="simple-registration-heading"><span>프로덕트 상세페이지</span><h1>이미지와 설명을 순서대로 쌓으세요.</h1><p>추가한 블록이 그대로 긴 프로덕트 상세페이지가 됩니다.</p></div>
      <div className="product-story-builder">
        {form.story.map((block, index) => <article key={index}>
          <header><span>{block.type === "text" ? "텍스트" : "이미지"}</span><div><button onClick={() => moveBlock(index, -1)} disabled={index === 0}>↑</button><button onClick={() => moveBlock(index, 1)} disabled={index === form.story.length - 1}>↓</button><button onClick={() => removeBlock(index)}>삭제</button></div></header>
          {block.type === "text" ? <><input value={block.heading} onChange={(event) => updateBlock(index, { ...block, heading: event.target.value })} placeholder="섹션 제목" /><textarea value={block.body} onChange={(event) => updateBlock(index, { ...block, body: event.target.value })} placeholder="제품을 자세히 설명해주세요." /></> : <label>{block.src ? <img src={block.src} alt="상세 이미지" /> : <span>상세 이미지 추가</span>}<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], index)} /></label>}
        </article>)}
        <div className="product-add-blocks"><button onClick={() => addBlock("image")}>＋ 이미지</button><button onClick={() => addBlock("text")}>＋ 텍스트</button></div>
      </div>
    </>}
    {error && <p className="simple-form-error">{error}</p>}
    <footer>{step === 1 && <button className="secondary" onClick={() => setStep(0)}>이전</button>}{step === 0 ? <button onClick={() => form.name.trim() && form.tagline.trim() ? setStep(1) : setError("프로덕트명과 한 줄 소개를 입력해주세요.")}>상세페이지 {editProductId ? "수정" : "만들기"} →</button> : <><button className="secondary" onClick={() => submit(false)} disabled={saving}>{editProductId ? "비공개로 저장" : "임시저장"}</button><button onClick={() => submit(true)} disabled={saving || uploading}>{saving ? "저장 중…" : editProductId ? "수정사항 저장 →" : "프로덕트 공개하기 →"}</button></>}</footer>
  </section>;
}
