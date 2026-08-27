import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const verifyBuiltBundle = process.argv.includes("--built");
const failures = [];

function read(relativePath) {
  const path = resolve(root, relativePath);
  if (!existsSync(path)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function blockAfter(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) return null;
  const openIndex = source.indexOf("{", markerIndex + marker.length);
  if (openIndex === -1) return null;

  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(openIndex + 1, index);
  }
  return null;
}

function declaration(body, property) {
  if (!body) return null;
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return body.match(new RegExp(`${escaped}\\s*:\\s*([^;}]+)`))?.[1]?.trim() ?? null;
}

function normalize(value) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function compact(value) {
  return value?.replace(/\s+/g, "") ?? "";
}

function firstBlock(source, markers) {
  for (const marker of markers) {
    const body = blockAfter(source, marker);
    if (body !== null) return body;
  }
  return null;
}

function mediaBlockContaining(source, mediaMarkers, selectorMarkers) {
  for (const mediaMarker of mediaMarkers) {
    let offset = 0;
    while (offset < source.length) {
      const index = source.indexOf(mediaMarker, offset);
      if (index === -1) break;
      const body = blockAfter(source.slice(index), mediaMarker);
      if (body && selectorMarkers.some((selector) => body.includes(selector))) return body;
      offset = index + mediaMarker.length;
    }
  }
  return null;
}

function verifyEventDetail(sourcePage, sourceCss, label) {
  expect(sourcePage.includes('className="event-experience event-detail-layout shell"'), `${label}: event detail root class is missing`);
  expect(sourcePage.includes('className="event-experience-main event-detail-summary"'), `${label}: event summary region is missing`);
  expect(sourcePage.includes('className="event-experience-sidebar event-detail-sidebar"'), `${label}: event sidebar region is missing`);
  expect(sourcePage.includes('className="event-detail-poster"'), `${label}: constrained event poster class is missing`);
  expect(sourcePage.includes('className="event-experience-main event-detail-content"'), `${label}: event content region is missing`);

  const desktopRule = blockAfter(sourceCss, ".event-detail-layout.event-experience");
  expect(desktopRule !== null, `${label}: desktop event layout rule is missing`);
  expect(declaration(desktopRule, "display") === "grid", `${label}: event detail must use a desktop grid`);
  expect(compact(declaration(desktopRule, "grid-template-columns")).includes("minmax(280px,320px)minmax(0,1fr)"), `${label}: event sidebar width constraint is missing`);
  const desktopAreas = normalize(declaration(desktopRule, "grid-template-areas"));
  expect(desktopAreas.includes('"sidebar summary"') && desktopAreas.includes('"sidebar content"'), `${label}: event desktop grid areas are incomplete`);

  const posterSelectors = [".event-detail-sidebar > .event-detail-poster", ".event-detail-sidebar>.event-detail-poster"];
  const posterRule = firstBlock(sourceCss, posterSelectors);
  expect(posterRule !== null, `${label}: event poster sizing rule is missing`);
  expect(declaration(posterRule, "width") === "100%", `${label}: event poster width must stay inside the sidebar`);
  expect(compact(declaration(posterRule, "aspect-ratio")) === "4/5", `${label}: event poster aspect ratio changed unexpectedly`);
  expect(declaration(posterRule, "object-fit") === "cover", `${label}: event poster must use object-fit: cover`);

  const detailLayoutSelectors = [".event-detail-layout.event-experience"];
  const mobileMedia = mediaBlockContaining(sourceCss, ["@media (max-width: 780px)", "@media (max-width:780px)"], detailLayoutSelectors);
  const mobileRule = mobileMedia ? blockAfter(mobileMedia, ".event-detail-layout.event-experience") : null;
  expect(mobileRule !== null, `${label}: mobile event layout rule is missing`);
  expect(compact(declaration(mobileRule, "grid-template-columns")) === "1fr", `${label}: mobile event layout must collapse to one column`);
  const mobileAreas = normalize(declaration(mobileRule, "grid-template-areas"));
  expect(mobileAreas.includes('"summary"') && mobileAreas.includes('"sidebar"') && mobileAreas.includes('"content"'), `${label}: mobile event reading order is incomplete`);
}

function collectCss(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) return collectCss(path);
    return path.endsWith(".css") ? [readFileSync(path, "utf8")] : [];
  });
}

const eventPage = read("src/app/events/[slug]/page.tsx");
const eventCss = read("src/styles/event.css");
const globalsCss = read("src/app/globals.css");
const domainStyleImports = [
  "partner.css",
  "admin.css",
  "founder.css",
  "product-detail.css",
  "home.css",
  "submit-forms.css",
  "event.css",
  "support.css",
  "community.css",
  "my.css",
  "stories.css",
];

for (const stylesheet of domainStyleImports) {
  expect(globalsCss.includes(`@import "../styles/${stylesheet}";`), `source: global import for ${stylesheet} is missing`);
}

verifyEventDetail(eventPage, eventCss, "source");

if (verifyBuiltBundle) {
  const builtCssFiles = collectCss(resolve(root, ".next", "static", "chunks"));
  expect(builtCssFiles.length > 0, "bundle: no built CSS files found; run next build first");
  verifyEventDetail(eventPage, builtCssFiles.join("\n"), "bundle");
}

if (failures.length) {
  console.error("\nCritical UI contract verification failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error("\nDeployment blocked to prevent a public UI regression.\n");
  process.exit(1);
}

console.log(`Critical UI contracts passed (${verifyBuiltBundle ? "source + bundle" : "source"}).`);
