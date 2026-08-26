import Link from "next/link";

export interface TeamProfileCardProps {
  name: string;
  title: string;
  headline?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  label?: string;
  href?: string;
  actionLabel?: string;
  muted?: boolean;
  founderNumber?: number;
}

function CardContent({ name, title, headline, avatarUrl, bio, label = "팀", href, actionLabel, muted, founderNumber }: TeamProfileCardProps) {
  const summary = headline || bio;
  return <>
    <div className="founder-spot-photo team-card-photo">
      {/* Dynamic profile photos keep the existing full-bleed crop. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {avatarUrl ? <img src={avatarUrl} alt={name} /> : <div className="founder-spot-placeholder" aria-hidden>{name.slice(0, 1) || "T"}</div>}
      <div className="founder-spot-fade" aria-hidden />
      <span className="team-card-label">{label}</span>
      {founderNumber != null ? (
        <span className="team-card-founder-id">No.{String(founderNumber).padStart(4, "0")}</span>
      ) : href && <span className="team-card-corner-action" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8" /></svg>
      </span>}
    </div>
    <div className="founder-spot-body team-card-body">
      <h3>{name}<span className="founder-spot-verified" title="Featable Team" aria-label="인증된 팀 프로필">✓</span></h3>
      <strong>{title}</strong>
      {summary && <p>{summary}</p>}
      <div className="founder-spot-foot team-card-foot">
        {href
          ? <><em className="founder-spot-cta">{actionLabel || "프로필 보기"}</em><i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8" /></svg></i></>
          : null}
      </div>
    </div>
  </>;
}

export function TeamProfileCard(props: TeamProfileCardProps) {
  const className = `founder-spot-card dash-team-visual-card${props.muted ? " is-private" : ""}`;
  return props.href
    ? <Link href={props.href} className={className}><CardContent {...props} /></Link>
    : <article className={className}><CardContent {...props} /></article>;
}
