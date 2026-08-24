import Link from "next/link";
import { Badge } from "@/components/site-shell";
import { EntityCard } from "@/components/cards/entity-card";
import type { PublishingProfileInput } from "@/app/my/publishing/[token]/actions";

export interface PartnerDirectoryCardProps {
  name: string;
  logoUrl: string;
  field?: string;
  intro?: string;
  description?: string;
  featured?: boolean;
  external?: boolean;
  href: string;
}

/** 파트너 디렉터리 카드 — EntityCard row 레이아웃 단일 구현 */
export function PartnerDirectoryCard({
  name, logoUrl, field, intro, featured = false, external = true, href,
}: PartnerDirectoryCardProps) {
  return (
    <EntityCard
      layout="row"
      href={href}
      logo={logoUrl || null}
      logoAlt={name}
      title={name}
      badge={<Badge tone={featured ? "orange" : "default"}>{featured ? "Featable 파트너" : field}</Badge>}
      description={intro}
    />
  );
}

export interface CommunityDirectoryCardProps {
  slug: string;
  name: string;
  logoUrl: string;
  field: string;
  intro: string;
}

/** 커뮤니티 디렉터리 카드 — 파트너와 같은 row 레이아웃 */
export function CommunityDirectoryCard({ slug, name, logoUrl, field, intro }: CommunityDirectoryCardProps) {
  return (
    <EntityCard
      layout="row"
      href={`/communities/${slug}`}
      logo={logoUrl || null}
      logoAlt={name}
      title={name}
      badge={<Badge>{field}</Badge>}
      description={intro || "어떤 사람들이 함께하는 커뮤니티인지 소개해주세요."}
    />
  );
}

export function PartnerPublishingPreview({ value }: { value: PublishingProfileInput }) {
  return (
    <div className="publishing-card-preview">
      <PartnerDirectoryCard
        name={value.name}
        logoUrl={value.logoUrl}
        field={value.field || "분야"}
        intro={value.intro || "파트너를 한 문장으로 소개해주세요."}
        href="#"
        external={false}
      />
    </div>
  );
}

export function CommunityPublishingPreview({ value }: { value: PublishingProfileInput }) {
  return (
    <div className="publishing-card-preview">
      <CommunityDirectoryCard
        slug="preview"
        name={value.name || "커뮤니티 이름"}
        logoUrl={value.logoUrl}
        field={value.field || "분야"}
        intro={value.intro}
      />
    </div>
  );
}

export function PublishingDetailPreview({ value, type }: { value: PublishingProfileInput; type: "partner" | "community" }) {
  return <div className="publishing-detail-preview"><div className="publishing-detail-cover"><span>{type === "partner" ? "PARTNER PROFILE" : "COMMUNITY PROFILE"}</span></div><div className="publishing-detail-identity">{value.logoUrl ? <img src={value.logoUrl} alt="" /> : <b>{value.name.slice(0, 1) || (type === "partner" ? "P" : "C")}</b>}<div><small>{value.field || "분야"}</small><h2>{value.name || (type === "partner" ? "파트너 이름" : "커뮤니티 이름")}</h2></div></div><p className="publishing-detail-intro">{value.intro || "한 줄 소개가 여기에 표시됩니다."}</p><div className="publishing-detail-description">{value.description || "상세 소개를 입력하면 공개 페이지의 소개 영역에서 확인할 수 있어요."}</div><footer><span>{value.website ? "공식 웹사이트 연결됨" : "웹사이트 미등록"}</span><strong>공개 페이지 →</strong></footer></div>;
}
