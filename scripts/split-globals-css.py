"""
globals.css를 도메인별 CSS 파일로 분리하는 스크립트.

전략:
- 규칙 단위(셀렉터 { ... })로 파싱해 해당 도메인 파일로 추출.
- @media 블록은 내부 셀렉터가 모두 한 도메인일 때만 통째로 이동.
- 콤마 셀렉터가 도메인과 공통을 섞고 있으면 이동하지 않는다 (안전 우선).
- 공통 셀렉터(.button, .badge 등)는 보호 목록으로 유지.

사용: python scripts/split-globals-css.py
실행 전 백업: cp src/app/globals.css /tmp/globals-backup.css
"""
import re
import os
import sys

SRC = "src/app/globals.css"
OUT_DIR = "src/styles"

DOMAINS = {
    "event": [r"\.event-", r"\.event\b", r"\.events"],
    "support": [r"\.support-", r"\.support\b", r"\.bizinfo"],
    "community": [r"\.community-"],
}

COMMON_PROTECT = [
    r"^\.button", r"^\.badge", r"^\.eyebrow", r"^\.shell",
    r"^\.section", r"^\.avatar", r"^\.arrow", r"^\.text-link",
    r"^\.image-card", r"^\.entity-card", r"^\.filter-chips",
]


def is_protected(sel: str) -> bool:
    return any(re.search(p, sel) for p in COMMON_PROTECT)


def match_domain(sel: str):
    for domain, patterns in DOMAINS.items():
        if any(re.search(p, sel) for p in patterns):
            return domain
    return None


def split_top_level(css: str):
    """최상위 블록 (주석 포함) 리스트 반환: [텍스트, ...]"""
    pieces = []
    i = 0
    n = len(css)
    while i < n:
        # 주석 수집
        m = re.compile(r"/\*.*?\*/", re.S).search(css, i)
        brace = css.find("{", i)
        if m and (brace == -1 or m.start() < brace):
            if m.start() > i:
                before = css[i:m.end()]
                pieces.append(before)
            i = m.end()
            continue
        if brace == -1:
            pieces.append(css[i:])
            break
        # 헤더 = 직전 조각 끝부터 { 까지
        depth = 1
        k = brace + 1
        while k < n and depth > 0:
            c = css[k]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            k += 1
        pieces.append(css[i:k])
        i = k
    return [p for p in pieces if p.strip()]


def classify(block: str):
    """블록 하나의 소속 도메인 판정: 'event'|'support'|'community'|None"""
    header = block.split("{", 1)[0].strip()
    if not header or header.startswith("/*") or header.startswith("@keyframes") \
       or header.startswith(":root") or header.startswith("@theme"):
        return None

    def sels_of(h):
        return [s.strip() for s in h.split(",")]

    if header.startswith("@media"):
        inner = block[block.find("{") + 1:]
        # 내부 최상위 셀렉터들만 추출
        inner_sels = []
        for piece in split_top_level(inner):
            h = piece.split("{", 1)[0].strip()
            if h and not h.startswith("/*"):
                inner_sels.extend(sels_of(h))
        if not inner_sels:
            return None
        domains = set()
        for sel in inner_sels:
            if is_protected(sel):
                return None
            domains.add(match_domain(sel))
        if len(domains) == 1:
            d = list(domains)[0]
            if d in DOMAINS:
                return d
        return None

    domains = set()
    for sel in sels_of(header):
        if is_protected(sel):
            return None
        d = match_domain(sel)
        domains.add(d)
    if len(domains) == 1 and list(domains)[0] in DOMAINS:
        return list(domains)[0]
    return None


def main():
    css = open(SRC, encoding="utf-8", newline='').read()
    eol = "\r\n" if "\r\n" in css[:200] else "\n"

    blocks = split_top_level(css)
    print(f"최상위 조각: {len(blocks)}개")

    moved = {d: [] for d in DOMAINS}
    kept = []

    for b in blocks:
        d = classify(b)
        if d:
            moved[d].append(b.rstrip())
        else:
            kept.append(b)

    os.makedirs(OUT_DIR, exist_ok=True)
    for domain, texts in moved.items():
        out_path = f"{OUT_DIR}/{domain}.css"
        content = (
            f"/* {domain} 도메인 스타일 — globals.css에서 분리됨 */{eol}{eol}"
            + f"{eol}{eol}".join(texts) + eol
        )
        open(out_path, "w", encoding="utf-8", newline='').write(content)
        print(f"  {out_path}: {len(texts)}블록")

    new_css = eol.join(t.strip(eol) for t in kept) + eol
    new_css = re.sub(r'\n{4,}', '\n\n', new_css)
    open(SRC, "w", encoding="utf-8", newline='').write(new_css)

    g = open(SRC, encoding="utf-8", newline='').read()
    imports = "".join(f'@import "../styles/{d}.css";{eol}' for d in ["event", "support", "community"])
    marker = '@import "../components/cards/entity-card.css";' + eol
    if "../styles/event.css" not in g and marker in g:
        g = g.replace(marker, marker + imports, 1)
        open(SRC, "w", encoding="utf-8", newline='').write(g)
    print("globals.css 업데이트 완료")


if __name__ == "__main__":
    main()
