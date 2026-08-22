"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { StoryBlock } from "@/lib/types";
import { createStory, updateStory, type StoryInput } from "../actions";

const KINDS = [
  { value: "interview", label: "창업가 인터뷰" },
  { value: "brand-story", label: "브랜드 스토리" },
  { value: "product-feature", label: "프로덕트 피처" },
  { value: "launch", label: "런칭 스토리" },
  { value: "update", label: "업데이트" },
  { value: "case-study", label: "케이스 스터디" },
  { value: "qna", label: "Q&A" },
] as const;

type TextBlock = Extract<StoryBlock, { type: "text" }>;
type ImageBlock = Extract<StoryBlock, { type: "image" }>;
type EditableBlock = TextBlock | ImageBlock;

export interface StoryFormInitial {
  id: string;
  title: string;
  kind: string;
  excerpt: string;
  coverUrl: string;
  brandId: string;
  founderId?: string;
  hookIntro?: string;
  hookLabel?: string;
  body: StoryBlock[];
  published: boolean;
}

const inputCls =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-accent";
const labelCls = "mb-1 mt-3 block text-xs font-semibold text-muted";

export function StoryForm({
  brands,
  founders,
  initial,
  defaultKind = "brand-story",
}: {
  brands: { id: string; name: string }[];
  founders: { id: string; name: string; role_title: string | null }[];
  initial?: StoryFormInitial;
  defaultKind?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(initial));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [kind, setKind] = useState(initial?.kind ?? defaultKind);
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [brandId, setBrandId] = useState(initial?.brandId ?? "");
  const [founderId, setFounderId] = useState(initial?.founderId ?? "");
  const [hookIntro, setHookIntro] = useState(initial?.hookIntro ?? "");
  const [hookLabel, setHookLabel] = useState(initial?.hookLabel ?? "");
  const [body, setBody] = useState<EditableBlock[]>(
    (initial?.body ?? []).filter(
      (block): block is EditableBlock => block.type === "text" || block.type === "image",
    ),
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  async function uploadImage(file: File, target: "cover" | number) {
    setUploading(String(target));
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${crypto.randomUUID()}-story.${ext}`;
      const { error } = await supabase.storage.from("images").upload(path, file);
      if (error) throw error;
      const url = supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
      if (target === "cover") setCoverUrl(url);
      else setBody((blocks) => blocks.map((block, i) => i === target && block.type === "image" ? { ...block, src: url } : block));
    } catch {
      setNotice("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(null);
    }
  }

  function addBlock(type: "text" | "image") {
    setBody((blocks) => [
      ...blocks,
      type === "text" ? { type: "text", heading: "", body: "" } : { type: "image", src: "", alt: "", caption: "" },
    ]);
  }
  function updateBlock(index: number, block: EditableBlock) {
    setBody((blocks) => blocks.map((item, i) => (i === index ? block : item)));
  }
  function moveBlock(index: number, dir: -1 | 1) {
    setBody((blocks) => {
      const target = index + dir;
      if (target < 0 || target >= blocks.length) return blocks;
      const next = [...blocks];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function removeBlock(index: number) {
    setBody((blocks) => blocks.filter((_, i) => i !== index));
  }

  function submit(publish: boolean) {
    startTransition(async () => {
      setNotice(null);
      const payload: StoryInput = {
        title, kind, excerpt, coverUrl, brandId: brandId || undefined, founderId: founderId || undefined,
        hookIntro: kind === "interview" ? hookIntro : undefined, hookLabel: kind === "interview" ? hookLabel : undefined,
        body: body.filter((block) => block.type === "text" ? block.body.trim() : block.src),
        publish,
      };
      const result = initial ? await updateStory(initial.id, payload) : await createStory(payload);
      if (result.error) { setNotice(result.error); return; }
      setNotice(publish ? "스토리가 발행되었습니다." : "초안으로 저장되었습니다.");
      if (!initial) {
        setTitle(""); setExcerpt(""); setCoverUrl(""); setBody([]); setOpen(false);
      }
      router.refresh();
      if (initial) router.push("/admin/stories");
    });
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-white p-4">
      {!initial && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-sm font-bold text-accent">
          {open ? "– 접기" : "+ 새 스토리 작성"}
        </button>
      )}
      {open && (
        <div className={initial ? "" : "mt-2"}>
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className={labelCls}>제목 *</label><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="스타트업 홍보를 처음 시작하는 방법" /></div>
            <div>
              <label className={labelCls}>종류</label>
              <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>연결 브랜드 (선택)</label>
              <select className={inputCls} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">연결 안 함</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {kind === "interview" && <>
              <div><label className={labelCls}>인터뷰이 프로필 (선택)</label><select className={inputCls} value={founderId} onChange={(e) => setFounderId(e.target.value)}><option value="">프로필 연결 안 함</option>{founders.map((founder) => <option value={founder.id} key={founder.id}>{founder.name}{founder.role_title ? ` · ${founder.role_title}` : ""}</option>)}</select></div>
              <div><label className={labelCls}>카드 첫 줄 훅</label><input className={inputCls} value={hookIntro} onChange={(e) => setHookIntro(e.target.value)} placeholder="예: 01년생, 26살" maxLength={30} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>카드 라벨</label><input className={inputCls} value={hookLabel} onChange={(e) => setHookLabel(e.target.value)} placeholder="예: FREQZ NOW 대표" maxLength={40} /></div>
            </>}
            <div className="sm:col-span-2"><label className={labelCls}>요약 (목록·검색·SEO에 노출) *</label><textarea className={`${inputCls} min-h-16`} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} /></div>
            <div className="sm:col-span-2">
              <label className={labelCls}>커버 이미지</label>
              <div className="flex items-center gap-3">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="" className="h-16 w-28 rounded-lg border border-border object-cover" />
                ) : (
                  <div className="grid h-16 w-28 place-items-center rounded-lg border border-dashed border-border text-[10px] text-muted">없음</div>
                )}
                <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-accent hover:text-accent">
                  {uploading === "cover" ? "업로드 중…" : "업로드"}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading !== null}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "cover"); }} />
                </label>
                <input className={`${inputCls} flex-1`} value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="또는 이미지 URL 붙여넣기" />
              </div>
            </div>
          </div>

          <label className={labelCls}>본문 블록</label>
          <div className="grid gap-2">
            {body.length === 0 && <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted">텍스트나 이미지 블록을 추가해 기사를 작성하세요.</p>}
            {body.map((block, index) => (
              <div key={index} className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-muted">
                  <span>{String(index + 1).padStart(2, "0")} · {block.type === "text" ? "텍스트" : "이미지"}</span>
                  <span className="flex gap-2">
                    <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} className="disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => moveBlock(index, 1)} disabled={index === body.length - 1} className="disabled:opacity-30">↓</button>
                    <button type="button" onClick={() => removeBlock(index)} className="text-red-400 hover:text-red-600">삭제</button>
                  </span>
                </div>
                {block.type === "text" ? (
                  <>
                    <input className={inputCls} value={block.heading ?? ""} placeholder="소제목 (선택)"
                      onChange={(e) => updateBlock(index, { ...block, heading: e.target.value })} />
                    <textarea className={`${inputCls} mt-2 min-h-24`} value={block.body} placeholder="본문 문단"
                      onChange={(e) => updateBlock(index, { ...block, body: e.target.value })} />
                  </>
                ) : (
                  <div className="flex items-start gap-3">
                    {block.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={block.src} alt="" className="h-20 w-32 flex-none rounded-lg border border-border object-cover" />
                    ) : (
                      <div className="grid h-20 w-32 flex-none place-items-center rounded-lg border border-dashed border-border text-[10px] text-muted">이미지</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <label className="inline-block cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold hover:border-accent hover:text-accent">
                        {uploading === String(index) ? "업로드 중…" : "업로드"}
                        <input type="file" accept="image/*" className="hidden" disabled={uploading !== null}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, index); }} />
                      </label>
                      <input className={`${inputCls} mt-2`} value={block.caption ?? ""} placeholder="캡션 (선택)"
                        onChange={(e) => updateBlock(index, { ...block, caption: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => addBlock("text")} className="rounded-lg border border-border px-4 py-2 text-xs font-bold hover:border-accent hover:text-accent">＋ 텍스트</button>
            <button type="button" onClick={() => addBlock("image")} className="rounded-lg border border-border px-4 py-2 text-xs font-bold hover:border-accent hover:text-accent">＋ 이미지</button>
          </div>

          {notice && <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">{notice}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => submit(false)} disabled={pending}
              className="rounded-lg border border-border px-5 py-2 text-sm font-bold hover:border-accent hover:text-accent disabled:opacity-50">
              초안 저장
            </button>
            <button type="button" onClick={() => submit(true)} disabled={pending}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-50">
              {pending ? "저장 중…" : initial?.published ? "수정사항 발행" : "발행하기 →"}
            </button>
            {initial && <button type="button" onClick={() => router.push("/admin/stories")} className="ml-auto text-xs font-semibold text-muted hover:text-accent">← 목록으로</button>}
          </div>
        </div>
      )}
    </div>
  );
}
