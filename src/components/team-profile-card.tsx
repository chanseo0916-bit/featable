import Link from "next/link";

export interface TeamProfileCardProps {
  name: string;
  title: string;
  headline?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  label?: string;
  meta?: string;
  href?: string;
  actionLabel?: string;
  muted?: boolean;
  founderNumber?: number;
}

function CardContent({ name, title, headline, avatarUrl, bio, label = "TEAM", meta, href, actionLabel, muted, founderNumber }: TeamProfileCardProps) {
  const summary = headline || bio;
  return <>
    <div className="founder-spot-photo team-card-photo">
      {/* Dynamic profile photos keep the existing full-bleed crop. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {avatarUrl ? <img src={avatarUrl} alt={name} /> : <div className="founder-spot-placeholder" aria-hidden>{name.slice(0, 1) || "T"}</div>}
      <div className="founder-spot-fade" aria-hidden />
      <span className="team-card-label">{label}</span>
      {founderNumber != null ? (
        <span className="team-card-founder-id">FOUNDER ID · {String(founderNumber).padStart(4, "0")}</span>
      ) : href && <span className="team-card-corner-action" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8" /></svg>
      </span>}
    </div>
    <div className="founder-spot-body team-card-body">
      <h3>{name}<span className="founder-spot-verified" title="Featable Team" aria-label="인증된 팀 프로필">✓</span></h3>
      <strong>{title}</strong>
      <div className="team-card-chips" aria-label="프로필 분류">
        <span>{label}</span>
        {meta && <span>{meta}</span>}
      </div>
      {summary && <p>{summary}</p>}
      <div className="team-card-facts">
        <span><b>{meta || "Featable"}</b><small>소속</small></span>
        <span><b>{title}</b><small>역할</small></span>
        <span><b className={muted ? "muted" : "active"}>{muted ? "비공개" : "공개"}</b><small>상태</small></span>
      </div>
      <div className="founder-spot-foot team-card-foot">
        {href
          ? <><em className="founder-spot-cta">{actionLabel || "프로필 보기"}</em><i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8" /></svg></i></>
          : <span className={muted ? "team-card-state muted" : "team-card-state"}>{muted ? "비공개 프로필" : "공개 프로필"}</span>}
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
