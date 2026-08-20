"use client";

import { conciseSeoDescription, cleanSeoSlug, seoScore } from "@/lib/content-seo";

export interface SeoFormValues {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  ogImageUrl: string;
}

export function SeoPublishFields({ values, fallbackTitle, fallbackDescription, fallbackImage, content, path, lockSlug = false, onChange }: {
  values: SeoFormValues;
  fallbackTitle: string;
  fallbackDescription: string;
  fallbackImage?: string;
  content: string;
  path: "brands" | "products";
  lockSlug?: boolean;
  onChange: (patch: Partial<SeoFormValues>) => void;
}) {
  const title = values.seoTitle.trim() || fallbackTitle.trim();
  const description = conciseSeoDescription(values.seoDescription || fallbackDescription);
  const image = values.ogImageUrl || fallbackImage;
  const score = seoScore({ slug: values.slug, title, description, keyword: values.primaryKeyword || fallbackTitle, image, content });
  const tone = score >= 80 ? "ready" : score >= 55 ? "progress" : "start";

  return <details className="seo-publish-panel">
    <summary><span><b>검색 노출 설정</b><small>선택 · 기본값은 자동으로 만들어요</small></span><i className={tone}>{score}점</i></summary>
    <div className="seo-publish-body">
      <div className="seo-search-preview">
        <small>https://www.featable.kr/{path}/{values.slug || "your-url"}</small>
        <strong>{title || "검색 결과 제목"}</strong>
        <p>{description || "검색 결과에 표시될 소개 문장이 여기에 보여요."}</p>
      </div>
      <div className="seo-fields-grid">
        <label><span>페이지 URL *</span><div className="seo-slug-input"><em>/{path}/</em><input disabled={lockSlug} value={values.slug} onChange={(event) => onChange({ slug: cleanSeoSlug(event.target.value) })} placeholder="caramel-lab" /></div><small>{lockSlug ? "공개 URL 보호를 위해 수정할 수 없어요." : "영문 소문자와 숫자, 하이픈만 사용할 수 있어요."}</small></label>
        <label><span>대표 검색어</span><input value={values.primaryKeyword} onChange={(event) => onChange({ primaryKeyword: event.target.value })} placeholder={fallbackTitle} /></label>
        <label className="full"><span>검색 제목 <small>{title.length}/60</small></span><input maxLength={60} value={values.seoTitle} onChange={(event) => onChange({ seoTitle: event.target.value })} placeholder={fallbackTitle} /></label>
        <label className="full"><span>검색 설명 <small>{description.length}/155</small></span><textarea maxLength={165} value={values.seoDescription} onChange={(event) => onChange({ seoDescription: event.target.value })} placeholder={conciseSeoDescription(fallbackDescription)} /></label>
        <label><span>연관 검색어</span><input value={values.secondaryKeywords} onChange={(event) => onChange({ secondaryKeywords: event.target.value })} placeholder="AI 논문, 연구 도구, 논문 작성" /><small>쉼표로 구분해 주세요.</small></label>
        <label><span>공유 이미지 URL</span><input value={values.ogImageUrl} onChange={(event) => onChange({ ogImageUrl: event.target.value })} placeholder="대표 이미지를 자동 사용" /></label>
      </div>
      <p className="seo-score-guide">{score >= 80 ? "검색 노출 준비가 잘 되었어요." : "소개 글과 대표 이미지, 의미 있는 영문 URL을 채우면 점수가 올라가요."}</p>
    </div>
  </details>;
}
