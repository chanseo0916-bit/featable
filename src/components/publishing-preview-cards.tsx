import type { PublishingProfileInput } from "@/app/my/publishing/[token]/actions";

export function PartnerPublishingPreview({ value }: { value: PublishingProfileInput }) {
  return <div className="partner-org-card publishing-card-preview">
    <div className="partner-org-logo">{value.logoUrl ? <img src={value.logoUrl} alt="" /> : <span>{value.name.slice(0, 1) || "P"}</span>}</div>
    <div className="partner-org-body"><div className="partner-org-title"><h3>{value.name || "파트너 이름"}</h3><span className="badge">{value.field || "분야"}</span></div><p>{value.intro || "파트너를 한 문장으로 소개해주세요."}</p><small>{value.description || "상세 소개가 이곳에 표시됩니다."}</small><span className="text-link">웹사이트 방문 →</span></div>
  </div>;
}
export function CommunityPublishingPreview({ value }: { value: PublishingProfileInput }) {
  return <div className="community-directory-card publishing-card-preview">
    <div className="community-card-head">{value.logoUrl ? <img src={value.logoUrl} alt="" /> : <span className="publishing-logo-placeholder">{value.name.slice(0, 1) || "C"}</span>}<span><i /> 승인된 커뮤니티</span></div>
    <div className="community-directory-copy"><div><h2>{value.name || "커뮤니티 이름"}</h2><span>{value.field || "분야"}</span></div><p>{value.intro || "어떤 사람들이 함께하는 커뮤니티인지 소개해주세요."}</p></div>
    <div className="community-card-stats"><span><b>0</b> Founder</span><span><b>0</b> Brand</span><span><b>0</b> Event</span><strong>커뮤니티 보기 →</strong></div>
  </div>;
}
