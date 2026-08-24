"""
SEED 디자인 토큰 준수 스냅 스크립트 — globals.css + src/styles/*.css 전체 적용.

규칙 (DESIGN.md):
- font-size → SEED 12단계 스케일로 스냅
- font-weight → 400/500/700만
- border-radius → 4/6/8/12/16/20 + pill(999)
- 텍스트 회색 hex → --fg-* semantic 토큰
- accent 계열 hex → --accent/--carrot-* 토큰
- 초록 상태색 → --success

사용: python scripts/enforce-design-tokens.py
"""
import re
import os

FILES = ["src/app/globals.css"] + [
    "src/styles/" + f for f in sorted(os.listdir("src/styles")) if f.endswith(".css")
]

# ---------- 매핑 테이블 ----------

WEIGHT_MAP = {
    "200": "400", "300": "400", "450": "500", "550": "500",
    "600": "500", "650": "700", "750": "700", "800": "700",
    "850": "700", "900": "700",
}

SEED_SIZES = [11, 12, 13, 14, 16, 18, 20, 22, 24, 26, 28, 32, 40, 48]

def snap_size(v: str) -> str:
    n = int(round(float(v)))
    if n in SEED_SIZES:
        return str(n)
    return str(min(SEED_SIZES, key=lambda s: (abs(s - n), -s)))

RADIUS_MAP = {
    "2": "4", "3": "4", "5": "6", "7": "8", "9": "8",
    "10": "12", "11": "12", "13": "12", "14": "12",
    "15": "16", "17": "16", "18": "16",
    "22": "20", "24": "20", "26": "20", "28": "20",
    "32": "20", "34": "20", "46": "20",
}

def snap_radius_value(val: str) -> str:
    out = []
    for part in val.split():
        m = re.fullmatch(r"(\d+)px", part)
        if not m:
            out.append(part)
            continue
        n = m.group(1)
        if n in ("999", "99"):
            out.append("999px")
        else:
            out.append(RADIUS_MAP.get(n, n) + "px")
    return " ".join(out)


def hex3to6(h):
    h = h.lstrip("#")
    return "".join(c * 2 for c in h) if len(h) == 3 else h


def is_gray(h6):
    r, g, b = int(h6[0:2], 16), int(h6[2:4], 16), int(h6[4:6], 16)
    return max(r, g, b) - min(r, g, b) < 20


def fg_token_for(h):
    """텍스트 회색 hex → semantic fg 토큰. 해당 없으면 None."""
    h6 = hex3to6(h)
    if not is_gray(h6):
        return None
    r, g, b = int(h6[0:2], 16), int(h6[2:4], 16), int(h6[4:6], 16)
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if L > 200:
        return None  # 흰색 계열 유지
    if L < 60:
        return "var(--fg-strong)"
    if L < 110:
        return "var(--fg-default)"
    if L < 160:
        return "var(--fg-muted)"
    return "var(--fg-subtle)"


ACCENT_HEXES = {
    "#ef4125": "var(--accent)", "#d9361e": "var(--accent-hover)",
    "#fff0ed": "var(--accent-soft)", "#ff6c53": "var(--carrot-500)",
    "#ff785e": "var(--carrot-500)", "#ff9b89": "var(--carrot-400)",
    "#ffbbaa": "var(--carrot-300)", "#ffad9e": "var(--carrot-300)",
    "#ffcabf": "var(--carrot-200)", "#ffe1da": "var(--carrot-200)",
    "#fff3f0": "var(--carrot-100)", "#fff7f5": "var(--carrot-100)",
    "#fff1ed": "var(--accent-soft)", "#fff5f2": "var(--accent-soft)",
}

GREEN_HEXES = {
    "#15803d", "#16833a", "#218347", "#248956", "#25814f", "#247b48",
    "#237a48", "#25854b", "#2b8a56", "#1e7f4f", "#178a50",
}


def process(css: str):
    stats = Counter()

    # 1) font-weight 강등
    def w_repl(m):
        old = m.group(1)
        new = WEIGHT_MAP.get(old, old)
        if new != old:
            stats["weight"] += 1
        return f"font-weight: {new}"
    css = re.sub(r"font-weight:\s*(\d+)\b", w_repl, css)

    # 2) font-size 스냅
    def fs_repl(m):
        new = snap_size(m.group(1))
        if new != m.group(1):
            stats["font-size"] += 1
        return f"font-size: {new}px"
    css = re.sub(r"font-size:\s*([\d.]+)px", fs_repl, css)

    # 3) radius 스냅
    def br_repl(m):
        new_val = snap_radius_value(m.group(1).strip())
        if new_val != m.group(1).strip():
            stats["radius"] += 1
        return f"border-radius: {new_val};"
    css = re.sub(r"border-radius:\s*([^;]+);", br_repl, css)

    # 4) 텍스트 회색 → fg 토큰
    def color_repl(m):
        tok = fg_token_for(m.group(1))
        if tok:
            stats["gray"] += 1
            return f"color: {tok}"
        return m.group(0)
    css = re.sub(r"(?<![-\w])color:\s*(#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b)", color_repl, css)

    # 5) accent/초록 hex → 토큰 (모든 속성 대상)
    for old_hex, token in ACCENT_HEXES.items():
        pat = re.compile(re.escape(old_hex) + r"\b", re.I)
        css, n = pat.subn(token, css)
        stats["accent-hex"] += n
    for gh in GREEN_HEXES:
        pat = re.compile(re.escape(gh) + r"\b", re.I)
        css, n = pat.subn("var(--success)", css)
        stats["green-hex"] += n

    # 6) hex8 알파 → color-mix (accent 잔존 시)
    def hex8_repl(m):
        stats["hex8"] += 1
        pct = round(int(m.group(1), 16) / 255 * 100)
        return f"color-mix(in srgb, var(--accent) {pct}%, transparent)"
    css = re.sub(r"#ef4125([0-9a-fA-F]{2})\b", hex8_repl, css)

    return css, stats


from collections import Counter

def main():
    total = Counter()
    for path in FILES:
        s = open(path, encoding="utf-8", newline="").read()
        eol = "\r\n" if "\r\n" in s[:200] else "\n"
        new_s, stats = process(s)
        if any(stats.values()):
            open(path, "w", encoding="utf-8", newline="").write(new_s)
        print(f"{os.path.basename(path)}: " + ", ".join(f"{k}={v}" for k, v in stats.items() if v))
        total.update(stats)
    print("\n합계:", dict(total))


if __name__ == "__main__":
    main()
