import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

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
    hasDesignTokens: ["--canvas:", "--paper:", "--ink:", "--cobalt:", "--approval:", "--risk:"].every((token) => html.includes(token)),
    diagramNames: [...html.matchAll(/<svg\b[^>]*data-diagram="([^"]+)"/g)].map((match) => match[1]),
    hasProductEvidenceImage: /assets\/deck\/ax-command-center\.png/.test(html),
    hasGradientDeclaration: /(?:linear|radial|conic)-gradient\s*\(/i.test(html),
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
  if (!report.hasDesignTokens) errors.push("missing approved design tokens");
  for (const name of ["fragmentation", "workflow", "boundary", "market", "validation"]) {
    if (!report.diagramNames.includes(name)) errors.push(`missing ${name} diagram`);
  }
  if (!report.hasProductEvidenceImage) errors.push("missing product evidence image");
  if (report.hasGradientDeclaration) errors.push("gradient declarations are not allowed");
  return errors;
}

function describeElement(element) {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const classes = [...element.classList].map((name) => `.${name}`).join("");
  return `${tag}${id}${classes}`;
}

async function inspectRuntime(page) {
  return page.evaluate(() => {
    const active = document.querySelector(".slide.is-active");
    const slideBox = active?.getBoundingClientRect();
    const safeAreaViolations = [];
    if (active && slideBox) {
      for (const element of active.querySelectorAll(".slide-content, .source-line, h1")) {
        if (element.classList.contains("visual-bleed")) continue;
        const box = element.getBoundingClientRect();
        const epsilon = 1;
        if (
          box.left < slideBox.left + 88 - epsilon ||
          box.right > slideBox.right - 88 + epsilon ||
          box.top < slideBox.top + 64 - epsilon ||
          box.bottom > slideBox.bottom - 64 + epsilon
        ) {
          const tag = element.tagName.toLowerCase();
          const id = element.id ? `#${element.id}` : "";
          const classes = [...element.classList].map((name) => `.${name}`).join("");
          safeAreaViolations.push(`${active.id} ${tag}${id}${classes}`);
        }
      }
    }

    return {
      controller: Boolean(window.deckController),
      total: window.deckController?.total ?? null,
      current: window.deckController?.current ?? null,
      visible: [...document.querySelectorAll(".slide")].filter((slide) => getComputedStyle(slide).display !== "none").length,
      brokenImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute("src")),
      overflows: [...document.querySelectorAll(".slide")]
        .filter((slide) => slide.scrollWidth > slide.clientWidth || slide.scrollHeight > slide.clientHeight)
        .map((slide) => slide.id),
      unlabeledDots: [...document.querySelectorAll(".nav-dot")]
        .filter((dot) => !dot.getAttribute("aria-label"))
        .length,
      safeAreaViolations,
    };
  });
}

async function runRuntimeChecks(page) {
  const errors = [];
  const initial = await inspectRuntime(page);
  if (!initial.controller) errors.push("window.deckController is missing");
  if (initial.total !== 12) errors.push(`runtime expected 12 slides, found ${initial.total}`);
  if (initial.visible !== 1) errors.push(`expected one visible slide, found ${initial.visible}`);
  if (initial.brokenImages.length) errors.push(`broken images: ${initial.brokenImages.join(", ")}`);
  if (initial.overflows.length) errors.push(`slide overflow: ${initial.overflows.join(", ")}`);
  if (initial.unlabeledDots) errors.push(`${initial.unlabeledDots} navigation dots lack labels`);
  if (initial.safeAreaViolations.length) errors.push(`safe-area violations: ${initial.safeAreaViolations.join(", ")}`);

  if (initial.controller) {
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowRight");
    const endIndex = await page.evaluate(() => window.deckController.current);
    if (endIndex !== 11) errors.push(`end boundary expected 11, found ${endIndex}`);
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowLeft");
    const homeIndex = await page.evaluate(() => window.deckController.current);
    if (homeIndex !== 0) errors.push(`home boundary expected 0, found ${homeIndex}`);

    for (let index = 0; index < 12; index += 1) {
      await page.evaluate((target) => window.deckController.goTo(target), index);
      const report = await inspectRuntime(page);
      if (report.safeAreaViolations.length) errors.push(...report.safeAreaViolations.map((item) => `safe-area: ${item}`));
      if (report.visible !== 1) errors.push(`slide ${index + 1}: expected one visible slide, found ${report.visible}`);
    }
  }

  return [...new Set(errors)];
}

async function renderDeck(page, outputDirectory) {
  await fs.mkdir(outputDirectory, { recursive: true });
  const slideFiles = [];
  for (let index = 0; index < 12; index += 1) {
    await page.evaluate((target) => window.deckController.goTo(target), index);
    const file = path.join(outputDirectory, `slide-${String(index + 1).padStart(2, "0")}.png`);
    await page.locator(".slide.is-active").screenshot({ path: file });
    slideFiles.push(file);
  }

  await page.emulateMedia({ media: "print" });
  const pdfPath = path.join(outputDirectory, "deck.pdf");
  const pdf = await page.pdf({ path: pdfPath, printBackground: true, preferCSSPageSize: true });
  const pageCount = (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)\b/g) ?? []).length;
  await page.emulateMedia({ media: "screen" });

  const cards = await Promise.all(slideFiles.map(async (file, index) => {
    const image = await fs.readFile(file, "base64");
    return `<figure><img src="data:image/png;base64,${image}" alt="Slide ${index + 1}"><figcaption>${String(index + 1).padStart(2, "0")}</figcaption></figure>`;
  }));
  const sheet = await page.context().newPage();
  await sheet.setViewportSize({ width: 1600, height: 980 });
  await sheet.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0;padding:30px;background:#d7dae0;font-family:Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}figure{margin:0;background:#fff;border:1px solid #b6bbc5}img{display:block;width:100%;height:auto}figcaption{padding:7px 10px;font:700 11px monospace}</style><div class="grid">${cards.join("")}</div>`);
  await sheet.screenshot({ path: path.join(outputDirectory, "contact-sheet.png"), fullPage: true });
  await sheet.close();
  return { pageCount, pdfPath, slideFiles };
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

  if (options.mode === "structure") return;

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(pathToFileURL(deckPath).href, { waitUntil: "load" });
    await page.waitForTimeout(100);

    if (options.mode === "runtime" || options.mode === "all") {
      const runtimeErrors = await runRuntimeChecks(page);
      if (runtimeErrors.length) {
        console.error("RUNTIME FAIL");
        for (const error of runtimeErrors) console.error(`- ${error}`);
        process.exitCode = 1;
        return;
      }
      console.log("RUNTIME PASS — navigation, images, overflow, and safe areas verified");
    }

    if (options.mode === "render" || options.mode === "all") {
      const outputDirectory = path.resolve(options.output);
      const render = await renderDeck(page, outputDirectory);
      if (render.pageCount !== 12) {
        console.error(`PRINT FAIL — expected 12 pages, found ${render.pageCount}`);
        process.exitCode = 1;
        return;
      }
      console.log(`PRINT PASS — 12 pages; renders: ${outputDirectory}`);
    }
  } finally {
    await browser.close();
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
