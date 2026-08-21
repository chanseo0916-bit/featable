import type { Metadata } from "next";
import { Footer, Header } from "@/components/site-shell";
import { getPartners } from "@/lib/data";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  robots: { index: false, follow: false },
};

export default async function PrivacyPage() {
  const partners = await getPartners();

  return (
    <>
      <Header />
      <main className="shell legal-page">
        <div className="listing-heading">
          <div>
            <p className="eyebrow">PRIVACY POLICY</p>
            <h1>개인정보처리방침</h1>
            <p>시행일: 2026년 8월 21일</p>
          </div>
        </div>

        <article className="legal-body">
          <section>
            <p>
              Featable(이하 &ldquo;회사&rdquo;)은 이용자의 개인정보를
              중요하게 생각하며, 「개인정보 보호법」 등 관련 법령을
              준수합니다. 본 방침은 회사가 어떤 개인정보를 수집하고,
              어떻게 이용·보관하며, 이용자가 어떤 권리를 행사할 수 있는지
              설명합니다.
            </p>
          </section>

          <section>
            <h2>1. 수집하는 개인정보 항목</h2>
            <ul>
              <li><b>회원가입</b> — 이메일, 비밀번호(암호화 저장), 이름, 활동 유형(파운더/일반)</li>
              <li><b>파운더 프로필</b> — 한 줄 소개, 소개글, 프로필 사진, SNS 링크(선택)</li>
              <li><b>브랜드·프로덕트 등록</b> — 등록자가 직접 입력하는 브랜드·제품 정보 및 이미지</li>
              <li><b>행사 신청</b> — 신청자 이름, 이메일, 주최자에게 남기는 메모(선택), 신청·승인·취소 상태</li>
              <li><b>댓글</b> — 표시 이름, 프로필 사진, 댓글 내용</li>
              <li><b>서비스 이용 기록</b> — 접속 로그, 조회수 등 서비스 개선을 위한 통계성 정보</li>
              <li><b>마케팅 수신 동의 시</b> — 이메일을 통한 소식 발송에 활용</li>
            </ul>
          </section>

          <section>
            <h2>2. 개인정보 수집 방법</h2>
            <p>
              회원가입, 프로필 편집, 브랜드·프로덕트 등록, 댓글 작성 등
              이용자가 서비스 내에서 직접 정보를 입력하는 과정에서
              수집됩니다.
            </p>
          </section>

          <section>
            <h2>3. 개인정보의 이용 목적</h2>
            <ul>
              <li>회원 식별 및 서비스 제공을 위한 본인 확인</li>
              <li>파운더 프로필, 브랜드·프로덕트 페이지 공개 서비스 제공</li>
              <li>댓글 등 이용자 간 상호작용 기능 제공</li>
              <li>행사 신청 접수, 참가 승인, 대기 및 취소 관리</li>
              <li>서비스 부정 이용 방지 및 고객 문의 대응</li>
              <li>(동의 시) 새로운 소식 안내를 위한 마케팅 정보 발송</li>
            </ul>
          </section>

          <section>
            <h2>4. 개인정보의 보유 및 이용 기간</h2>
            <p>
              회사는 원칙적으로 이용자가 회원 탈퇴를 요청하거나 등록한
              콘텐츠를 삭제하는 즉시 해당 개인정보를 파기합니다. 단,
              관계 법령에 따라 보존이 필요한 경우 해당 법령에서 정한
              기간 동안 보관합니다.
            </p>
          </section>

          <section>
            <h2>5. 개인정보의 제3자 제공</h2>
            <p>
              회사는 이용자의 동의 없이 개인정보를 외부에 제공하지
              않습니다. 다만, 법령에 근거가 있거나 수사기관이 법령에
              정해진 절차와 방법에 따라 요구하는 경우는 예외로 합니다.
            </p>
            <p>
              이용자가 Featable 내부 행사 신청 화면에서 별도로 동의한 경우,
              신청 처리와 참가자 관리를 위해 이름·이메일·신청 메모를 해당
              행사 주최자에게 제공합니다. 제공받는 자와 제공 항목은 신청 전
              화면에서 다시 안내하며, 동의를 거부하면 해당 행사에 신청할 수
              없습니다.
            </p>
          </section>

          <section>
            <h2>6. 개인정보 처리의 위탁</h2>
            <p>
              회사는 안정적인 서비스 제공을 위해 아래와 같이 개인정보
              처리를 위탁하고 있습니다.
            </p>
            <ul>
              <li>Supabase (인증, 데이터베이스, 파일 저장소 운영)</li>
              <li>배포·호스팅 인프라 제공업체 (서비스 구동)</li>
            </ul>
          </section>

          <section>
            <h2>7. 이용자의 권리와 행사 방법</h2>
            <p>
              이용자는 마이페이지를 통해 언제든지 본인의 프로필, 브랜드·
              프로덕트 정보를 열람·수정·삭제할 수 있으며, 회원 탈퇴를
              통해 개인정보 이용 동의를 철회할 수 있습니다. 그 외
              문의는 아래 연락처로 요청할 수 있습니다.
            </p>
          </section>

          <section>
            <h2>8. 쿠키의 운영 및 거부</h2>
            <p>
              회사는 로그인 상태 유지 등 서비스 이용을 위해 쿠키를
              사용합니다. 이용자는 브라우저 설정을 통해 쿠키 저장을
              거부할 수 있으나, 이 경우 로그인이 필요한 일부 기능
              이용에 제한이 있을 수 있습니다.
            </p>
          </section>

          <section>
            <h2>9. 개인정보 보호책임자 및 문의처</h2>
            <p>
              개인정보 처리와 관련한 문의, 불만 처리, 피해 구제 등은
              아래로 연락해주세요.
              <br />
              이메일: {CONTACT_EMAIL}
            </p>
          </section>

          <section>
            <h2>10. 고지의 의무</h2>
            <p>
              본 방침은 법령·정책 또는 서비스의 변경에 따라 내용이
              추가·삭제·수정될 수 있으며, 변경 시 서비스 내 공지를
              통해 안내합니다.
            </p>
          </section>
        </article>
      </main>
      <Footer partners={partners} />
    </>
  );
}
