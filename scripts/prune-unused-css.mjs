import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function walk(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(p);
  }
  return out;
}

const srcFiles = walk(path.join(root, "src"), [".ts", ".tsx", ".js", ".mjs"]);
const srcAll = srcFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

const cssPath = path.join(root, "src/app/globals.css");
const css = fs.readFileSync(cssPath, "utf8");

const classInSelector = /\.([a-zA-Z][a-zA-Z0-9_-]*)/g;
function classesIn(sel) {
  return [...sel.matchAll(classInSelector)].map((m) => m[1]);
}

function findBlockEnd(css, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return css.length;
}

const removed = [];

function prune(text, collect) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open === -1) {
      out += text.slice(i);
      break;
    }
    const header = text.slice(i, open).trim();
    const close = findBlockEnd(text, open);
    const body = text.slice(open + 1, close);
    const after = close + 1;
    const trailingWsMatch = text.slice(after).match(/^\s*/);
    const trailing = trailingWsMatch ? trailingWsMatch[0] : "";

    if (header.startsWith("@")) {
      const atName = header.slice(0, header.indexOf(" ")).toLowerCase();
      if (atName === "@media" || atName === "@supports") {
        const inner = prune(body, collect);
        if (inner.trim()) {
          out += header + " {" + inner + "}" + trailing;
        } else {
          collect(header);
        }
      } else {
        out += header + " {" + body + "}" + trailing;
      }
      i = after + trailing.length;
      continue;
    }

    const sels = header.split(",").map((s) => s.trim());
    const drop = sels.length > 0 && sels.every((sel) => {
      const cls = classesIn(sel);
      return cls.length > 0 && cls.every((c) => srcAll.indexOf(c) === -1);
    });
    if (drop) {
      collect(header.replace(/\s+/g, " "));
      i = after + trailing.length;
      continue;
    }
    out += text.slice(i, after) + trailing;
    i = after + trailing.length;
  }
  return out;
}

const pruned = prune(css, (h) => removed.push(h));
fs.writeFileSync(cssPath, pruned);
console.log("removed rule headers:", removed.length);
console.log("bytes:", css.length, "->", pruned.length, "(-" + (css.length - pruned.length) + ")");
