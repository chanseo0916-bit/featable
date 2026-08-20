"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAdminContent, updateAdminContent, type AdminEditableTable, type AdminEditPayload } from "./actions";

type Field = { key: string; label: string; type?: "text" | "url" | "date" | "datetime-local" | "textarea" | "checkbox"; required?: boolean; wide?: boolean };

const FIELDS: Record<AdminEditableTable, Field[]> = {
  brands: [
    { key: "name", label: "브랜드명", required: true }, { key: "category", label: "카테고리" },
    { key: "tagline", label: "한 줄 소개", required: true, wide: true },
    { key: "description", label: "브랜드 소개", type: "textarea", wide: true },
    { key: "problem", label: "해결하는 문제", type: "textarea", wide: true },
    { key: "audience", label: "주요 고객", wide: true }, { key: "website", label: "웹사이트", type: "url" },
    { key: "logoUrl", label: "로고 URL", type: "url" }, { key: "coverUrl", label: "커버 URL", type: "url", wide: true },
  ],
  products: [
    { key: "name", label: "프로덕트명", required: true }, { key: "category", label: "카테고리" },
    { key: "tagline", label: "한 줄 소개", required: true, wide: true },
    { key: "problem", label: "문제", type: "textarea", wide: true }, { key: "solution", label: "솔루션", type: "textarea", wide: true },
    { key: "features", label: "핵심 기능 (한 줄에 하나)", type: "textarea", wide: true },
    { key: "price", label: "가격" }, { key: "buyUrl", label: "구매 URL", type: "url" },
    { key: "officialUrl", label: "공식 URL", type: "url" }, { key: "heroUrl", label: "대표 이미지 URL", type: "url", wide: true },
  ],
  events: [
    { key: "name", label: "행사명", required: true, wide: true }, { key: "host", label: "주최" },
    { key: "startsAt", label: "행사 일시", type: "datetime-local", required: true }, { key: "location", label: "장소" },
    { key: "category", label: "카테고리" }, { key: "fee", label: "참가비" },
    { key: "audience", label: "참가 대상", wide: true }, { key: "applyUrl", label: "신청 URL", type: "url", required: true },
    { key: "coverUrl", label: "커버 URL", type: "url" }, { key: "isOnline", label: "온라인 행사", type: "checkbox" },
  ],
  support_programs: [
    { key: "name", label: "사업명", required: true, wide: true }, { key: "agency", label: "주관기관" },
    { key: "region", label: "지역" }, { key: "field", label: "분야" },
    { key: "target", label: "모집 대상", type: "textarea", wide: true }, { key: "benefits", label: "지원 내용", type: "textarea", wide: true },
    { key: "amount", label: "지원 규모" }, { key: "openAt", label: "모집 시작일", type: "date" },
    { key: "closeAt", label: "마감일", type: "date", required: true }, { key: "applyUrl", label: "공고 URL", type: "url", required: true, wide: true },
  ],
  partners: [
    { key: "name", label: "파트너명", required: true }, { key: "field", label: "분야" },
    { key: "intro", label: "한 줄 소개", wide: true }, { key: "description", label: "상세 소개", type: "textarea", wide: true },
    { key: "href", label: "연결 URL", type: "url", required: true }, { key: "logoUrl", label: "로고 URL", type: "url", required: true },
  ],
};

export function AdminEditButton({ table, id, initial, label }: { table: AdminEditableTable; id: string; initial: AdminEditPayload; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (key: string, value: string | boolean) => setValues((current) => ({ ...current, [key]: value }));

  function save() {
    startTransition(async () => {
      setNotice(null);
      const result = await updateAdminContent(table, id, values);
      if (result.error) return setNotice(result.error);
      dialog.current?.close();
      router.refresh();
    });
  }

  return <>
    <button type="button" className="admin-action-button" onClick={() => dialog.current?.showModal()}>수정</button>
    <dialog ref={dialog} className="admin-edit-dialog" onClose={() => { setValues(initial); setNotice(null); }}>
      <div className="admin-dialog-head"><div><p>EDIT CONTENT</p><h2>{label} 수정</h2></div><button type="button" onClick={() => dialog.current?.close()} aria-label="닫기">×</button></div>
      <div className="admin-edit-grid">
        {FIELDS[table].map((field) => <label key={field.key} className={field.wide ? "wide" : undefined}>
          <span>{field.label}{field.required && " *"}</span>
          {field.type === "textarea" ? <textarea value={String(values[field.key] ?? "")} onChange={(event) => set(field.key, event.target.value)} />
            : field.type === "checkbox" ? <input type="checkbox" checked={Boolean(values[field.key])} onChange={(event) => set(field.key, event.target.checked)} />
            : <input type={field.type ?? "text"} required={field.required} value={String(values[field.key] ?? "")} onChange={(event) => set(field.key, event.target.value)} />}
        </label>)}
      </div>
      {notice && <p className="admin-dialog-error">{notice}</p>}
      <div className="admin-dialog-actions"><button type="button" onClick={() => dialog.current?.close()}>취소</button><button type="button" onClick={save} disabled={pending}>{pending ? "저장 중" : "변경사항 저장"}</button></div>
    </dialog>
  </>;
}

export function AdminDeleteButton({ table, id, name }: { table: AdminEditableTable; id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    const confirmed = table === "brands"
      ? window.prompt(`브랜드를 삭제하면 소속 프로덕트와 팀 데이터도 함께 삭제됩니다.\n계속하려면 '${name}'을 입력하세요.`) === name
      : window.confirm(`'${name}'을(를) 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;
    startTransition(async () => {
      setError(null);
      const result = await deleteAdminContent(table, id);
      if (result.error) return setError(result.error);
      router.refresh();
    });
  }

  return <div className="admin-delete-control"><button type="button" className="admin-action-button danger" onClick={remove} disabled={pending}>{pending ? "삭제 중" : "삭제"}</button>{error && <span>{error}</span>}</div>;
}
