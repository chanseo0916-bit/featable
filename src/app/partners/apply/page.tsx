import { Footer, Header } from "@/components/site-shell";
import { getPartners } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";
import { PartnershipApplicationForm } from "./application-form";

export const metadata = createPageMetadata({
  title: "파트너 문의 및 신청",
  description: "Featable 광고·브랜디드 콘텐츠 문의와 커뮤니티 제휴 신청을 접수합니다.",
  path: "/partners/apply",
});

export default async function PartnershipApplyPage() {
  const partners = await getPartners();
  return <><Header /><main className="partnership-apply-page"><div className="shell"><header className="partnership-apply-hero"><p>파트너 문의</p><h1>Founder에게 닿는<br />가장 자연스러운 방법.</h1><span>광고주와 커뮤니티 파트너는 서로 다른 방식으로 협업합니다.<br />목적에 맞는 유형을 선택하면 Featable이 다음 단계를 제안할게요.</span><div><i>광고</i><strong>광고주는 발견되는 콘텐츠를 만듭니다.</strong><i>제휴</i><strong>커뮤니티 파트너는 연결되는 기회를 만듭니다.</strong></div></header><PartnershipApplicationForm /></div></main><Footer partners={partners} /></>;
}
