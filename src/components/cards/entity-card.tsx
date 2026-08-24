import Link from "next/link";
import { Badge, ImageCard } from "@/components/site-shell";

type EntityCardBase = {
  href: string;
  className?: string;
};

type ImageEntityCard = EntityCardBase & {
  layout: "image";
  media: string;
  mediaAlt: string;
  /** 이미지 가로세로 비율 (기본 1.5) */
  ratio?: number;
  /** 이미지 위 오버레이 라벨 (예: "Featable 선정") */
  mediaOverlay?: React.ReactNode;
  /** 메타 줄 맨 앞 텍스트 (예: 행사 날짜) */
  metaLead?: React.ReactNode;
  metaBadge?: React.ReactNode;
  metaText?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
};

type RowEntityCard = EntityCardBase & {
  layout: "row";
  logo: string | null;
  logoAlt?: string;
  title: React.ReactNode;
  badge?: React.ReactNode;
  description?: React.ReactNode;
};

type TextEntityCard = EntityCardBase & {
  layout: "text";
  top?: React.ReactNode;
  topRight?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** 제목 아래 작은 소제목 (예: 주관기관) */
  subtitle?: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
};

export type EntityCardProps = ImageEntityCard | RowEntityCard | TextEntityCard;

/**
 * 모든 목록 카드의 단일 진입점. DESIGN.md 규칙(뱃지는 제목 옆 한 곳,
 * hover 그림자만, 숫자 메타 없음)이 여기서 강제된다.
 */
export function EntityCard(props: EntityCardProps) {
  const { href, className = "" } = props;

  if (props.layout === "image") {
    const {
      ratio = 1.5, media, mediaAlt, mediaOverlay, metaLead,
      metaBadge, metaText, title, description,
    } = props;
    return (
      <Link
        href={href}
        className={`entity-card is-image ${className}`}
        style={{ "--card-ratio": ratio } as React.CSSProperties}
      >
        <div className="entity-card-media">
          <ImageCard src={media} alt={mediaAlt} />
          {mediaOverlay && <span className="entity-card-overlay">{mediaOverlay}</span>}
        </div>
        <div className="entity-card-body">
          {(metaLead || metaBadge || metaText) && (
            <div className="entity-card-meta">
              {metaLead}
              {metaBadge}
              {metaText && <span>{metaText}</span>}
            </div>
          )}
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </Link>
    );
  }

  if (props.layout === "row") {
    const { logo, logoAlt = "", title, badge, description } = props;
    return (
      <Link href={href} className={`entity-card is-row ${className}`}>
        {logo ? (
          <img className="entity-card-logo" src={logo} alt={logoAlt} />
        ) : (
          <span className="entity-card-logo">{titleText(title).slice(0, 1) || "·"}</span>
        )}
        <div className="entity-card-copy">
          <h3>{title}{badge}</h3>
          {description && <p>{description}</p>}
        </div>
        <span className="arrow">→</span>
      </Link>
    );
  }

  const { top, topRight, title, subtitle, description, footerLeft, footerRight } = props;
  return (
    <Link href={href} className={`entity-card is-text ${className}`}>
      {(top || topRight) && (
        <div className="entity-card-top">
          {top}
          {topRight && <strong>{topRight}</strong>}
        </div>
      )}
      <h3>{title}</h3>
      {subtitle && <p className="entity-card-subtitle">{subtitle}</p>}
      {description && <p className="entity-card-desc">{description}</p>}
      {(footerLeft || footerRight) && (
        <div className="entity-card-footer">
          <span>{footerLeft}</span>
          <span>{footerRight}</span>
        </div>
      )}
    </Link>
  );
}

function titleText(node: React.ReactNode): string {
  return typeof node === "string" ? node : "";
}

export { Badge };
