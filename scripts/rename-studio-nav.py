"""studio-nav.tsx → dash-nav.tsx 파일명/컴포넌트명 변경 + 참조 갱신."""
import os
import re

OLD = "src/app/my/studio-nav.tsx"
NEW = "src/app/my/dash-nav.tsx"

if os.path.exists(OLD):
    os.rename(OLD, NEW)
    print("renamed:", NEW)

n = 0
for root, dirs, fs in os.walk(os.path.join("src", "app", "my")):
    for f in fs:
        if not f.endswith((".tsx", ".ts")):
            continue
        path = os.path.join(root, f)
        s = open(path, encoding="utf-8", newline="").read()
        new = s.replace("/studio-nav", "/dash-nav").replace("StudioNav", "DashNav")
        if new != s:
            open(path, "w", encoding="utf-8", newline="").write(new)
            n += 1

# 컴포넌트 내부명
s = open(NEW, encoding="utf-8", newline="").read()
new = s.replace("StudioNav", "DashNav")
if new != s:
    open(NEW, "w", encoding="utf-8", newline="").write(new)

print("updated refs in", n, "files")
