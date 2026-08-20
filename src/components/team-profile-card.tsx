import Link from "next/link";

export interface TeamProfileCardProps {
  name: string;
  title: string;
  avatarUrl?: string | null;
  bio?: string | null;
  label?: string;
  meta?: string;
  href?: string;
  actionLabel?: string;
  muted?: boolean;
}

function CardContent({ name, title, avatarUrl, bio, label = "TEAM", actionLabel, muted }: TeamProfileCardProps) {
  return <>
    <div className="founder-spot-photo team-card-photo">
      {avatarUrl ? <img src={avatarUrl} alt={name} /> : <div className="founder-spot-placeholder" aria-hidden>{name.slice(0, 1) || "T"}</div>}
      <div className="founder-spot-fade" aria-hidden />
      <span className="team-card-label">{label}</span>
    </div>
    <div className="founder-spot-body team-card-body">
      <h3>{name}<span className="founder-spot-verified" title="Featable Team" aria-label="인증된 팀 프로필">✓</span></h3>
      <strong>{title}</strong>
      {bio && <p>{bio}</p>}
      {/* 브랜드명은 카드 위 섹션 헤더에 이미 있어 푸터에서는 상태와 CTA만 보여준다 */}
      <div className="founder-spot-foot">
        <span className={muted ? "team-card-state muted" : "team-card-state"}>{muted ? "비공개" : "공개 중"}</span>
        {actionLabel && <em className="founder-spot-cta">{actionLabel} →</em>}
      </div>
    </div>
  </>;
}

export function TeamProfileCard(props: TeamProfileCardProps) {
  const className = `founder-spot-card team-profile-visual-card${props.muted ? " is-private" : ""}`;
  return props.href
    ? <Link href={props.href} className={className}><CardContent {...props} /></Link>
    : <article className={className}><CardContent {...props} /></article>;
}
