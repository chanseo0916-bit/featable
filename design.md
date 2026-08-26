# Featable 디자인 시스템

기준: **SEED Design(당근)** 을 색상·타이포·radius 토큰의 소스로, **TDS (Toss Design System)** 를 상호작용 컴포넌트와 상태·반응 UX 원칙의 소스로 병행한다.

- SEED: https://seed-design.io/components
- TDS: https://developers-apps-in-toss.toss.im/design/components

**자산 사용 제한:** 위 참조는 디자인 원칙·패턴·토큰 스케일 학습용이다. TDS Figma UI Kit, 아이콘, 이미지, 폰트, 로고, 컴포넌트 코드(`@toss/*`)는 직접 복제·이식하지 않는다. 해당 자산은 앱인토스 목적 외 사용이 제한되며, 예외적으로 코드 패키지(MIT)를 쓰더라도 저작권·LICENSE 고지와 토스 브랜드 자산 분리를 준수해야 한다.

## 원칙

1. 색상·크기·두께는 토큰으로만 쓴다. 하드코딩 금지.
2. 카드는 `EntityCard`(image/row/text) 3레이아웃으로만 만든다.
3. hover 이펙트 없음 — 그림자·zoom·border 변화 전부 없음 (2026-08-24 사용자 확정).
4. 커머스 요소(가격 노출, 판매 문구)를 발견 플로우에 넣지 않는다.
5. 영어 대문자 오버라벨(eyebrow/MY SUBMISSIONS·PARTNER PUBLISHING·SELF-SERVE 등) 금지.
   불필요한 섹션 라벨·설명 문구는 제거하고, 남기려면 한국어 짧은 서브타이틀만 사용.

## 상호작용 원칙 (TDS)

TDS는 반복되는 사용 패턴을 명시적 변형(component variant)로 패턴화하고, 간격·계층·크기·시각 디테일을 정련하며, 모든 사용자의 가독성·인지·접근성을 보호하도록 요구한다. Featable에 적용하는 축약 규칙:

- 발생하는 액션은 Primary/Secondary만 사용하고, 파괴적 액션만 Danger로 한정한다.
- FAB(떠 있는 주요 액션)는 화면당 1개, Bottom Sheet는 하단 시트 계열(등록/선택), Toast/Snackbar는 짧은 상태 안내로만 쓴다.
- 선택지가 3개 이상이면 라디오·세그먼트 대신 리스트 선택지(Bottom Sheet)를 우선한다.
- 카드 내부 버튼은 라벨 없이 아이콘+힌트로, 별도 동작이 필요하면 아이콘 버튼에 툴팁을 달아야 한다.

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
