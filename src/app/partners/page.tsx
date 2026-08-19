import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Footer, Header } from "@/components/site-shell";
import { getPartners } from "@/lib/data";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "파트너",
  description: "피처블과 함께 창업 생태계를 만드는 파트너를 소개합니다.",
};

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
        <div className="partner-org-grid">
          {partners.map((partner) => {
            const external = !partner.href.startsWith("/");
            const card = (
              <>
                <div className="partner-org-head">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={partner.logoUrl} alt={partner.name} />
                  <div>
                    <h3>{partner.name}</h3>
                    {partner.field && <Badge>{partner.field}</Badge>}
                  </div>
                </div>
                {partner.intro && <p>{partner.intro}</p>}
                {partner.description && <small>{partner.description}</small>}
                <span className="text-link">
                  {external ? "웹사이트 방문 →" : "자세히 보기 →"}
                </span>
              </>
            );
            return external ? (
              <a
                className="partner-org-card"
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                key={partner.name}
              >
                {card}
              </a>
            ) : (
              <Link className="partner-org-card" href={partner.href} key={partner.name}>
                {card}
              </Link>
            );
          })}
        </div>
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
