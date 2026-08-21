import Link from "next/link";
import { Badge, Footer, Header } from "@/components/site-shell";
import { getPartners } from "@/lib/data";
import { CONTACT_EMAIL, createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  title: "창업 생태계 파트너",
  description:
    "커뮤니티, 지원기관, 미디어 등 창업 생태계를 함께 만드는 Featable의 파트너를 소개합니다.",
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
            <p className="eyebrow">PARTNERS</p>
            <h1>파트너</h1>
            <p>피처블과 함께 창업가의 다음 발견을 만드는 파트너들입니다.</p>
          </div>
        </div>
        {(() => {
          const featuredPartners = partners.filter((partner) => partner.featured);
          const basicPartners = partners.filter((partner) => !partner.featured);
          const renderCard = (partner: (typeof partners)[number]) => {
            const external = !partner.href.startsWith("/");
            const card = (
              <>
                {partner.featured && <span className="partner-featured-badge">★ FEATURED PARTNER</span>}
                <div className="partner-org-logo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={partner.logoUrl} alt={partner.name} />
                </div>
                <div className="partner-org-body">
                  <div className="partner-org-title">
                    <h3>{partner.name}</h3>
                    {partner.field && <Badge>{partner.field}</Badge>}
                  </div>
                  {partner.intro && <p>{partner.intro}</p>}
                  {partner.description && <small>{partner.description}</small>}
                  <span className="text-link">
                    {external ? "웹사이트 방문 →" : "자세히 보기 →"}
                  </span>
                </div>
              </>
            );
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
                  <div className="partner-tier-heading"><strong>Featured Partners</strong><span>피처블과 긴밀하게 함께하는 파트너</span></div>
                  <div className="partner-org-grid partner-featured-grid">{featuredPartners.map(renderCard)}</div>
                </>
              )}
              {basicPartners.length > 0 && (
                <>
                  {featuredPartners.length > 0 && <div className="partner-tier-heading"><strong>Partners</strong><span>함께하는 생태계 파트너</span></div>}
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
            <strong>피처블과 함께하고 싶으신가요?</strong>
            <p>커뮤니티, 지원기관, 미디어 등 창업 생태계 파트너를 기다립니다.</p>
          </div>
          <a href={`mailto:${CONTACT_EMAIL}`}>파트너 제안하기</a>
        </section>
      </main>
      <Footer partners={partners} />
    </>
  );
}
