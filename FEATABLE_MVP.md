# FEATABLE --- MVP Product & Development Spec

> **Every founder deserves to be featured.**

## 1. Product Definition

**Featable**은 초기 창업가의 **제품, 이야기, 기회와 사람을 연결하는
큐레이션 플랫폼**이다.

가장 중요한 브랜드 문장:

> **창업가가 세상에 발견되기 시작하는 곳.**

Featable의 핵심은 단순한 상품 등록이나 랜딩페이지 제작이 아니다.

초기 창업가와 브랜드를 중심으로 아래 정보가 하나의 공개 생태계에
연결된다.

-   Product --- 제품/서비스
-   Feature --- 창업가·브랜드 스토리
-   Mentor --- 인증 멘토와 피드백
-   Event --- 창업/개발 행사
-   Community --- 창업·개발자·크리에이터 커뮤니티
-   Support --- 창업 지원사업
-   Partner --- 함께하는 기관/커뮤니티

### Reference UX

-   **Wadiz** --- 제품 발견, 카드 UI, 상세페이지 스토리텔링
-   **Event-us** --- 행사 탐색, 검색, 카테고리 기반 발견
-   **정부지원사업 플랫폼** --- 지원조건, 대상, 기간, 마감 등 구조화된
    정보

### Featable의 차이

**Wadiz → 제품을 소개해서 펀딩받는다.**

**Featable → 창업가와 제품을 소개해서 발견되게 만든다.**

SEO는 전면 상품이라기보다 공개 콘텐츠가 축적되며 만들어지는 **브랜드
자산**으로 본다.

------------------------------------------------------------------------

# 2. Seven Core Pillars

## 2.1 Product Curation

Wadiz처럼 초기 창업가가 자신의 제품/서비스를 등록한다.

각 Product는 독립적인 공개 URL을 가진다.

포함 정보:

-   대표 이미지
-   제품명
-   브랜드
-   Founder
-   한 줄 소개
-   상세 스토리
-   문제 / 해결 방식
-   주요 특징
-   가격(선택)
-   공식 홈페이지
-   구매/사용 링크
-   관련 Feature
-   Mentor's Note
-   공유

목표:

> **좋은 초기 제품을 발견하는 곳**

------------------------------------------------------------------------

## 2.2 Feature / SEO Content

Founder와 Brand가 입력한 정보를 바탕으로 검색 가능한 콘텐츠를 만든다.

콘텐츠 유형:

-   Founder Interview
-   Brand Story
-   Product Feature
-   Launch Story
-   Update
-   Case Study
-   Q&A

AI가 초안을 생성할 수 있지만 사용자가 검토/수정한 뒤 공개한다.

실제 언론사의 보도인 것처럼 표현하지 않는다.

`기사`보다는 서비스 내부에서는 다음 표현을 우선한다.

-   Feature
-   Story
-   Interview
-   Editorial

각 콘텐츠는 독립 URL을 가진다.

``` text
/features/caramel-lab
/stories/caramel-lab-founder
```

### SEO Foundation

-   고유 title
-   meta description
-   canonical URL
-   Open Graph
-   sitemap.xml
-   robots.txt
-   semantic HTML
-   이미지 alt
-   빠른 로딩
-   SSR/SSG
-   구조화된 내부 링크
-   Brand ↔ Founder ↔ Product ↔ Feature 연결

**SEO 순위나 백링크 효과 자체를 보장하지 않는다.**

------------------------------------------------------------------------

## 2.3 Mentor Badge & Mentor Comments

Featable이 인증한 전문가에게 **Mentor Badge**를 부여한다.

예:

``` text
✓ FEATABLE MENTOR

김OO
Branding · 前 OOO
```

Mentor는 Product / Brand 페이지에 공개 피드백을 남길 수 있다.

### Mentor's Note

``` text
MENTOR'S NOTE

김OO · Marketing

“이 제품은 타깃 고객에게 전달되는 첫 메시지를
조금 더 좁히면 훨씬 강해질 것 같습니다.”
```

일반 댓글과 Mentor Comment를 UI에서 명확하게 구분한다.

향후 확장:

-   멘토 프로필
-   전문분야
-   멘토 팔로우
-   1:1 멘토링
-   전문가 연결
-   유료 멘토링
-   Office Hours

------------------------------------------------------------------------

## 2.4 Event Curation

창업가·개발자·크리에이터가 관심 가질 행사를 큐레이션한다.

예:

-   데모데이
-   밋업
-   컨퍼런스
-   네트워킹
-   해커톤
-   세미나
-   창업 교육
-   개발자 행사
-   IR 행사

Event 정보:

-   행사명
-   주최자
-   대표 이미지
-   일시
-   장소 / 온라인
-   참가비
-   신청 마감
-   카테고리
-   대상
-   신청 링크
-   관련 Community
-   관련 Brand

향후 BM:

-   Sponsored Event
-   행사 상단 노출
-   행사 광고
-   주최기관 패키지

------------------------------------------------------------------------

## 2.5 Community

창업·개발·디자인·크리에이터 커뮤니티가 Featable에 공식 입점할 수 있다.

각 Community는 독립적인 Profile을 가진다.

``` text
/communities/community-name
```

Community Profile:

-   로고
-   이름
-   소개
-   분야
-   공식 링크
-   SNS
-   운영자
-   관련 Founder
-   관련 Brand
-   관련 Event
-   관련 Feature

### Community 역할

단순 링크 디렉터리가 아니다.

커뮤니티를 중심으로:

``` text
Community
   ↓
Founders
   ↓
Brands
   ↓
Products
   ↓
Events
```

가 연결되는 구조를 목표로 한다.

------------------------------------------------------------------------

## 2.6 Startup Support Programs

정부·지자체·대기업·AC·VC·대학 등의 창업지원 정보를 큐레이션한다.

정보 구조:

-   사업명
-   주관기관
-   모집 대상
-   지원 내용
-   지원 규모
-   모집 기간
-   마감일
-   지역
-   업력 조건
-   분야
-   공식 공고 링크
-   상태

상태 예:

``` text
모집중
마감임박
마감
상시모집
```

검색 / 필터:

-   지역
-   업력
-   분야
-   대상
-   모집 상태
-   마감일

향후 개인화:

> **내 브랜드가 지원할 만한 사업**

------------------------------------------------------------------------

## 2.7 Partners / Community Footer

Featable과 공식적으로 함께하는 커뮤니티·기관·파트너를 노출한다.

Footer 예:

``` text
함께하는 커뮤니티

[LOGO] [LOGO] [LOGO] [LOGO]
```

각 로고는:

-   Community Profile
-   Partner Page
-   공식 홈페이지

중 적절한 대상으로 연결한다.

단순 장식이 아니라 **Featable 생태계의 Social Proof** 역할을 한다.

------------------------------------------------------------------------

# 3. Core Data Model

초기 DB는 확장을 고려해 다음 객체를 중심으로 설계한다.

``` text
User
│
├── Founder
│     ├── Brand
│     │    ├── Product
│     │    ├── Feature
│     │    ├── Job
│     │    └── Event
│     │
│     └── Community
│
├── Mentor
│     └── MentorComment
│
├── Community
│     ├── Founder
│     ├── Brand
│     └── Event
│
├── Event
│
├── SupportProgram
│
└── Partner
```

핵심 관계:

``` text
Founder → Brand
Brand → Products
Brand → Features
Founder → Features
Mentor → MentorComments
Community ↔ Founders
Community ↔ Brands
Community ↔ Events
SupportProgram → External Application URL
Partner → Community / External URL
```

------------------------------------------------------------------------

# 4. Information Architecture

``` text
HOME
│
├── Products
│    └── Product Detail
│
├── Brands
│    └── Brand Detail
│
├── Founders
│    └── Founder Profile
│
├── Features
│    └── Feature Detail
│
├── Events
│    └── Event Detail
│
├── Support
│    └── Support Detail
│
├── Communities
│    └── Community Profile
│
├── Mentors
│    └── Mentor Profile
│
├── Jobs
│
├── Search
│
├── Submit Brand
│
└── My Featable
```

------------------------------------------------------------------------

# 5. Global Navigation

초기안:

``` text
FEATABLE

프로덕트
스토리
행사
지원사업
커뮤니티
멘토

[검색 🔍]

[로그인]
[+ 브랜드 등록]
```

MVP에서 너무 많은 메뉴가 부담되면:

``` text
FEATABLE

프로덕트
스토리
행사
지원사업
더보기⌄

[검색]
[브랜드 등록]
```

`더보기` 안에:

-   창업가
-   커뮤니티
-   멘토
-   채용

을 넣는다.

------------------------------------------------------------------------

# 6. Home

홈은 회사소개 랜딩이 아니다.

**들어오자마자 콘텐츠를 발견하는 탐색 화면**이다.

사용자가 3초 안에:

> "새로운 스타트업과 제품을 발견하는 곳이구나."

라고 이해해야 한다.

Founder는 동시에:

> "우리 브랜드도 여기 올릴 수 있네."

라고 느껴야 한다.

## 6.1 Search

``` text
어떤 브랜드를 찾고 있나요?

[ 브랜드 · 창업가 · 제품 · 지원사업 검색          🔍 ]
```

## 6.2 Quick Categories

``` text
AI
SaaS
F&B
패션
뷰티
콘텐츠
커머스
라이프스타일
교육
개발
기타
```

## 6.3 Main Feature

에디토리얼 Hero.

``` text
THIS WEEK'S FEATURE

대학생 때 시작해
6개월 만에 1만 사용자를 만든 창업가

김OO · CARAMEL LAB

[이야기 보기]
```

## 6.4 Trending Products

Wadiz 스타일 이미지 카드.

``` text
[IMAGE]

제품명
브랜드명

AI · SaaS

김OO Founder
```

## 6.5 New Brands

최근 등록 브랜드.

## 6.6 Founder Stories

사람 중심 콘텐츠.

## 6.7 Events

Event-us 스타일 카드.

``` text
[IMAGE]

행사명
날짜 · 장소
주최기관

[신청하기]
```

## 6.8 Support Programs

정보 중심 리스트.

``` text
D-3

2026 초기창업패키지
창업진흥원

전국 · 3년 미만
최대 OOO만원
```

## 6.9 Communities

추천 커뮤니티.

## 6.10 Jobs

초기 스타트업 채용.

## 6.11 Partners

페이지 하단:

``` text
함께하는 커뮤니티

[LOGO] [LOGO] [LOGO] [LOGO]
```

## 6.12 Final CTA

``` text
당신의 브랜드도
세상에 소개될 준비가 되었나요?

[브랜드 등록하기]
```

------------------------------------------------------------------------

# 7. Brand Detail --- Core Hub

Featable에서 가장 중요한 페이지.

``` text
/brands/caramel-lab
```

브랜드 상세가 모든 콘텐츠의 Hub가 된다.

## Header

-   로고
-   브랜드명
-   한 줄 소개
-   Founder
-   카테고리
-   홈페이지
-   SNS
-   공유
-   관심

## Navigation

``` text
소개
프로덕트
Founder
Story
Mentor's Note
Jobs
```

## Brand Overview

-   브랜드 소개
-   해결하는 문제
-   대상 고객
-   설립 정보
-   팀
-   링크

## Products

등록 제품/서비스.

## Founder

Founder Story와 프로필.

## Feature

브랜드 관련 Story / Interview.

## Mentor's Note

인증 멘토 피드백.

## Jobs

채용 중일 경우 노출.

------------------------------------------------------------------------

# 8. Product Detail

Wadiz의 상세페이지 경험을 참고한다.

목표:

> **상품을 팔기 전에 상품과 만든 사람을 이해하게 한다.**

구조:

``` text
Hero Image

Product Name
Brand
Founder

한 줄 소개

[공식 사이트 / 구매하기]
[공유]

-----------------

왜 만들었나요?

Product Story

Images

문제

Solution

Features

Founder

Mentor's Note

관련 Story

관련 Product
```

------------------------------------------------------------------------

# 9. Brand Registration

Wadiz처럼 단계식 등록.

``` text
STEP 1  기본정보
STEP 2  Founder
STEP 3  Brand
STEP 4  Product
STEP 5  이미지
STEP 6  AI Feature
STEP 7  미리보기
STEP 8  공개
```

### AI Feature

Founder가 몇 가지 질문에 답한다.

예:

-   무엇을 만들고 있나요?
-   왜 시작했나요?
-   누구를 위한 제품인가요?
-   기존 방식과 무엇이 다른가요?
-   지금 가장 알리고 싶은 것은 무엇인가요?

AI 생성:

-   한 줄 소개
-   Brand Introduction
-   Founder Story
-   Product Description
-   FAQ
-   Feature 초안
-   SNS 공유문구

모든 결과는 사용자가 수정할 수 있다.

------------------------------------------------------------------------

# 10. Viral Loop

초기 성장 엔진은 기존 Founder 콘텐츠와 등록자의 자기 공유다.

``` text
Youth Founders Club 콘텐츠
        ↓
Founder 소개
        ↓
Featable Feature
        ↓
Brand / Product Detail
        ↓
“우리 브랜드도 등록하고 싶다”
        ↓
무료 등록
        ↓
Founder가 자기 페이지 공유
        ↓
새로운 방문자
        ↓
새로운 Founder
```

중요한 Product Question:

> **Founder가 자기 Featable 페이지를 자랑스럽게 공유할 것인가?**

YES가 되어야 한다.

------------------------------------------------------------------------

# 11. User Roles

## Visitor

-   탐색
-   검색
-   브랜드/제품 조회
-   Story 읽기
-   행사/지원사업 확인
-   공유
-   외부 링크 이동

## Founder / Brand Owner

-   브랜드 등록
-   Founder Profile
-   Product 등록
-   Feature 생성
-   수정
-   공개
-   채용 등록
-   기본 Analytics

## Mentor

Founder 기능 +

-   Mentor Badge
-   전문 분야
-   Mentor Comment
-   Mentor Profile

## Community Manager

-   Community Profile 관리
-   행사 등록
-   관련 Founder / Brand 연결

## Admin

-   콘텐츠 검수
-   Featured 선정
-   Mentor 인증
-   Community 승인
-   Support Program 관리
-   Event 관리
-   Partner Logo 관리
-   신고/숨김
-   카테고리 관리

------------------------------------------------------------------------

# 12. MVP Scope

## P0 --- 반드시 개발

-   [ ] 회원가입 / 로그인
-   [ ] Founder Profile
-   [ ] Brand CRUD
-   [ ] Product CRUD
-   [ ] 이미지 업로드
-   [ ] 공개 / 비공개
-   [ ] Brand Detail
-   [ ] Product Detail
-   [ ] Home
-   [ ] Product Feed
-   [ ] Search
-   [ ] Category
-   [ ] Feature / Story
-   [ ] AI Feature 초안 생성
-   [ ] 관리자 Featured 지정
-   [ ] Event List
-   [ ] Support Program List
-   [ ] Community Profile
-   [ ] Partner Logo Footer
-   [ ] 공유
-   [ ] 조회수
-   [ ] 기본 SEO

## P1 --- 빠르게 추가

-   [ ] Mentor Profile
-   [ ] Mentor Badge
-   [ ] Mentor Comment
-   [ ] Event Detail
-   [ ] Support Detail
-   [ ] Community 입점 신청
-   [ ] Founder Detail
-   [ ] Jobs
-   [ ] 관심 / 저장
-   [ ] 관련 콘텐츠 추천

## P2 --- 검증 후

-   [ ] 일반 댓글
-   [ ] 팔로우
-   [ ] DM
-   [ ] 개인화 추천
-   [ ] AI 지원사업 추천
-   [ ] 유료 멘토링
-   [ ] 고급 Analytics
-   [ ] 광고 셀프서브
-   [ ] B2B Dashboard
-   [ ] Premium AI
-   [ ] SEO Dashboard

------------------------------------------------------------------------

# 13. Business Model

초기 등록은 **무료**.

초기 목표는 좋은 Founder / Brand / Product 공급을 확보하는 것.

## Advertising

주요 초기 BM 후보.

광고 고객:

-   창업지원기관
-   정부/지자체
-   대기업
-   SaaS
-   금융
-   개발툴
-   교육
-   행사
-   AC / VC

상품:

-   홈 배너
-   카테고리 Sponsor
-   Featured Sponsor
-   Sponsored Event
-   Sponsored Support Program
-   Newsletter Sponsor

## Featured Placement

-   추천 Product
-   추천 Brand
-   카테고리 상단
-   검색 Featured

광고임을 명확하게 표시한다.

## Jobs

-   채용 공고
-   Featured Job
-   채용 패키지
-   향후 Talent Matching

## Events

-   행사 홍보
-   상단 노출
-   Sponsored Event
-   기관 패키지

## Community / Partner

-   공식 Community Page
-   Partner Program
-   공동 캠페인
-   공동 행사

## B2B

고객:

-   액셀러레이터
-   대학
-   창업지원기관
-   대기업 오픈이노베이션
-   지자체

상품:

> **우리 포트폴리오 Founder들을 Featable에서 Showcase**

## Premium AI

기본 AI는 무료.

향후 유료:

-   고급 Brand Story
-   Interview
-   보도자료 초안
-   SNS 콘텐츠
-   Founder Bio
-   Investor Introduction
-   Brand Kit

## Mentoring

장기 옵션:

-   1:1 Mentor Session
-   Office Hours
-   Expert Matching
-   Mentor Package

------------------------------------------------------------------------

# 14. Revenue Flywheel

``` text
좋은 Founder 유입
      ↓
좋은 Product 증가
      ↓
볼거리 증가
      ↓
Traffic 증가
      ↓
Community / Mentor 참여
      ↓
신뢰도 증가
      ↓
더 좋은 Founder 유입
      ↓
광고 / 채용 / 행사 / B2B 매출
```

즉 광고를 먼저 만드는 것이 아니라 **Founder 공급과 Discovery를 먼저
만든다.**

------------------------------------------------------------------------

# 15. SEO Structure

각 객체가 독립 URL을 가진다.

``` text
/brands/{slug}
/founders/{slug}
/products/{slug}
/features/{slug}
/events/{slug}
/support/{slug}
/communities/{slug}
/mentors/{slug}
/jobs/{slug}
```

내부 링크 구조:

``` text
Founder
 ↕
Brand
 ↕
Product
 ↕
Feature
 ↕
Community
```

검색엔진뿐 아니라 사용자가 계속 다음 콘텐츠를 발견할 수 있게 설계한다.

------------------------------------------------------------------------

# 16. Development Roadmap

## Phase 1 --- Supply

> 브랜드를 등록하고 공개한다.

1.  Auth
2.  User
3.  Founder
4.  Brand
5.  Product
6.  Image
7.  Publish
8.  Public URL

## Phase 2 --- Discovery

> 사람들이 새로운 브랜드를 발견한다.

1.  Home
2.  Product Feed
3.  Brand Feed
4.  Search
5.  Category
6.  Featured
7.  Related Content
8.  Share

## Phase 3 --- Content

> 브랜드 하나가 검색 가능한 콘텐츠 자산을 만든다.

1.  Feature
2.  AI generation
3.  Founder Interview
4.  Edit
5.  Publish
6.  SEO

## Phase 4 --- Ecosystem

1.  Events
2.  Support Programs
3.  Communities
4.  Partner Footer
5.  Mentors
6.  Mentor Comments
7.  Jobs

## Phase 5 --- Monetization

1.  Sponsored Feature
2.  Advertising
3.  Jobs
4.  Sponsored Event
5.  Community / Partner
6.  B2B
7.  Premium AI

------------------------------------------------------------------------

# 17. First End-to-End Build

**다른 기능보다 이것부터 완성한다.**

``` text
회원가입
   ↓
Founder 생성
   ↓
Brand 등록
   ↓
Product 등록
   ↓
이미지 등록
   ↓
AI 소개 생성
   ↓
미리보기
   ↓
Publish
   ↓
고유 URL 생성
   ↓
홈 Product Feed 노출
   ↓
공유
```

이 플로우가 안정적으로 돌아간 뒤 Event / Support / Mentor / Community
기능을 붙인다.

------------------------------------------------------------------------

# 18. Product Principles

### Principle 1

**Founder First.**

제품 뒤에 있는 사람을 보여준다.

### Principle 2

**Discovery First.**

홈페이지는 설명하는 곳이 아니라 발견하는 곳이다.

### Principle 3

**Publishing should be easy.**

초기 창업가가 10\~15분 안에 자신의 브랜드를 공개할 수 있어야 한다.

### Principle 4

**Every page is an asset.**

Brand / Founder / Product / Feature 페이지는 공유·검색 가능한 공개
자산이다.

### Principle 5

**Connect the ecosystem.**

제품만 보여주지 않는다.

``` text
Founder
Product
Mentor
Community
Event
Support
Job
```

을 연결한다.

------------------------------------------------------------------------

# 19. Final Product Definition

> **Featable은 초기 창업가의 제품, 이야기, 기회와 사람을 연결하는
> 큐레이션 플랫폼이다.**

사용자에게는 더 간단하게:

> **창업가가 세상에 발견되기 시작하는 곳.**

영문 브랜드 메시지:

> **Every founder deserves to be featured.**

------------------------------------------------------------------------

# 20. MVP Decision Rule

새로운 기능 아이디어가 나올 때마다 세 가지를 확인한다.

``` text
1. 더 좋은 Founder/Brand가 등록되는가?
2. 등록된 Founder/Product를 더 잘 발견하게 하는가?
3. Founder가 자신의 Featable 페이지를 더 공유하고 싶어지는가?
```

셋 중 어느 것에도 해당하지 않으면 **MVP에서는 만들지 않는다.**
