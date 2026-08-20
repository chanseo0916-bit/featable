"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";

type ProductGalleryProps = {
  name: string;
  heroUrl: string;
  images: string[];
};

export function ProductGallery({ name, heroUrl, images }: ProductGalleryProps) {
  const galleryImages = useMemo(() => Array.from(new Set([heroUrl, ...images].filter(Boolean))), [heroUrl, images]);
  const [selectedImage, setSelectedImage] = useState(heroUrl);

  return (
    <div className="commerce-gallery">
      <Image className="commerce-hero-image" src={selectedImage} alt={`${name} 대표 이미지`} width={1200} height={1154} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 60vw, 650px" preload={selectedImage === heroUrl} />
      <div className="commerce-thumbs" role="group" aria-label={`${name} 이미지 선택`}>
        {galleryImages.map((src, index) => {
          const isSelected = selectedImage === src;
          return (
            <button
              className={isSelected ? "active" : ""}
              key={src}
              type="button"
              aria-label={`${name} ${index === 0 ? "대표 이미지" : `상세 이미지 ${index}`}`}
              aria-current={isSelected ? "true" : undefined}
              onClick={() => setSelectedImage(src)}
            >
              <Image src={src} alt="" aria-hidden="true" width={144} height={144} sizes="72px" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FavoriteButton({ slug }: { slug: string }) {
  const storageKey = `featable:product-favorite:${slug}`;
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener("featable:favorite-change", onStoreChange);
    return () => {
      window.removeEventListener("storage", onStoreChange);
      window.removeEventListener("featable:favorite-change", onStoreChange);
    };
  }, []);
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  }, [storageKey]);
  const isFavorite = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function toggleFavorite() {
    const next = !isFavorite;
    try {
      window.localStorage.setItem(storageKey, String(next));
      window.dispatchEvent(new Event("featable:favorite-change"));
    } catch {
      // Storage can be unavailable in private browsing; the button remains safe to use.
    }
  }

  return (
    <button
      className={`product-favorite${isFavorite ? " is-favorite" : ""}`}
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "관심 제품에서 제거" : "관심 제품에 추가"}
      onClick={toggleFavorite}
    >
      <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
    </button>
  );
}
