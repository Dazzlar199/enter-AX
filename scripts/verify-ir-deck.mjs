import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseOptions(argv) {
  const options = { mode: "all", deck: "ir-deck.html", output: "artifacts/ir-deck" };
  for (const argument of argv) {
    const [key, value] = argument.split("=", 2);
    if (key === "--mode" && value) options.mode = value;
    if (key === "--deck" && value) options.deck = value;
    if (key === "--output" && value) options.output = value;
  }
  return options;
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match?.[1] ?? null;
}

export function inspectMarkup(html) {
  const tags = [...html.matchAll(/<([a-z][\w-]*)\b[^>]*>/gi)].map((match) => match[0]);
  const slideIds = tags
    .filter((tag) => (getAttribute(tag, "class") ?? "").split(/\s+/).includes("slide"))
    .map((tag) => getAttribute(tag, "id"))
    .filter(Boolean);
  const duplicateIds = [...new Set(slideIds.filter((id, index) => slideIds.indexOf(id) !== index))];
  const forbidden = [
    /커뮤니티는 복제할 수 없습니다/,
    /양면 네트워크 효과/,
    /자체 컴퓨터비전·오디오 모델/,
    /수십 원 이하/,
    /80%대 후반/,
    /contact@enter-ax\.com/,
    /\[(?:미정|TBD)\]/i,
  ].filter((pattern) => pattern.test(html)).map(String);

  return {
    slideCount: slideIds.length,
    duplicateIds,
    forbidden,
    hasEvidenceTags: ["LIVE", "PROTOTYPE", "ASSUMPTION", "TARGET"].every((tag) => html.includes(tag)),
    hasPrintRules: /@media\s+print/.test(html),
    hasAccessibleDeckLabel: /aria-label="Enter-AX IR deck"/.test(html),
  };
}

export function assertStructure(report) {
  const errors = [];
  if (report.slideCount !== 12) errors.push(`expected 12 slides, found ${report.slideCount}`);
  if (report.duplicateIds.length) errors.push(`duplicate slide ids: ${report.duplicateIds.join(", ")}`);
  if (report.forbidden.length) errors.push(`forbidden claims: ${report.forbidden.join(", ")}`);
  if (!report.hasEvidenceTags) errors.push("missing evidence-state tags");
  if (!report.hasPrintRules) errors.push("missing print rules");
  if (!report.hasAccessibleDeckLabel) errors.push("missing accessible deck label");
  return errors;
}

async function runCli() {
  const options = parseOptions(process.argv.slice(2));
  if (!new Set(["structure", "runtime", "render", "all"]).has(options.mode)) {
    throw new Error(`unsupported mode: ${options.mode}`);
  }
  const deckPath = path.resolve(options.deck);
  const html = await fs.readFile(deckPath, "utf8");
  const errors = assertStructure(inspectMarkup(html));

  if (errors.length) {
    console.error("STRUCTURE FAIL");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("STRUCTURE PASS — 12 slides, unique IDs, evidence labels present, no forbidden claims");
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
