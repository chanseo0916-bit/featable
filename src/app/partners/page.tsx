import Link from "next/link";
import { Footer, Header } from "@/components/site-shell";
import { PartnerDirectoryCardVisual } from "@/components/publishing-preview-cards";
import { getPartners } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  title: "광고·커뮤니티 파트너",
  description:
    "Featable의 광고주와 공식 커뮤니티 파트너를 소개하고 광고·제휴 문의를 접수합니다.",
  path: "/partners",
});

export default async function PartnersPage() {
  const partners = await getPartners();

  return (
    <>
      <Header />
      <main className="shell listing-page">
        <div className="listing-heading">
          <div>
            
            <h1>파트너</h1>
            <p>Founder에게 닿고 싶은 광고주와 새로운 연결을 만드는 공식 커뮤니티 파트너입니다.</p>
          </div>
        </div>
        {(() => {
          const featuredPartners = partners.filter((partner) => partner.featured);
          const basicPartners = partners.filter((partner) => !partner.featured);
          const renderCard = (partner: (typeof partners)[number]) => {
            const external = !partner.href.startsWith("/");
            const card = <PartnerDirectoryCardVisual name={partner.name} logoUrl={partner.logoUrl} field={partner.field} intro={partner.intro} description={partner.description} featured={partner.featured} external={external} />;
            const className = partner.featured ? "partner-org-card is-featured" : "partner-org-card";
            return external ? (
              <a className={className} href={partner.href} target="_blank" rel="noopener noreferrer" key={partner.name}>{card}</a>
            ) : (
              <Link className={className} href={partner.href} key={partner.name}>{card}</Link>
            );
          };
          return (
            <>
              {featuredPartners.length > 0 && (
                <>
                  <div className="partner-tier-heading"><strong>주요 파트너</strong><span>피터블과 긴밀하게 함께하는 파트너</span></div>
                  <div className="partner-org-grid partner-featured-grid">{featuredPartners.map(renderCard)}</div>
                </>
              )}
              {basicPartners.length > 0 && (
                <>
                  {featuredPartners.length > 0 && <div className="partner-tier-heading"><strong>모든 파트너</strong><span>함께하는 생태계 파트너</span></div>}
                  <div className="partner-org-grid">{basicPartners.map(renderCard)}</div>
                </>
              )}
            </>
          );
        })()}
        {partners.length === 0 && (
          <p className="partner-org-empty">아직 등록된 파트너가 없습니다.</p>
        )}
        <section className="partner-org-cta">
          <div>
            <strong>피터블과 함께하고 싶으신가요?</strong>
            <p>광고·스폰서십을 집행하려는 브랜드와 공동 기획을 원하는 커뮤니티를 기다립니다.</p>
          </div>
          <Link href="/partners/apply">파트너 문의·신청하기</Link>
        </section>
      </main>
      <Footer partners={partners} />
    </>
  );
}
