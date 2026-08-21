"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { StoryBlock } from "@/lib/types";
import { ProductStoryRenderer } from "@/components/product-story-renderer";
import { createStandaloneProduct, deleteProductDraft, saveProductDraft, updateStandaloneProduct, type ProductRegistrationInput } from "./actions";
import { SeoPublishFields } from "@/components/seo-publish-fields";
import { cleanSeoSlug, storyText } from "@/lib/content-seo";

interface BrandChoice { id: string; name: string; }
const categories = ["AI", "SaaS", "F&B", "패션", "뷰티", "콘텐츠", "커머스", "라이프스타일", "교육", "개발", "기타"];

type ProductFormInitial = Omit<ProductRegistrationInput, "features" | "publish" | "secondaryKeywords"> & { features: string; secondaryKeywords?: string; published?: boolean };

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
  slug: string;
  seoTitle: string;
  seoDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  ogImageUrl: string;
}

export function ProductRegistrationForm({ brands, initialBrandId, initial, editProductId, draftKey, initialSavedAt = 0 }: { brands: BrandChoice[]; initialBrandId?: string; initial?: ProductFormInitial; editProductId?: string; draftKey?: string; initialSavedAt?: number }) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0);
  const defaultBrandId = initial?.brandId || initialBrandId || brands[0]?.id || "";
  const initialCacheKey = editProductId ? `featable:product-edit:${editProductId}` : `featable:product-draft:${defaultBrandId}`;
  const [form, setForm] = useState<ProductFormState>(() => {
    const defaults: ProductFormState = { brandId: defaultBrandId, name: initial?.name ?? "", tagline: initial?.tagline ?? "", category: initial?.category ?? "기타", problem: initial?.problem ?? "", solution: initial?.solution ?? "", features: initial?.features ?? "", price: initial?.price ?? "", officialUrl: initial?.officialUrl ?? "", heroUrl: initial?.heroUrl ?? "", story: initial?.story ?? [], slug: initial?.slug ?? "", seoTitle: initial?.seoTitle ?? "", seoDescription: initial?.seoDescription ?? "", primaryKeyword: initial?.primaryKeyword ?? "", secondaryKeywords: initial?.secondaryKeywords ?? "", ogImageUrl: initial?.ogImageUrl ?? "" };
    if (typeof window === "undefined") return defaults;
    try {
      const cached = window.localStorage.getItem(initialCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { form?: Partial<ProductFormState>; savedAt?: number } | Partial<ProductFormState>;
        if ("form" in parsed && parsed.form && (parsed.savedAt ?? 0) > initialSavedAt) return { ...defaults, ...parsed.form, brandId: defaults.brandId } as ProductFormState;
        if (!("form" in parsed) && !initialSavedAt) return { ...defaults, ...parsed, brandId: defaults.brandId } as ProductFormState;
      }
    } catch {}
    return defaults;
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const set = (patch: Partial<typeof form>) => setForm((value) => ({ ...value, ...patch }));

  useEffect(() => {
    const timer = window.setTimeout(() => window.localStorage.setItem(editProductId ? `featable:product-edit:${editProductId}` : `featable:product-draft:${form.brandId}`, JSON.stringify({ form, savedAt: Date.now() })), 400);
    return () => window.clearTimeout(timer);
  }, [editProductId, form]);

  useEffect(() => {
    if (!draftKey) return;
    const timer = window.setTimeout(async () => {
      setSyncState("saving");
      const result = await saveProductDraft(draftKey, form);
      setSyncState(result.ok ? "saved" : "error");
    }, 1300);
    return () => window.clearTimeout(timer);
  }, [draftKey, form]);

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

  function addBlock(type: "text" | "image" | "features") {
    const block: StoryBlock = type === "text"
      ? { type: "text", heading: "", body: "" }
      : type === "image"
        ? { type: "image", src: "", alt: "" }
        : { type: "features", heading: "", items: [{ title: "", body: "" }] };
    set({ story: [...form.story, block] });
  }
  function updateBlock(index: number, block: StoryBlock) { set({ story: form.story.map((item, itemIndex) => itemIndex === index ? block : item) }); }
  function removeBlock(index: number) { set({ story: form.story.filter((_, itemIndex) => itemIndex !== index) }); }
  function addFeatureItem(index: number) {
    const block = form.story[index];
    if (block.type !== "features") return;
    updateBlock(index, { ...block, items: [...block.items, { title: "", body: "" }] });
  }
  function updateFeatureItem(index: number, itemIndex: number, patch: Partial<{ title: string; body: string }>) {
    const block = form.story[index];
    if (block.type !== "features") return;
    updateBlock(index, { ...block, items: block.items.map((item, i) => i === itemIndex ? { ...item, ...patch } : item) });
  }
  function removeFeatureItem(index: number, itemIndex: number) {
    const block = form.story[index];
    if (block.type !== "features") return;
    updateBlock(index, { ...block, items: block.items.filter((_, i) => i !== itemIndex) });
  }
  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= form.story.length) return;
    const story = [...form.story];
    [story[index], story[target]] = [story[target], story[index]];
    set({ story });
  }
  function dropBlock(target: number) {
    if (dragIndex === null || dragIndex === target) return setDragIndex(null);
    const story = [...form.story];
    const [block] = story.splice(dragIndex, 1);
    story.splice(target, 0, block);
    set({ story });
    setDragIndex(null);
  }

  async function submit(publish: boolean) {
    setSaving(true); setError("");
    const payload = { ...form, features: form.features.split("\n"), secondaryKeywords: form.secondaryKeywords.split(",").map((item) => item.trim()).filter(Boolean), publish };
    const result = editProductId ? await updateStandaloneProduct(editProductId, payload) : await createStandaloneProduct(payload);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    if (draftKey) await deleteProductDraft(draftKey);
    window.localStorage.removeItem(editProductId ? `featable:product-edit:${editProductId}` : `featable:product-draft:${form.brandId}`);
    router.push(publish ? `/products/${result.productSlug}` : "/my");
  }

  return <section className="simple-registration-card product-registration-card">
    <div className="product-registration-tabs"><button className={step === 0 ? "active" : ""} onClick={() => setStep(0)}><i>1</i> 프로덕트 정보</button><span>→</span><button className={step === 1 ? "active" : ""} onClick={() => form.name && form.tagline && setStep(1)}><i>2</i> 상세페이지</button><small className={syncState}>{syncState === "saving" ? "저장 중…" : syncState === "error" ? "브라우저에 저장됨" : "서버에 자동 저장됨"}</small></div>
    {step === 0 ? <>
      <div className="simple-registration-heading"><span>프로덕트</span><h1>{editProductId ? "프로덕트 정보를 수정하세요." : "무엇을 만들고 있나요?"}</h1><p>필수 정보와 상세페이지를 각각 나누어 관리합니다.</p></div>
      <div className="product-basic-grid">
        <label><span>소속 브랜드 *</span><select value={form.brandId} onChange={(event) => set({ brandId: event.target.value })}>{brands.map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}</select></label>
        <label><span>카테고리</span><select value={form.category} onChange={(event) => set({ category: event.target.value })}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="full"><span>프로덕트명 *</span><input autoFocus value={form.name} onChange={(event) => set({ name: event.target.value, ...(!form.slug ? { slug: cleanSeoSlug(event.target.value) } : {}) })} placeholder="예: 카라멜 노트" /></label>
        <label className="full"><span>한 줄 소개 *</span><input value={form.tagline} onChange={(event) => set({ tagline: event.target.value })} placeholder="고객이 바로 이해할 수 있는 한 문장" /></label>
        <label><span>가격</span><input value={form.price} onChange={(event) => set({ price: event.target.value })} placeholder="예: 월 9,900원" /></label>
        <label><span>공식 링크</span><input value={form.officialUrl} onChange={(event) => set({ officialUrl: event.target.value })} placeholder="https://" /></label>
        <label className="full product-hero-upload"><span>대표 이미지</span>{form.heroUrl && <img src={form.heroUrl} alt="대표 이미지" />}<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} /></label>
        <details className="product-optional-fields full"><summary>제품 설명 더 입력하기 <small>선택</small></summary><div><label><span>해결하려는 문제</span><textarea value={form.problem} onChange={(event) => set({ problem: event.target.value })} /></label><label><span>해결 방법</span><textarea value={form.solution} onChange={(event) => set({ solution: event.target.value })} /></label><label><span>주요 특징</span><textarea value={form.features} onChange={(event) => set({ features: event.target.value })} placeholder="한 줄에 하나씩 입력" /></label></div></details>
      </div>
      <SeoPublishFields values={form} fallbackTitle={form.name || "프로덕트명"} fallbackDescription={`${form.tagline} ${form.solution || form.problem}`} fallbackImage={form.heroUrl} content={`${form.problem} ${form.solution} ${form.features} ${storyText(form.story)}`} path="products" lockSlug={Boolean(editProductId)} onChange={set} />
    </> : <>
      <div className="simple-registration-heading"><span>프로덕트 상세페이지</span><h1>이미지와 설명을 순서대로 쌓으세요.</h1><p>추가한 블록이 그대로 긴 프로덕트 상세페이지가 됩니다.</p></div>
      <div className="product-detail-workspace">
        <div className="product-story-builder">
          {form.story.length === 0 && <div className="product-story-empty"><strong>상세페이지가 비어 있어요.</strong><span>이미지나 텍스트 블록을 추가해 시작하세요.</span></div>}
          {form.story.map((block, index) => <article key={index} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropBlock(index)} className={dragIndex === index ? "dragging" : ""}>
            <header><span><b>⠿</b> {block.type === "text" ? "텍스트" : block.type === "image" ? "이미지" : "기능 목록"}</span><div><button onClick={() => moveBlock(index, -1)} disabled={index === 0}>↑</button><button onClick={() => moveBlock(index, 1)} disabled={index === form.story.length - 1}>↓</button><button onClick={() => removeBlock(index)}>삭제</button></div></header>
            {block.type === "text" ? <>
              <div className="story-tone-toggle"><button type="button" className={block.tone !== "highlight" ? "active" : ""} onClick={() => updateBlock(index, { ...block, tone: "default" })}>기본 배경</button><button type="button" className={block.tone === "highlight" ? "active" : ""} onClick={() => updateBlock(index, { ...block, tone: "highlight" })}>포인트 배경</button></div>
              <input value={block.heading} onChange={(event) => updateBlock(index, { ...block, heading: event.target.value })} placeholder="섹션 제목" />
              <textarea value={block.body} onChange={(event) => updateBlock(index, { ...block, body: event.target.value })} placeholder="제품을 자세히 설명해주세요." />
            </> : block.type === "image" ? <>
              <div className="story-tone-toggle"><button type="button" className={block.frame !== "phone" ? "active" : ""} onClick={() => updateBlock(index, { ...block, frame: "none" })}>일반 이미지</button><button type="button" className={block.frame === "phone" ? "active" : ""} onClick={() => updateBlock(index, { ...block, frame: "phone" })}>폰 프레임 (앱 스크린샷용)</button></div>
              <label>{block.src ? <img src={block.src} alt="상세 이미지" /> : <span>상세 이미지 추가</span>}<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], index)} /></label>
            </> : <>
              <div className="story-tone-toggle"><button type="button" className={block.tone !== "highlight" ? "active" : ""} onClick={() => updateBlock(index, { ...block, tone: "default" })}>기본 배경</button><button type="button" className={block.tone === "highlight" ? "active" : ""} onClick={() => updateBlock(index, { ...block, tone: "highlight" })}>포인트 배경</button></div>
              <input value={block.heading ?? ""} onChange={(event) => updateBlock(index, { ...block, heading: event.target.value })} placeholder="섹션 제목 (예: 부피는 줄이고, 정보는 더 담았습니다)" />
              <div className="story-feature-items">
                {block.items.map((item, itemIndex) => <div className="story-feature-item-row" key={itemIndex}>
                  <span>{String(itemIndex + 1).padStart(2, "0")}</span>
                  <div>
                    <input value={item.title} onChange={(event) => updateFeatureItem(index, itemIndex, { title: event.target.value })} placeholder="기능 제목" />
                    <textarea value={item.body} onChange={(event) => updateFeatureItem(index, itemIndex, { body: event.target.value })} placeholder="기능 설명" />
                  </div>
                  <button type="button" onClick={() => removeFeatureItem(index, itemIndex)} disabled={block.items.length <= 1}>삭제</button>
                </div>)}
              </div>
              <button type="button" className="story-add-feature-item" onClick={() => addFeatureItem(index)}>＋ 항목 추가</button>
            </>}
          </article>)}
          <div className="product-add-blocks"><button onClick={() => addBlock("image")}>＋ 이미지</button><button onClick={() => addBlock("text")}>＋ 텍스트</button><button onClick={() => addBlock("features")}>＋ 기능 목록</button></div>
        </div>
        <aside className="product-live-preview">
          <header><span>LIVE PREVIEW</span><small>모바일 상세페이지</small></header>
          <div className="product-preview-device">
            <ProductStoryRenderer compact brandName={brands.find((brand) => brand.id === form.brandId)?.name} name={form.name} tagline={form.tagline} heroUrl={form.heroUrl} story={form.story} />
          </div>
        </aside>
      </div>
    </>}
    {error && <p className="simple-form-error">{error}</p>}
    <footer>{step === 1 && <button className="secondary" onClick={() => setStep(0)}>이전</button>}{step === 0 ? <button onClick={() => form.name.trim() && form.tagline.trim() ? setStep(1) : setError("프로덕트명과 한 줄 소개를 입력해주세요.")}>상세페이지 {editProductId ? "수정" : "만들기"} →</button> : <><button className="secondary" onClick={() => submit(false)} disabled={saving}>{editProductId ? "비공개로 저장" : "임시저장"}</button><button onClick={() => submit(true)} disabled={saving || uploading}>{saving ? "저장 중…" : editProductId ? "수정사항 저장 →" : "프로덕트 공개하기 →"}</button></>}</footer>
  </section>;
}
