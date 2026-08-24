# Featable 디자인 시스템

기준: **SEED Design(당근)** — seed-design.io. 토스의 면 기반 카드와 절제된 모션을 보조 참고로 사용한다.

## 원칙

1. 색상·크기·두께는 토큰으로만 쓴다. 하드코딩 금지.
2. 카드는 `EntityCard`(image/row/text) 3레이아웃으로만 만든다.
3. hover 이펙트 없음 — 그림자·zoom·border 변화 전부 없음 (2026-08-24 사용자 확정).
4. 커머스 요소(가격 노출, 판매 문구)를 발견 플로우에 넣지 않는다.

## 색상 토큰 (globals.css :root)

### 팔레트 — SEED 공식 값
- `--gray-100`~`--gray-1000`: #f7f8f9 → #1a1c20
- `--carrot-100`~`--carrot-900`: accent 계열 (#ff6600 중심)
- 상태: `--success`/`--warning`/`--error` + 각 `-bg`

### Semantic
| 토큰 | 참조 | 용도 |
|---|---|---|
| `--surface` | gray-100 | 페이지 배경, 검색박스, 칩 |
| `--border` | gray-400 | 구분선 |
| `--fg-strong` | gray-1000 | 제목·강조 |
| `--fg-default` | gray-900 | 본문 |
| `--fg-muted` | gray-700 | 보조 설명 |
| `--fg-subtle` | gray-600 | 메타·최소 정보 |
| `--accent` | carrot-600 | Primary CTA, 강조 |

새 색상 필요 시 위 토큰에서 선택. 알파 블렌딩은 `color-mix(in srgb, var(--token) N%, transparent)`.

## 타이포 (SEED 스케일)

- 크기: `--fs-t1`(12) ~ `--fs-t12`(48). 반톤(12.5px 등) 금지.
- 두께: **400 / 500 / 700** 3종만.
- 자간: 헤드라인 -.03em, 본문 -.01em.
- 라벨은 굵은 대문자 대신 조용한 회색 텍스트.

## 버튼 (SEED Box Button)

| variant | 클래스 | 모양 |
|---|---|---|
| Primary | `.button` | carrot solid + 흰 bold 라벨. 화면당 1~2개 제한 |
| Secondary | `.button-secondary` | 흰 면 + 테두리. 서브 액션 |
| Danger | `.button-danger` | 빨강 solid. 파괴적 액션 |

크기: `.button`(54px) / `.button-small`(44px) / `.button-xsmall`(36px).
라벨은 1줄, suffix는 chevron(→)만. hover 시각 변형 없음.

## radius

`--radius-xs`(4) / `sm`(6) / `md`(8) / `lg`(12) / `xl`(16) / `2xl`(20). 카드 표준 = lg(12).

## 카드

모든 목록 카드는 `src/components/cards/entity-card.tsx`:

- **image**: 프로덕트·스토리·행사. 비율은 `ratio` prop(CSS 변수 전달).
- **row**: 브랜드·커뮤니티·파트너. 로고+이름+뱃지+설명 1줄+화살표.
- **text**: 지원사업 등 이미지 없는 카드. D-day/주관기관/마감 footer.

뱃지는 제목 옆 한 곳. 조회수 등 숫자 메타 슬롯 없음.
주요 파트너(`featured`)만 carrot-soft 그라데이션 배경으로 등급 구분.

## 파일 구조

```
src/app/globals.css      토큰 · 리셋 · 공통(버튼/뱃지/헤더/푸터)
src/styles/*.css         도메인별 (event/support/community/partner/admin/
                         founder/product-detail/home/submit-forms)
src/components/cards/    EntityCard 컴포넌트+스타일
scripts/split-globals-css.py  도메인 분리 스크립트 (재실행 가능)
```
