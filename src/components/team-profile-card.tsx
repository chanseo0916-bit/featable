import Link from "next/link";
import { Badge } from "@/components/badge";

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

function CardContent({ name, title, headline, avatarUrl, bio, label = "팀", meta, href, actionLabel, muted }: TeamProfileCardProps) {
  const summary = headline || bio;
  return <>
    <div className="founder-spot-photo team-card-photo">
      {/* Dynamic profile photos keep the existing full-bleed crop. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {avatarUrl ? <img src={avatarUrl} alt={name} /> : <div className="founder-spot-placeholder" aria-hidden>{name.slice(0, 1) || "T"}</div>}
      <div className="founder-spot-fade" aria-hidden />
      {href && <span className="team-card-corner-action" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8" /></svg>
      </span>}
    </div>
    <div className="founder-spot-body team-card-body">
      <div className="team-card-head">
        <h3>{name}<span className="founder-spot-verified" title="Featable Team" aria-label="인증된 팀 프로필">✓</span></h3>
        <span className="team-card-label">{label}</span>
      </div>
      <strong>{title}</strong>
      {meta && <div className="team-card-chips" aria-label="프로필 분류"><span>{meta}</span></div>}
      {summary && <p>{summary}</p>}
      <div className="team-card-facts">
        <span><b>{meta || "Featable"}</b><small>소속</small></span>
        <span><b>{title}</b><small>역할</small></span>
        <span><Badge tone={muted ? "neutral" : "positive"}>{muted ? "비공개" : "공개"}</Badge><small>상태</small></span>
      </div>
      <div className="founder-spot-foot team-card-foot">
        {href
          ? <><em className="founder-spot-cta">{actionLabel || "프로필 보기"}</em><i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8" /></svg></i></>
          : <Badge tone={muted ? "neutral" : "positive"} size="large">{muted ? "비공개 프로필" : "공개 프로필"}</Badge>}
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
