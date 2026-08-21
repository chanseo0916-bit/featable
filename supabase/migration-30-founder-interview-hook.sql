-- 파운더 인터뷰(훅 카드)용 컬럼: "03년생, 24살" 같은 첫 줄 훅.
-- 인터뷰 포스트는 features 테이블의 kind='interview' 행을 그대로 사용한다.
--   1줄(hook_intro) = "03년생, 24살"
--   2줄(title)      = "연구용 AI 스타트업 대표"
--   3줄(파생)       = <브랜드명 파운더이름> — brands/founders 조인으로 렌더링
alter table public.features add column if not exists hook_intro text;

comment on column public.features.hook_intro is '인터뷰 훅 카드 1줄 (예: 03년생, 24살). kind=interview에서만 사용.';
