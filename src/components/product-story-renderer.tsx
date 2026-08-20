import type { StoryBlock } from "@/lib/types";
import Image from "next/image";

export function ProductStoryRenderer({
  brandName,
  name,
  tagline,
  heroUrl,
  story,
  compact = false,
}: {
  brandName?: string;
  name: string;
  tagline: string;
  heroUrl?: string;
  story: StoryBlock[];
  compact?: boolean;
}) {
  return <div className={`product-story-renderer${compact ? " compact" : ""}`}>
    <header className="product-story-cover">
      {heroUrl ? <Image src={heroUrl} alt={name} fill sizes="100vw" preload /> : <div className="product-story-placeholder">대표 이미지</div>}
      <div><span>{brandName || "BRAND"}</span><h2>{name || "프로덕트 이름"}</h2><p>{tagline || "한 줄 소개가 여기에 표시됩니다."}</p></div>
    </header>
    {story.map((block, index) => {
      if (block.type === "text") {
        return (
          <section className={`product-story-copy${block.tone === "highlight" ? " highlight" : ""}`} key={`text-${index}`}>
            <small>{String(index + 1).padStart(2, "0")}</small>
            {block.heading && <h3>{block.heading}</h3>}
            <p>{block.body}</p>
          </section>
        );
      }
      if (block.type === "image") {
        return (
          <figure className={`product-story-visual${block.frame === "phone" ? " phone-frame" : ""}`} key={`image-${index}`}>
            {block.src ? (
              block.frame === "phone" ? (
                <div className="product-story-phone"><Image src={block.src} alt={block.alt || name} fill sizes="(max-width: 700px) 230px, 300px" /></div>
              ) : (
                <Image src={block.src} alt={block.alt || name} width={1200} height={1500} sizes="(max-width: 700px) 100vw, 900px" />
              )
            ) : (
              <div className="product-story-placeholder">상세 이미지</div>
            )}
            {block.caption && <figcaption>{block.caption}</figcaption>}
          </figure>
        );
      }
      return (
        <section className={`product-story-features${block.tone === "highlight" ? " highlight" : ""}`} key={`features-${index}`}>
          {block.heading && <h3>{block.heading}</h3>}
          <div className="product-story-features-list">
            {block.items.map((item, itemIndex) => (
              <div className="product-story-feature-item" key={itemIndex}>
                <i>{String(itemIndex + 1).padStart(2, "0")}</i>
                <div><strong>{item.title}</strong><p>{item.body}</p></div>
              </div>
            ))}
          </div>
        </section>
      );
    })}
    {story.length === 0 && <div className="product-story-empty-public"><strong>상세페이지 준비 중</strong><p>프로덕트에 대한 자세한 내용이 곧 등록됩니다.</p></div>}
  </div>;
}
