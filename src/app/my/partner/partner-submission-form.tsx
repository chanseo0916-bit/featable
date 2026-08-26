"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { deletePartnerSubmission, savePartnerSubmission, type PartnerSubmissionPayload, type PartnerSubmissionType } from "./actions";

export interface PartnerSubmissionRow {
  id: string;
  submission_type: PartnerSubmissionType;
  status: "draft" | "submitted" | "in_review" | "approved" | "rejected";
  title: string;
  payload: PartnerSubmissionPayload;
  review_note: string | null;
  updated_at: string;
}

const TYPES: { value: PartnerSubmissionType; label: string; description: string }[] = [
  { value: "event", label: "행사", description: "밋업·교육·데모데이" },
  { value: "support", label: "지원사업", description: "공고·모집·혜택" },
  { value: "community", label: "커뮤니티", description: "모임·네트워크·파트너십" },
];

const EMPTY: Record<PartnerSubmissionType, PartnerSubmissionPayload> = {
  event: { name: "", host: "", startsAt: "", endsAt: "", deadline: "", location: "", isOnline: false, fee: "", category: "네트워킹", audience: "", description: "", program: "", galleryUrls: [], applyUrl: "", coverUrl: "", publishMode: "standard", registrationMode: "internal", approvalMode: "instant", capacity: "", waitlistEnabled: true },
  support: { name: "", agency: "", target: "", benefits: "", amount: "", openAt: "", closeAt: "", region: "전국", field: "", applyUrl: "" },
  community: { name: "", intro: "", field: "", website: "", logoUrl: "", instagram: "" },
};

const STATUS_LABEL: Record<PartnerSubmissionRow["status"], string> = {
  draft: "작성 중",
  submitted: "검수 대기",
  in_review: "검수 중",
  approved: "승인 완료",
  rejected: "보완 필요",
};

function Field({ label, required, children, wide = false }: { label: string; required?: boolean; children: React.ReactNode; wide?: boolean }) {
  return <label className={wide ? "wide" : undefined}><span>{label}{required && <b> *</b>}</span>{children}</label>;
}

export function PartnerSubmissionForm({ submissions, initialId, initialType = "event", eventOnly = false }: { submissions: PartnerSubmissionRow[]; initialId?: string; initialType?: PartnerSubmissionType; eventOnly?: boolean }) {
  const selected = submissions.find((item) => item.id === initialId);
  const [type, setType] = useState<PartnerSubmissionType>(selected?.submission_type ?? initialType);
  const [id, setId] = useState<string | undefined>(selected?.id);
  const [payload, setPayload] = useState<PartnerSubmissionPayload>(selected?.payload ?? { ...EMPTY[type] });
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState<"cover" | "gallery" | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const editable = !selected || selected.status === "draft" || selected.status === "rejected";

  function chooseType(next: PartnerSubmissionType) {
    setType(next);
    setId(undefined);
    setPayload({ ...EMPTY[next] });
    setMessage("");
  }

  function set(key: string, value: string | boolean | string[]) {
    setPayload((current) => ({ ...current, [key]: value }));
  }

  async function uploadImages(event: ChangeEvent<HTMLInputElement>, kind: "cover" | "gallery") {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setUploading(kind);
    setMessage("");
    try {
      const urls: string[] = [];
      const failed: string[] = [];
      // 한 장이 실패해도 나머지는 올린다. 업로드는 인앱 브라우저 대응으로 서버를 거친다.
      for (const file of files.slice(0, kind === "cover" ? 1 : 8)) {
        const body = new FormData();
        body.append("file", file);
        body.append("kind", `event-${kind}`);
        const response = await fetch("/api/upload", { method: "POST", body });
        const payload = await response.json() as { url?: string; error?: string };
        if (!response.ok || !payload.url) {
          failed.push(`${file.name || "사진"} · ${payload.error || "업로드 실패"}`);
          continue;
        }
        urls.push(payload.url);
      }
      if (urls.length) {
        if (kind === "cover") set("coverUrl", urls[0]);
        else set("galleryUrls", [...galleryUrls, ...urls].slice(0, 8));
      }
      if (failed.length) {
        setMessage(`${failed.length}장을 올리지 못했어요. ${failed.join(" / ")}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지를 올리지 못했습니다.");
    } finally {
      setUploading(null);
    }
  }

  const galleryUrls = Array.isArray(payload.galleryUrls) ? payload.galleryUrls : [];

  function save(submit: boolean) {
    setMessage("");
    startTransition(async () => {
      const result = await savePartnerSubmission({ id, type, payload, submit });
      if (!result.ok) return setMessage(result.error);
      setId(result.id);
      setMessage(submit
        ? result.status === "approved"
          ? "행사가 바로 공개됐습니다."
          : "Featured 검토 요청을 보냈습니다."
        : "초안을 저장했습니다.");
      router.replace(`/my/partner/register?edit=${result.id}`);
      router.refresh();
    });
  }

  function remove() {
    if (!id || !window.confirm("이 초안을 삭제할까요?")) return;
    startTransition(async () => {
      const result = await deletePartnerSubmission(id);
      if (!result.ok) return setMessage(result.error ?? "삭제하지 못했습니다.");
      router.replace("/my/partner/register");
      router.refresh();
    });
  }

  return <div className="partner-register-layout">
    <aside className="partner-register-side">
      <div><h2>등록 현황</h2><p>초안부터 승인까지 한곳에서 확인하세요.</p></div>
      <button type="button" onClick={() => chooseType("event")}>＋ 새 제안 작성</button>
      <nav>
        {submissions.map((item) => <a className={item.id === id ? "active" : ""} href={`/my/partner/register?edit=${item.id}`} key={item.id}>
          <i>{TYPES.find((entry) => entry.value === item.submission_type)?.label}</i>
          <strong>{item.title || "제목 없는 초안"}</strong>
          <span data-status={item.status}>{STATUS_LABEL[item.status]}</span>
        </a>)}
        {!submissions.length && <small>아직 등록한 제안이 없습니다.</small>}
      </nav>
    </aside>

    <div className="partner-register-workspace">
    <section className="partner-register-form-shell">
      <header><div><h1>{id ? "등록 정보 수정" : "새 기회 등록"}</h1><p>필요한 정보만 입력하면 Featable 운영진이 검수 후 공개합니다.</p></div>{selected && <em data-status={selected.status}>{STATUS_LABEL[selected.status]}</em>}</header>

      {!id && !eventOnly && <div className="partner-register-types">{TYPES.map((entry) => <button className={type === entry.value ? "active" : ""} type="button" onClick={() => chooseType(entry.value)} key={entry.value}><strong>{entry.label}</strong><span>{entry.description}</span></button>)}</div>}

      {selected?.review_note && <div className="partner-review-note"><strong>운영진 검토 메모</strong><p>{selected.review_note}</p></div>}
      {!editable ? <div className="partner-register-locked"><strong>{STATUS_LABEL[selected!.status]} 상태입니다.</strong><p>검수가 진행 중인 제안은 수정할 수 없습니다. 결과가 업데이트되면 이곳에서 확인할 수 있어요.</p></div> : <>
        {type === "event" && <div className="event-publish-mode">
          <button className={payload.publishMode !== "featured" ? "active" : ""} type="button" onClick={() => set("publishMode", "standard")}>
            <span>바로 공개</span>
            <strong>일반 행사 등록</strong>
            <p>검수 없이 등록 즉시 행사 목록과 검색에 공개됩니다.</p>
          </button>
          <button className={payload.publishMode === "featured" ? "active featured" : ""} type="button" onClick={() => set("publishMode", "featured")}>
            <span>WITH FEATABLE</span>
            <strong>Featured 행사 제안</strong>
            <p>Featable과 함께 홍보·기획할 행사를 제안하고 Featured 노출을 신청합니다.</p>
          </button>
        </div>}
        <div className="partner-register-grid">
          {type === "event" && <>
            <Field label="행사명" required wide><input value={String(payload.name ?? "")} onChange={(e) => set("name", e.target.value)} placeholder="예: 2026 초기 창업가 밋업" /></Field>
            <Field label="주최 기관" required><input value={String(payload.host ?? "")} onChange={(e) => set("host", e.target.value)} placeholder="기관·기업·커뮤니티명" /></Field>
            <Field label="카테고리"><input value={String(payload.category ?? "")} onChange={(e) => set("category", e.target.value)} placeholder="네트워킹" /></Field>
            <Field label="시작 일시" required><input type="datetime-local" value={String(payload.startsAt ?? "")} onChange={(e) => set("startsAt", e.target.value)} /></Field>
            <Field label="종료 일시"><input type="datetime-local" value={String(payload.endsAt ?? "")} onChange={(e) => set("endsAt", e.target.value)} /></Field>
            <Field label="신청 마감"><input type="datetime-local" value={String(payload.deadline ?? "")} onChange={(e) => set("deadline", e.target.value)} /></Field>
            <Field label="장소"><input value={String(payload.location ?? "")} onChange={(e) => set("location", e.target.value)} placeholder="서울 성수동 또는 온라인" /></Field>
            <Field label="참가비"><input value={String(payload.fee ?? "")} onChange={(e) => set("fee", e.target.value)} placeholder="무료 / 10,000원" /></Field>
            <label className="partner-register-check wide"><input type="checkbox" checked={Boolean(payload.isPaid)} onChange={(e) => { set("isPaid", e.target.checked); if (e.target.checked) set("approvalMode", "manual"); }} /><span>유료 행사입니다. 입금 확인 후 주최자가 승인합니다.</span></label>
            {Boolean(payload.isPaid) && <>
              <Field label="입금 계좌번호" required wide><input value={String(payload.paymentAccount ?? "")} onChange={(e) => set("paymentAccount", e.target.value)} placeholder="은행명 000-0000-0000 (예금주: Featable)" /></Field>
              <Field label="입금 안내" wide><textarea value={String(payload.paymentNotice ?? "입금 확인 후 주최자가 신청을 승인합니다.")} onChange={(e) => set("paymentNotice", e.target.value)} placeholder="입금자명과 입금 기한을 안내해주세요." /></Field>
            </>}
            <Field label="참가 대상" wide><input value={String(payload.audience ?? "")} onChange={(e) => set("audience", e.target.value)} placeholder="예비 창업가, 초기 스타트업 팀" /></Field>
            <Field label="행사 소개" wide><textarea value={String(payload.description ?? "")} onChange={(e) => set("description", e.target.value)} placeholder="누구를 위한 행사인지, 무엇을 얻어갈 수 있는지 자세히 소개해주세요." /></Field>
            <Field label="프로그램" wide><textarea value={String(payload.program ?? "")} onChange={(e) => set("program", e.target.value)} placeholder={"14:00 | 참가자 입장 | 운영팀\n14:20 | 세션 1 · 제품 이야기 | 홍길동\n15:30 | 네트워킹"} /><small className="field-help">한 줄에 하나씩 `시간 | 프로그램 | 진행자` 순서로 입력하세요.</small></Field>
            <div className="event-registration-method wide">
              <span>신청 받는 방법</span>
              <div>
                <button className={payload.registrationMode === "internal" ? "active" : ""} type="button" onClick={() => set("registrationMode", "internal")}><strong>Featable에서 신청</strong><small>회원이 사이트 안에서 신청하고 내가 참가자를 관리해요.</small></button>
                <button className={payload.registrationMode !== "internal" ? "active" : ""} type="button" onClick={() => set("registrationMode", "external")}><strong>외부 링크로 신청</strong><small>이벤터스·Luma·Google Form 등으로 연결해요.</small></button>
              </div>
            </div>
            {payload.registrationMode === "internal" ? <>
              <Field label="승인 방식"><select value={String(payload.approvalMode ?? "instant")} onChange={(e) => set("approvalMode", e.target.value)}><option value="instant">신청 즉시 확정</option><option value="manual">주최자 승인 후 확정</option></select></Field>
              <Field label="정원"><input type="number" min="1" max="100000" value={String(payload.capacity ?? "")} onChange={(e) => set("capacity", e.target.value)} placeholder="비워두면 제한 없음" /></Field>
              <label className="partner-register-check wide"><input type="checkbox" checked={payload.waitlistEnabled !== false} onChange={(e) => set("waitlistEnabled", e.target.checked)} /><span>정원이 차면 대기 신청을 받습니다.</span></label>
            </> : <Field label="신청 링크" required wide><input type="url" value={String(payload.applyUrl ?? "")} onChange={(e) => set("applyUrl", e.target.value)} placeholder="https://" /></Field>}
            <div className="event-image-fields wide">
              <div><span>대표 포스터</span><label className="event-image-upload">{payload.coverUrl ? <img src={String(payload.coverUrl)} alt="대표 포스터 미리보기" /> : <b>포스터 이미지 선택</b>}<small>{uploading === "cover" ? "업로드 중…" : "JPG, PNG, WEBP · 최대 8MB"}</small><input type="file" accept="image/*" disabled={Boolean(uploading)} onChange={(event) => uploadImages(event, "cover")} /></label></div>
              <div><span>상세 이미지 <small>최대 8장</small></span><div className="event-gallery-editor">{galleryUrls.map((url, index) => <figure key={url}><img src={url} alt={`상세 이미지 ${index + 1}`} /><button type="button" onClick={() => set("galleryUrls", galleryUrls.filter((item) => item !== url))}>삭제</button></figure>)}{galleryUrls.length < 8 && <label className="event-gallery-add">{uploading === "gallery" ? "업로드 중…" : "+ 이미지 추가"}<input type="file" accept="image/*" multiple disabled={Boolean(uploading)} onChange={(event) => uploadImages(event, "gallery")} /></label>}</div></div>
            </div>
            <label className="partner-register-check wide"><input type="checkbox" checked={Boolean(payload.isOnline)} onChange={(e) => set("isOnline", e.target.checked)} /><span>온라인 행사입니다.</span></label>
          </>}

          {type === "support" && <>
            <Field label="지원사업명" required wide><input value={String(payload.name ?? "")} onChange={(e) => set("name", e.target.value)} placeholder="예: 2026 청년창업 지원사업" /></Field>
            <Field label="운영 기관" required><input value={String(payload.agency ?? "")} onChange={(e) => set("agency", e.target.value)} placeholder="기관명" /></Field>
            <Field label="분야"><input value={String(payload.field ?? "")} onChange={(e) => set("field", e.target.value)} placeholder="AI, 콘텐츠, 로컬" /></Field>
            <Field label="접수 시작일"><input type="date" value={String(payload.openAt ?? "")} onChange={(e) => set("openAt", e.target.value)} /></Field>
            <Field label="접수 마감일" required><input type="date" value={String(payload.closeAt ?? "")} onChange={(e) => set("closeAt", e.target.value)} /></Field>
            <Field label="지역"><input value={String(payload.region ?? "")} onChange={(e) => set("region", e.target.value)} placeholder="전국" /></Field>
            <Field label="지원 규모"><input value={String(payload.amount ?? "")} onChange={(e) => set("amount", e.target.value)} placeholder="최대 5,000만원" /></Field>
            <Field label="모집 대상" required wide><textarea value={String(payload.target ?? "")} onChange={(e) => set("target", e.target.value)} placeholder="누가 신청할 수 있는지 적어주세요." /></Field>
            <Field label="지원 내용" required wide><textarea value={String(payload.benefits ?? "")} onChange={(e) => set("benefits", e.target.value)} placeholder="자금, 공간, 멘토링 등 핵심 혜택" /></Field>
            <Field label="공고·신청 링크" required wide><input type="url" value={String(payload.applyUrl ?? "")} onChange={(e) => set("applyUrl", e.target.value)} placeholder="https://" /></Field>
          </>}

          {type === "community" && <>
            <Field label="커뮤니티명" required wide><input value={String(payload.name ?? "")} onChange={(e) => set("name", e.target.value)} placeholder="예: Youth Founders Club" /></Field>
            <Field label="분야" required><input value={String(payload.field ?? "")} onChange={(e) => set("field", e.target.value)} placeholder="창업·개발·마케팅" /></Field>
            <Field label="웹사이트"><input type="url" value={String(payload.website ?? "")} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></Field>
            <Field label="한 줄 소개" required wide><input value={String(payload.intro ?? "")} onChange={(e) => set("intro", e.target.value)} placeholder="어떤 사람들이 무엇을 함께하는 커뮤니티인가요?" /></Field>
            <Field label="로고 이미지 URL" wide><input type="url" value={String(payload.logoUrl ?? "")} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://" /></Field>
            <Field label="인스타그램"><input value={String(payload.instagram ?? "")} onChange={(e) => set("instagram", e.target.value)} placeholder="@account" /></Field>
          </>}
        </div>

        {message && <p className="partner-register-message">{message}</p>}
        <footer><div>{id && <button className="danger" type="button" disabled={pending} onClick={remove}>초안 삭제</button>}</div><button className="secondary" type="button" disabled={pending} onClick={() => save(false)}>임시저장</button><button className="primary" type="button" disabled={pending} onClick={() => save(true)}>{pending ? "처리 중…" : type === "event" && payload.publishMode !== "featured" ? "행사 바로 공개하기" : "Featured 검토 요청하기"}</button></footer>
      </>}
    </section>
    {type === "event" && <EventLivePreview payload={payload} />}
    </div>
  </div>;
}

function EventLivePreview({ payload }: { payload: PartnerSubmissionPayload }) {
  const gallery = Array.isArray(payload.galleryUrls) ? payload.galleryUrls : [];
  const date = String(payload.startsAt || "");
  return <aside className="event-live-preview">
    <header><span>LIVE PREVIEW</span><strong>참가자에게 보이는 화면</strong></header>
    <div className="event-live-preview-screen">
      <div className="event-live-preview-poster">{payload.coverUrl ? <img src={String(payload.coverUrl)} alt="" /> : <span>포스터를 추가해주세요</span>}</div>
      <div className="event-live-preview-copy"><small>{String(payload.category || "EVENT")}</small><h2>{String(payload.name || "행사명을 입력해주세요")}</h2><p>{String(payload.description || "행사를 소개하면 이곳에서 참가자가 내용을 미리 확인할 수 있어요.")}</p>
        <dl><div><dt>일시</dt><dd>{date ? new Date(date).toLocaleString("ko-KR") : "일시 미정"}</dd></div><div><dt>장소</dt><dd>{String(payload.location || (payload.isOnline ? "온라인" : "장소 미정"))}</dd></div><div><dt>주최</dt><dd>{String(payload.host || "주최 기관")}</dd></div></dl>
        <button type="button">신청하기 →</button>
      </div>
      {gallery.length > 0 && <div className="event-live-preview-gallery">{gallery.slice(0, 3).map((url) => <img src={url} alt="" key={url} />)}</div>}
    </div>
    <p>입력과 동시에 갱신됩니다. 실제 공개 페이지는 데스크톱·모바일에 맞춰 자동 조정돼요.</p>
  </aside>;
}
