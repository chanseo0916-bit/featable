import type { PublishingProfileInput } from "@/app/my/publishing/[token]/actions";

export interface PartnerDirectoryCardVisualProps {
  name: string;
  logoUrl: string;
  field?: string;
  intro?: string;
  description?: string;
  featured?: boolean;
  external?: boolean;
}

export function PartnerDirectoryCardVisual({ name, logoUrl, field, intro, description, featured = false, external = true }: PartnerDirectoryCardVisualProps) {
  return <>
    {featured && <span className="partner-featured-badge">Featable 파트너</span>}
    <div className="partner-org-logo">{logoUrl ? <img src={logoUrl} alt={`${name} 로고`} /> : <span>{name.slice(0, 1) || "P"}</span>}</div>
    <div className="partner-org-body"><div className="partner-org-title"><h3>{name || "파트너 이름"}</h3>{field && <span className="badge">{field}</span>}</div>{intro && <p>{intro}</p>}{description && <small>{description}</small>}<span className="text-link">{external ? "웹사이트 방문 →" : "자세히 보기 →"}</span></div>
  </>;
}

export interface CommunityDirectoryCardVisualProps {
  name: string;
  logoUrl: string;
  field: string;
  intro: string;
  founderCount?: number;
  brandCount?: number;
  eventCount?: number;
  approved?: boolean;
}

export function CommunityDirectoryCardVisual({ name, logoUrl, field, intro, founderCount = 0, brandCount = 0, eventCount = 0, approved = false }: CommunityDirectoryCardVisualProps) {
  return <>
    <div className="community-card-head">{logoUrl ? <img src={logoUrl} alt={`${name} 로고`} /> : <span className="publishing-logo-placeholder">{name.slice(0, 1) || "C"}</span>}<span><i /> {approved ? "승인된 커뮤니티" : "활동 중"}</span></div>
    <div className="community-directory-copy"><div><h2>{name || "커뮤니티 이름"}</h2><span>{field || "분야"}</span></div><p>{intro || "어떤 사람들이 함께하는 커뮤니티인지 소개해주세요."}</p></div>
    <div className="community-card-stats"><span><b>{founderCount}</b> Founder</span><span><b>{brandCount}</b> Brand</span><span><b>{eventCount}</b> Event</span><span className="button button-small community-card-cta">커뮤니티 보기 <span aria-hidden="true">→</span></span></div>
  </>;
}

export function PartnerPublishingPreview({ value }: { value: PublishingProfileInput }) {
  return <div className="partner-org-card publishing-card-preview"><PartnerDirectoryCardVisual name={value.name} logoUrl={value.logoUrl} field={value.field || "분야"} intro={value.intro || "파트너를 한 문장으로 소개해주세요."} description={value.description || "상세 소개가 이곳에 표시됩니다."} /></div>;
}

export function CommunityPublishingPreview({ value }: { value: PublishingProfileInput }) {
  return <div className="community-directory-card publishing-card-preview"><CommunityDirectoryCardVisual name={value.name} logoUrl={value.logoUrl} field={value.field} intro={value.intro} approved /></div>;
}

export function PublishingDetailPreview({ value, type }: { value: PublishingProfileInput; type: "partner" | "community" }) {
  return <div className="publishing-detail-preview"><div className="publishing-detail-cover"><span>{type === "partner" ? "PARTNER PROFILE" : "COMMUNITY PROFILE"}</span></div><div className="publishing-detail-identity">{value.logoUrl ? <img src={value.logoUrl} alt="" /> : <b>{value.name.slice(0, 1) || (type === "partner" ? "P" : "C")}</b>}<div><small>{value.field || "분야"}</small><h2>{value.name || (type === "partner" ? "파트너 이름" : "커뮤니티 이름")}</h2></div></div><p className="publishing-detail-intro">{value.intro || "한 줄 소개가 여기에 표시됩니다."}</p><div className="publishing-detail-description">{value.description || "상세 소개를 입력하면 공개 페이지의 소개 영역에서 확인할 수 있어요."}</div><footer><span>{value.website ? "공식 웹사이트 연결됨" : "웹사이트 미등록"}</span><strong>공개 페이지 →</strong></footer></div>;
}
