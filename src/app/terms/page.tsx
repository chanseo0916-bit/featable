import type { Metadata } from "next";
import { Footer, Header } from "@/components/site-shell";
import { getPartners } from "@/lib/data";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "이용약관",
  robots: { index: false, follow: false },
};

export default async function TermsPage() {
  const partners = await getPartners();

  return (
    <>
      <Header />
      <main className="shell legal-page">
        <div className="listing-heading">
          <div>
            <h1>이용약관</h1>
            <p>시행일: 2026년 8월 20일</p>
          </div>
        </div>

        <article className="legal-body">
          <section>
            <h2>제1조 (목적)</h2>
            <p>
              이 약관은 Featable(이하 &ldquo;회사&rdquo;)이 제공하는 초기
              창업가 큐레이션 플랫폼 서비스(이하 &ldquo;서비스&rdquo;)의
              이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항을
              정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2>제2조 (정의)</h2>
            <ul>
              <li>&ldquo;이용자&rdquo;란 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
              <li>&ldquo;파운더&rdquo;란 브랜드·프로덕트를 등록해 소개하는 이용자를 말합니다.</li>
              <li>&ldquo;콘텐츠&rdquo;란 이용자가 서비스에 등록하는 브랜드, 프로덕트, 스토리, 댓글 등 일체의 게시물을 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2>제3조 (약관의 효력 및 변경)</h2>
            <p>
              회사는 이 약관의 내용을 이용자가 쉽게 알 수 있도록
              서비스 초기 화면 또는 연결 화면에 게시합니다. 회사는
              관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있으며,
              개정 시 적용일자와 개정사유를 명시하여 시행일 7일 전부터
              공지합니다. 이용자가 개정 약관에 동의하지 않는 경우
              이용계약을 해지할 수 있습니다.
            </p>
          </section>

          <section>
            <h2>제4조 (회원가입)</h2>
            <p>
              이용자는 회사가 정한 가입 양식에 따라 정보를 기입한 후
              이 약관과 개인정보처리방침에 동의함으로써 회원가입을
              신청합니다. 회사는 다음 각 호에 해당하는 신청에 대해서는
              승낙을 유보하거나 거부할 수 있습니다.
            </p>
            <ul>
              <li>타인의 명의를 이용하거나 허위 정보를 기재한 경우</li>
              <li>이전에 이 약관 위반으로 자격이 상실된 이력이 있는 경우</li>
              <li>기타 회사가 정한 이용 조건에 부합하지 않는 경우</li>
            </ul>
          </section>

          <section>
            <h2>제5조 (콘텐츠 등록 및 관리)</h2>
            <p>
              파운더는 본인이 소유하거나 정당한 권한이 있는 브랜드·프로덕트
              정보만을 등록해야 하며, 등록한 콘텐츠에 대한 권리와 책임은
              해당 파운더에게 있습니다. 회사는 다음 각 호에 해당하는
              콘텐츠를 사전 통지 없이 비공개 처리하거나 삭제할 수 있습니다.
            </p>
            <ul>
              <li>타인의 지식재산권, 초상권 등을 침해하는 콘텐츠</li>
              <li>허위 정보 또는 이용자를 오인하게 하는 정보</li>
              <li>법령 또는 공서양속에 위반되는 콘텐츠</li>
              <li>영리 목적의 스팸성 게시물</li>
            </ul>
          </section>

          <section>
            <h2>제6조 (이용자의 의무)</h2>
            <p>
              이용자는 관계 법령, 이 약관의 규정, 이용안내 및 서비스와
              관련하여 공지한 주의사항을 준수해야 하며, 다음 행위를
              해서는 안 됩니다.
            </p>
            <ul>
              <li>타인의 계정을 무단으로 사용하는 행위</li>
              <li>서비스 운영을 방해하거나 서버에 부하를 발생시키는 행위</li>
              <li>회사의 승인 없이 서비스를 영리 목적으로 이용하는 행위</li>
            </ul>
          </section>

          <section>
            <h2>제7조 (서비스의 제공 및 변경)</h2>
            <p>
              회사는 브랜드·프로덕트 큐레이션, 스토리 발행, 행사·지원사업
              정보 제공, 커뮤니티 연결 등의 서비스를 제공합니다. 회사는
              운영상, 기술상의 필요에 따라 서비스의 전부 또는 일부를
              변경하거나 중단할 수 있으며, 이 경우 사전에 공지합니다.
            </p>
          </section>

          <section>
            <h2>제8조 (계약 해지 및 이용 제한)</h2>
            <p>
              이용자는 언제든지 마이페이지를 통해 이용계약을 해지할 수
              있습니다. 회사는 이용자가 이 약관을 위반한 경우 사전 통지
              후 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.
            </p>
          </section>

          <section>
            <h2>제9조 (면책조항)</h2>
            <p>
              회사는 천재지변 등 불가항력으로 서비스를 제공할 수 없는
              경우 책임이 면제됩니다. 회사는 이용자가 등록한 콘텐츠의
              신뢰성, 정확성에 대해 보증하지 않으며, 이용자 간 또는
              이용자와 제3자 간에 발생한 분쟁에 개입하지 않습니다.
            </p>
          </section>

          <section>
            <h2>제10조 (문의처)</h2>
            <p>
              서비스 이용과 관련한 문의는 아래 연락처로 접수해주세요.
              <br />
              이메일: {CONTACT_EMAIL}
            </p>
          </section>
        </article>
      </main>
      <Footer partners={partners} />
    </>
  );
}
