"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitPartnershipInquiry, type PartnershipInquiryState } from "./actions";

const initialState: PartnershipInquiryState = {};

export function PartnershipApplicationForm() {
  const [type, setType] = useState<"advertiser" | "community_partner">("advertiser");
  const [state, action, pending] = useActionState(submitPartnershipInquiry, initialState);

  if (state.ok) return <section className="partnership-success"><i>✓</i><p>신청 완료</p><h1>문의가 접수됐어요.</h1><span>담당자가 내용을 확인한 뒤 입력하신 이메일로 연락드릴게요.</span><Link href="/partners">파트너 페이지로 돌아가기 →</Link></section>;

  return <form action={action} className="partnership-application-form">
    <input type="hidden" name="inquiryType" value={type} />
    <label className="partnership-honeypot" aria-hidden="true">회사 홈페이지<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label>

    <div className="partnership-type-select">
      <button type="button" className={type === "advertiser" ? "active" : ""} onClick={() => setType("advertiser")}><i>01</i><strong>광고·브랜드 파트너</strong><span>광고, 스폰서십, 브랜디드 콘텐츠를 집행하고 싶어요.</span></button>
      <button type="button" className={type === "community_partner" ? "active" : ""} onClick={() => setType("community_partner")}><i>02</i><strong>커뮤니티 파트너</strong><span>공동 행사, 멤버 혜택, 콘텐츠 제휴를 만들고 싶어요.</span></button>
    </div>

    <section className="partnership-form-section">
      <header><span>01</span><div><h2>기본 정보</h2><p>{type === "advertiser" ? "광고를 집행하는 기업 또는 브랜드 정보를 알려주세요." : "제휴를 제안하는 커뮤니티 운영 정보를 알려주세요."}</p></div></header>
      <div className="partnership-form-grid">
        <label><span>{type === "advertiser" ? "기업·브랜드명" : "커뮤니티명"}<b>*</b></span><input name="organization" required maxLength={100} placeholder={type === "advertiser" ? "예: Featable" : "예: Youth Founders Club"} /></label>
        <label><span>웹사이트·SNS</span><input name="website" type="url" placeholder="https://" /></label>
        <label><span>담당자명<b>*</b></span><input name="contactName" required maxLength={50} autoComplete="name" placeholder="성함" /></label>
        <label><span>이메일<b>*</b></span><input name="contactEmail" type="email" required maxLength={160} autoComplete="email" placeholder="name@company.com" /></label>
        <label className="wide"><span>연락처</span><input name="contactPhone" type="tel" maxLength={40} autoComplete="tel" placeholder="010-0000-0000" /></label>
      </div>
    </section>

    <section className="partnership-form-section">
      <header><span>02</span><div><h2>{type === "advertiser" ? "캠페인 정보" : "제휴 정보"}</h2><p>구체적일수록 더 빠르게 적합한 방식을 제안할 수 있어요.</p></div></header>
      <div className="partnership-form-grid">
        <label><span>{type === "advertiser" ? "광고 목적" : "제휴 목적"}<b>*</b></span><select name="objective" required defaultValue=""><option value="" disabled>선택해주세요</option>{type === "advertiser" ? <><option>브랜드 인지도</option><option>제품·서비스 런칭</option><option>리드·가입자 확보</option><option>행사·채용 홍보</option><option>브랜디드 콘텐츠</option><option>기타</option></> : <><option>공동 행사</option><option>멤버 혜택 제휴</option><option>콘텐츠 교류</option><option>상호 홍보</option><option>Founder 연결</option><option>기타</option></>}</select></label>
        {type === "advertiser" ? <label><span>예상 예산</span><select name="budget" defaultValue=""><option value="">미정</option><option>100만원 미만</option><option>100만–300만원</option><option>300만–1,000만원</option><option>1,000만원 이상</option></select></label> : <label><span>커뮤니티 규모</span><input name="communitySize" maxLength={80} placeholder="예: 활동 멤버 500명" /></label>}
        <label><span>희망 일정</span><input name="timeline" maxLength={80} placeholder="예: 9월 중 / 협의 가능" /></label>
        <label><span>{type === "advertiser" ? "주요 타깃" : "주요 멤버"}</span><input name="audience" maxLength={300} placeholder="예: 20대 초기 창업가와 프로덕트 빌더" /></label>
        <label className="wide"><span>문의 내용<b>*</b></span><textarea name="message" required minLength={10} maxLength={2000} placeholder={type === "advertiser" ? "홍보하려는 제품과 원하는 캠페인 방향을 알려주세요." : "커뮤니티 소개와 함께 만들고 싶은 제휴를 알려주세요."} /></label>
      </div>
    </section>

    <label className="partnership-consent"><input type="checkbox" name="privacyAccepted" required /><span>문의 처리 및 회신을 위한 개인정보 수집·이용에 동의합니다. <Link href="/privacy" target="_blank">개인정보처리방침 보기</Link></span></label>
    {state.error && <p className="partnership-form-error">{state.error}</p>}
    <footer><div><strong>보통 1–2영업일 내 회신드려요.</strong><span>접수 내용은 Featable 운영진만 확인합니다.</span></div><button type="submit" disabled={pending}>{pending ? "접수 중…" : type === "advertiser" ? "광고 문의 보내기" : "커뮤니티 제휴 신청하기"}<b>→</b></button></footer>
  </form>;
}
