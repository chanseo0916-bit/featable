"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createStandaloneBrand, updateStandaloneBrand, type BrandRegistrationInput } from "./actions";
import { SeoPublishFields } from "@/components/seo-publish-fields";
import { cleanSeoSlug } from "@/lib/content-seo";

const categories = ["AI", "SaaS", "F&B", "패션", "뷰티", "콘텐츠", "커머스", "라이프스타일", "교육", "개발", "기타"];

export function BrandRegistrationForm({ initial, editBrandId }: { initial?: BrandRegistrationInput; editBrandId?: string } = {}) {
  const router = useRouter();
  const [form, setForm] = useState({ name: initial?.name ?? "", tagline: initial?.tagline ?? "", category: initial?.category ?? "기타", description: initial?.description ?? "", website: initial?.website ?? "", logoUrl: initial?.logoUrl ?? "", slug: initial?.slug ?? "", seoTitle: initial?.seoTitle ?? "", seoDescription: initial?.seoDescription ?? "", primaryKeyword: initial?.primaryKeyword ?? "", secondaryKeywords: initial?.secondaryKeywords?.join(", ") ?? "", ogImageUrl: initial?.ogImageUrl ?? "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<typeof form>) => setForm((value) => ({ ...value, ...patch }));

  async function uploadLogo(file: File) {
    setUploading(true); setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${crypto.randomUUID()}-brand.${ext}`;
      const { error: uploadError } = await supabase.storage.from("images").upload(path, file);
      if (uploadError) throw uploadError;
      set({ logoUrl: supabase.storage.from("images").getPublicUrl(path).data.publicUrl });
    } catch { setError("로고 업로드에 실패했습니다."); }
    finally { setUploading(false); }
  }

  async function submit() {
    if (!form.name.trim() || !form.tagline.trim()) { setError("기업명과 한 줄 소개를 입력해주세요."); return; }
    setSaving(true); setError("");
    const payload = { ...form, secondaryKeywords: form.secondaryKeywords.split(",").map((item) => item.trim()).filter(Boolean) };
    const result = editBrandId ? await updateStandaloneBrand(editBrandId, payload) : await createStandaloneBrand(payload);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    router.push(editBrandId ? "/my" : `/submit/product?brand=${result.brandId}`);
  }

  return <section className="simple-registration-card">
    <div className="simple-registration-heading"><span>기업 정보</span><h1>{editBrandId ? "기업 정보를 수정하세요." : "내 브랜드를 등록해주세요."}</h1><p>{editBrandId ? "프로덕트 정보와 상세페이지에는 영향을 주지 않습니다." : "프로덕트와 상세페이지는 다음 화면에서 따로 등록합니다."}</p></div>
    <div className="simple-brand-form">
      <label className="simple-logo-upload">
        {form.logoUrl ? <img src={form.logoUrl} alt="로고 미리보기" /> : <span>로고<br />추가</span>}
        <input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && uploadLogo(event.target.files[0])} />
        <small>{uploading ? "업로드 중…" : "선택 사항"}</small>
      </label>
      <div className="simple-form-fields">
        <label><span>기업명 *</span><input autoFocus value={form.name} onChange={(event) => set({ name: event.target.value, ...(!form.slug ? { slug: cleanSeoSlug(event.target.value) } : {}) })} placeholder="예: 카라멜랩" /></label>
        <label><span>한 줄 소개 *</span><input value={form.tagline} onChange={(event) => set({ tagline: event.target.value })} placeholder="무엇을 만드는 기업인지 한 문장으로" /></label>
        <label><span>카테고리</span><select value={form.category} onChange={(event) => set({ category: event.target.value })}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>웹사이트</span><input value={form.website} onChange={(event) => set({ website: event.target.value })} placeholder="https://" /></label>
        <label className="full"><span>기업 소개 <small>선택</small></span><textarea value={form.description} onChange={(event) => set({ description: event.target.value })} placeholder="기업을 조금 더 소개해주세요. 나중에 작성해도 됩니다." /></label>
      </div>
    </div>
    <SeoPublishFields values={form} fallbackTitle={`${form.name || "기업명"} 기업 소개`} fallbackDescription={form.description || form.tagline} fallbackImage={form.logoUrl} content={`${form.description} ${form.tagline}`} path="brands" lockSlug={Boolean(editBrandId)} onChange={set} />
    {error && <p className="simple-form-error">{error}</p>}
    <footer><button type="button" onClick={submit} disabled={saving || uploading}>{saving ? "저장 중…" : editBrandId ? "기업 정보 저장" : "기업 정보 저장하고 다음 →"}</button></footer>
  </section>;
}
