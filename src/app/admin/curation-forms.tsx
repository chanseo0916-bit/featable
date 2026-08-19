"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createEvent,
  createSupportProgram,
  deleteCuration,
  type EventInput,
  type SupportInput,
} from "./actions";

const inputCls =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-accent";
const labelCls = "mb-1 mt-3 block text-xs font-semibold text-muted";

const EVENT_CATEGORIES = ["데모데이", "밋업", "컨퍼런스", "네트워킹", "해커톤", "세미나", "교육", "IR", "기타"];

export function EventForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EventInput>({
    name: "", host: "", startsAt: "", location: "", isOnline: false,
    fee: "", category: "기타", audience: "", applyUrl: "", coverUrl: "",
  });
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const set = (patch: Partial<EventInput>) => setForm((f) => ({ ...f, ...patch }));

  function submit() {
    startTransition(async () => {
      setNotice(null);
      const result = await createEvent(form);
      if (result.error) setNotice(result.error);
      else {
        setNotice("행사가 등록되었습니다.");
        setForm({ name: "", host: "", startsAt: "", location: "", isOnline: false, fee: "", category: "기타", audience: "", applyUrl: "", coverUrl: "" });
        router.refresh();
      }
    });
  }

  return (
    <div className="mb-4 rounded-xl border border-border p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-sm font-bold text-accent">
        {open ? "– 접기" : "+ 행사 등록"}
      </button>
      {open && (
        <div className="mt-2">
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <div><label className={labelCls}>행사명 *</label><input className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} /></div>
            <div><label className={labelCls}>주최</label><input className={inputCls} value={form.host} onChange={(e) => set({ host: e.target.value })} /></div>
            <div><label className={labelCls}>일시 *</label><input type="datetime-local" className={inputCls} value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} /></div>
            <div><label className={labelCls}>장소</label><input className={inputCls} value={form.location} placeholder="서울 마포구 / 온라인" onChange={(e) => set({ location: e.target.value })} /></div>
            <div><label className={labelCls}>참가비</label><input className={inputCls} value={form.fee} placeholder="무료" onChange={(e) => set({ fee: e.target.value })} /></div>
            <div>
              <label className={labelCls}>카테고리</label>
              <select className={inputCls} value={form.category} onChange={(e) => set({ category: e.target.value })}>
                {EVENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>신청 링크 *</label><input className={inputCls} value={form.applyUrl} placeholder="https://" onChange={(e) => set({ applyUrl: e.target.value })} /></div>
            <div><label className={labelCls}>대표 이미지 URL (선택)</label><input className={inputCls} value={form.coverUrl} placeholder="https://" onChange={(e) => set({ coverUrl: e.target.value })} /></div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted">
            <input type="checkbox" checked={form.isOnline} onChange={(e) => set({ isOnline: e.target.checked })} /> 온라인 행사
          </label>
          {notice && <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">{notice}</p>}
          <button type="button" onClick={submit} disabled={pending}
            className="mt-3 rounded-lg bg-accent px-5 py-2 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-50">
            {pending ? "등록 중…" : "등록"}
          </button>
        </div>
      )}
    </div>
  );
}

export function SupportForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SupportInput>({
    name: "", agency: "", target: "", benefits: "", amount: "",
    openAt: "", closeAt: "", region: "전국", field: "", applyUrl: "",
  });
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const set = (patch: Partial<SupportInput>) => setForm((f) => ({ ...f, ...patch }));

  function submit() {
    startTransition(async () => {
      setNotice(null);
      const result = await createSupportProgram(form);
      if (result.error) setNotice(result.error);
      else {
        setNotice("지원사업이 등록되었습니다.");
        setForm({ name: "", agency: "", target: "", benefits: "", amount: "", openAt: "", closeAt: "", region: "전국", field: "", applyUrl: "" });
        router.refresh();
      }
    });
  }

  return (
    <div className="mb-4 rounded-xl border border-border p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-sm font-bold text-accent">
        {open ? "– 접기" : "+ 지원사업 등록"}
      </button>
      {open && (
        <div className="mt-2">
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <div><label className={labelCls}>사업명 *</label><input className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} /></div>
            <div><label className={labelCls}>주관기관</label><input className={inputCls} value={form.agency} onChange={(e) => set({ agency: e.target.value })} /></div>
            <div><label className={labelCls}>모집 대상</label><input className={inputCls} value={form.target} placeholder="창업 3년 이내" onChange={(e) => set({ target: e.target.value })} /></div>
            <div><label className={labelCls}>지원 내용</label><input className={inputCls} value={form.benefits} placeholder="사업화 자금 및 보육" onChange={(e) => set({ benefits: e.target.value })} /></div>
            <div><label className={labelCls}>지원 규모</label><input className={inputCls} value={form.amount} placeholder="최대 1억원" onChange={(e) => set({ amount: e.target.value })} /></div>
            <div><label className={labelCls}>지역</label><input className={inputCls} value={form.region} onChange={(e) => set({ region: e.target.value })} /></div>
            <div><label className={labelCls}>모집 시작일</label><input type="date" className={inputCls} value={form.openAt} onChange={(e) => set({ openAt: e.target.value })} /></div>
            <div><label className={labelCls}>마감일 *</label><input type="date" className={inputCls} value={form.closeAt} onChange={(e) => set({ closeAt: e.target.value })} /></div>
            <div><label className={labelCls}>분야</label><input className={inputCls} value={form.field} placeholder="기술 / 예비창업" onChange={(e) => set({ field: e.target.value })} /></div>
            <div><label className={labelCls}>공고 링크 *</label><input className={inputCls} value={form.applyUrl} placeholder="https://" onChange={(e) => set({ applyUrl: e.target.value })} /></div>
          </div>
          {notice && <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">{notice}</p>}
          <button type="button" onClick={submit} disabled={pending}
            className="mt-3 rounded-lg bg-accent px-5 py-2 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-50">
            {pending ? "등록 중…" : "등록"}
          </button>
        </div>
      )}
    </div>
  );
}

export function DeleteCurationButton({
  table,
  id,
  name,
}: {
  table: "events" | "support_programs";
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`'${name}'을(를) 삭제할까요?`)) return;
    startTransition(async () => {
      const result = await deleteCuration(table, id);
      if (!result.error) router.refresh();
    });
  }

  return (
    <button onClick={handleDelete} disabled={pending}
      className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-red-400 hover:text-red-500 disabled:opacity-50">
      삭제
    </button>
  );
}
