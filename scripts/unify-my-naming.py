"""
/my 대시보드 네이밍 통합: studio-* / role-dashboard-* / ig-* / member-make-* /
team-profile-* / team-hub* / my-dash-*  →  dash-* 단일 체계.

TSX(src/app/my/**)와 CSS(my.css, partner.css, admin.css, globals.css) 동시 적용.
실행 후 반드시 npm run build로 검증.
"""
import re
import os

MAPPING = {
    "studio-dashboard-inner": "dash-shell",
    "studio-dashboard": "dash-page",
    "studio-nav": "dash-nav",
    "studio-panel-heading": "dash-panel-title",
    "studio-settings-inner": "dash-settings-inner",
    "studio-settings-page": "dash-settings",
    "team-profile-card": "dash-team-card",
    "role-dashboard-avatar": "dash-avatar",
    "role-dashboard-hero": "dash-hero",
    "role-dashboard-state": "dash-state-row",
    "role-dashboard-collection": "dash-collection",
    "member-make-actions": "dash-cta-row",
    "member-make-cta": "dash-cta-card",
}

TOKEN_RE = re.compile(
    r"\b(?:studio-[a-z0-9-]+|role-dashboard-[a-z0-9-]+|ig-post[a-z0-9-]*|"
    r"ig-profile[a-z0-9-]*|ig-btn[a-z0-9-]*|member-make-[a-z0-9-]+|"
    r"my-dash-[a-z0-9-]+|team-profile-[a-z0-9-]+|team-hub[a-z0-9-]*)\b"
)


def map_class(c: str) -> str:
    if c in MAPPING:
        return MAPPING[c]
    for old, new in sorted(MAPPING.items(), key=lambda x: -len(x[0])):
        if c.startswith(old):
            return new + c[len(old):]
    if c.startswith("ig-post"):
        return "dash-media" + c[len("ig-post"):]
    if c.startswith("ig-profile"):
        return "dash-profile" + c[len("ig-profile"):]
    if c.startswith("ig-btn"):
        return "dash-action" + c[len("ig-btn"):]
    if c.startswith("role-dashboard-"):
        return "dash-" + c[len("role-dashboard-"):]
    if c.startswith("member-make-"):
        return "dash-cta-" + c[len("member-make-"):]
    if c.startswith("my-dash-"):
        return "dash-" + c[len("my-dash-"):]
    if c.startswith("studio-"):
        return "dash-" + c[len("studio-"):]
    if c == "team-hub-edit-link":
        return "dash-team-hub-edit-link"
    if c.startswith("team-profile-"):
        return "dash-team-" + c[len("team-profile-"):]
    if c.startswith("team-hub"):
        return "dash-team-hub" + c[len("team-hub"):]
    return c


def convert(text: str):
    return TOKEN_RE.sub(lambda m: map_class(m.group(0)), text)


def main():
    changed = []

    targets = []
    for root, dirs, fs in os.walk(os.path.join("src", "app", "my")):
        for f in fs:
            if f.endswith((".tsx", ".ts")):
                targets.append(os.path.join(root, f))
    targets.append("src/styles/my.css")
    targets.append("src/styles/partner.css")
    targets.append("src/styles/admin.css")
    targets.append("src/app/globals.css")

    for path in targets:
        s = open(path, encoding="utf-8", newline="").read()
        new = convert(s)
        if new != s:
            open(path, "w", encoding="utf-8", newline="").write(new)
            changed.append(path)

    print(f"변경 파일 {len(changed)}개:")
    for p in changed:
        print(" ", p)


if __name__ == "__main__":
    main()
