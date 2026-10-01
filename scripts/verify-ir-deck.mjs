import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const EXPECTED_SLIDES = 13;

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
    /120,000/,
    /anonymous-performer-portrait-v1\.png/,
    /커뮤니티는 복제할 수 없습니다/,
    /양면 네트워크 효과/,
    /자체 컴퓨터비전·오디오 모델/,
    /수십 원 이하/,
    /80%대 후반/,
    /contact@enter-ax\.com/,
    /\[(?:미정|TBD)\]/i,
    /문제의 다음 장면/,
    /접수 전후의 반복 사용과 업무량은 아직 측정 전/,
    /지원 영상부터<br>후보 검토까지 한곳에서/,
    /400<small>만 원~\/월<\/small>/,
  ].filter((pattern) => pattern.test(html)).map(String);

  const psstOrder = tags
    .filter((tag) => (getAttribute(tag, "class") ?? "").split(/\s+/).includes("slide"))
    .map((tag) => getAttribute(tag, "data-section"))
    .filter(Boolean);
  const psstRank = { P: 0, S1: 1, S2: 2, T: 3 };

  return {
    slideCount: slideIds.length,
    hasPsstOrder: psstOrder.every((section, index) => index === 0 || psstRank[section] >= psstRank[psstOrder[index - 1]]),
    hasCenteredHeadlines: /\.slide-head\s+h1\s*\{[^}]*margin-inline:\s*auto[^}]*text-align:\s*center/.test(html) && /\.slide-head\s+\.kicker\s*\{[^}]*justify-content:\s*flex-start/.test(html),
    hasRealWorkflowCapture: /public\/images\/landing\/workflow-editor\.png/.test(html),
    duplicateIds,
    forbidden,
    hasEvidenceTags: ["PROTOTYPE", "ASSUMPTION", "TARGET"].every((tag) => html.includes(tag)),
    hasPrintRules: /@media\s+print/.test(html),
    hasAccessibleDeckLabel: /aria-label="Enter-AX 제품 소개 및 파일럿 파트너십 덱"/.test(html),
    hasDesignTokens: ["--canvas:", "--paper:", "--ink:", "--cobalt:", "--approval:", "--risk:"].every((token) => html.includes(token)),
    diagramNames: [...html.matchAll(/<svg\b[^>]*data-diagram="([^"]+)"/g)].map((match) => match[1]),
    hasProductEvidenceImage: /assets\/deck\/ax-command-center\.png/.test(html),
    hasFixtureDataLabel: /PROTOTYPE[^<]*<\/span>\s*화면 수치는 데모 데이터/.test(html),
    hasGradientDeclaration: /(?:linear|radial|conic)-gradient\s*\(/i.test(html),
    hasOfficialAuditionSources: /yg-audition\.com\/en\/notice\/236/.test(html) && /audition\.jype\.com\/audition\/auditions/.test(html),
    hasProfileFieldVisual: /class="[^"]*\bproduct-profile\b/.test(html) && /공개 범위/.test(html),
    hasMarketStages: /class="[^"]*market-journey/.test(html) && /class="market-economics"/.test(html),
    hasToolLandscape: /class="[^"]*tool-landscape/.test(html) && /class="tool-category/.test(html),
    hasPricingScenes: /class="tier-scene"/.test(html) && /class="tier-feature/.test(html),
    hasFocusedCommunity: /class="[^"]*community-proof"/.test(html),
    hasCleanSystemDiagram: /class="[^"]*system-diagram"/.test(html) && /class="[^"]*\bproduct-profile\b/.test(html),
    hasWideAgencyProof: /class="[^"]*ax-flow-showcase"/.test(html),
    hasGateRoadmap: /class="[^"]*roadmap-gates"/.test(html) && /class="roadmap-gate"/.test(html),
    hasProductMapEvidence: /class="[^"]*system-diagram"/.test(html) && /class="product-map-shot"/.test(html),
    hasConciseThirdSlide: /id="slide-02b"[\s\S]*?<\/section>/.exec(html)?.[0].includes('class="source-line"') === false,
    hasDualAudienceCover: /id="slide-01"[\s\S]*?<\/section>/.exec(html)?.[0].includes('B2C') && /id="slide-01"[\s\S]*?<\/section>/.exec(html)?.[0].includes('B2B'),
  };
}

export function assertStructure(report) {
  const errors = [];
  if (report.slideCount !== EXPECTED_SLIDES) errors.push(`expected ${EXPECTED_SLIDES} slides, found ${report.slideCount}`);
  if (!report.hasPsstOrder) errors.push("PSST chapters move backwards");
  if (!report.hasCenteredHeadlines) errors.push("slide headlines are not centered");
  if (!report.hasRealWorkflowCapture) errors.push("agency AX slide lacks the real workflow editor capture");
  if (report.duplicateIds.length) errors.push(`duplicate slide ids: ${report.duplicateIds.join(", ")}`);
  if (report.forbidden.length) errors.push(`forbidden claims: ${report.forbidden.join(", ")}`);
  if (!report.hasEvidenceTags) errors.push("missing evidence-state tags");
  if (!report.hasPrintRules) errors.push("missing print rules");
  if (!report.hasAccessibleDeckLabel) errors.push("missing accessible deck label");
  if (!report.hasDesignTokens) errors.push("missing approved design tokens");
  if (report.hasGradientDeclaration) errors.push("gradient declarations are not allowed");
  if (!report.hasOfficialAuditionSources) errors.push("missing official audition sources");
  if (!report.hasProfileFieldVisual) errors.push("missing field-based applicant profile visuals");
  if (!report.hasMarketStages) errors.push("missing data-to-target market stages");
  if (!report.hasToolLandscape) errors.push("missing visual tool landscape");
  if (!report.hasPricingScenes) errors.push("missing differentiated pricing scenes");
  if (!report.hasFocusedCommunity) errors.push("missing focused community proof");
  if (!report.hasCleanSystemDiagram) errors.push("missing clean two-sided system diagram");
  if (!report.hasWideAgencyProof) errors.push("missing wide agency product proof");
  if (!report.hasGateRoadmap) errors.push("missing stage-gated roadmap");
  if (!report.hasProductMapEvidence) errors.push("product map lacks product screenshots");
  if (!report.hasConciseThirdSlide) errors.push("third slide still has disclaimer footer");
  if (!report.hasDualAudienceCover) errors.push("cover does not identify B2C and B2B sides");
  return errors;
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
        // The deck is scaled to fit the viewport, so compare in slide-canvas units.
        const unit = slideBox.width / 1600;
        if (
          box.left < slideBox.left + 88 * unit - epsilon ||
          box.right > slideBox.right - 88 * unit + epsilon ||
          box.top < slideBox.top + 64 * unit - epsilon ||
          box.bottom > slideBox.bottom - 64 * unit + epsilon
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
      footerlessSlides: [...document.querySelectorAll(".slide:not(#slide-01)")]
        .filter((slide) => !slide.querySelector(".source-line, .footer-rule"))
        .map((slide) => slide.id),
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
  if (initial.total !== EXPECTED_SLIDES) errors.push(`runtime expected ${EXPECTED_SLIDES} slides, found ${initial.total}`);
  if (initial.visible !== 1) errors.push(`expected one visible slide, found ${initial.visible}`);
  if (initial.brokenImages.length) errors.push(`broken images: ${initial.brokenImages.join(", ")}`);
  if (initial.footerlessSlides.length) errors.push(`missing footer rule: ${initial.footerlessSlides.join(", ")}`);
  if (initial.overflows.length) errors.push(`slide overflow: ${initial.overflows.join(", ")}`);
  if (initial.unlabeledDots) errors.push(`${initial.unlabeledDots} navigation dots lack labels`);
  if (initial.safeAreaViolations.length) errors.push(`safe-area violations: ${initial.safeAreaViolations.join(", ")}`);

  if (initial.controller) {
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowRight");
    const endIndex = await page.evaluate(() => window.deckController.current);
    if (endIndex !== EXPECTED_SLIDES - 1) errors.push(`end boundary expected ${EXPECTED_SLIDES - 1}, found ${endIndex}`);
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowLeft");
    const homeIndex = await page.evaluate(() => window.deckController.current);
    if (homeIndex !== 0) errors.push(`home boundary expected 0, found ${homeIndex}`);

    for (let index = 0; index < EXPECTED_SLIDES; index += 1) {
      await page.evaluate((target) => window.deckController.goTo(target), index);
      const report = await inspectRuntime(page);
      if (report.safeAreaViolations.length) errors.push(...report.safeAreaViolations.map((item) => `safe-area: ${item}`));
      if (report.visible !== 1) errors.push(`slide ${index + 1}: expected one visible slide, found ${report.visible}`);
    }

    for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(50);
      const bounds = await page.locator("#deck-frame").boundingBox();
      if (!bounds || bounds.x < -1 || bounds.y < -1 || bounds.x + bounds.width > viewport.width + 1 || bounds.y + bounds.height > viewport.height + 1) {
        errors.push(`viewport ${viewport.width}x${viewport.height} clips deck: ${JSON.stringify(bounds)}`);
      }
    }
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.evaluate(() => window.deckController.goTo(0));

    const hierarchy = await page.evaluate(() => {
      const product = document.querySelector("#slide-02d .slide-content");
      const marketFigures = [...document.querySelectorAll("#slide-05 .market-economics strong")];
      return {
        productIconCount: product?.querySelectorAll('img[src$=".svg"]').length ?? -1,
        productScreenshotCount: product?.querySelectorAll('.product-map-shot img').length ?? 0,
        largeMarketFigures: marketFigures.filter((figure) => parseFloat(getComputedStyle(figure).fontSize) >= 60).length,
        marketFigureCount: marketFigures.length,
      };
    });
    await page.evaluate(() => window.deckController.goTo(10));
    const roadmapWidths = await page.locator("#slide-09 .roadmap-gates > article").evaluateAll((stages) =>
      stages.slice(0, 2).map((stage) => stage.getBoundingClientRect().width)
    );
    if (hierarchy.productIconCount !== 0) errors.push("product map still relies on decorative icons");
    if (hierarchy.productScreenshotCount !== 2) errors.push("product map needs two real UI screenshots");
    if (hierarchy.marketFigureCount !== 3 || hierarchy.largeMarketFigures !== 3) errors.push("TAM/SAM/SOM are not all primary-size figures");
    if (!roadmapWidths[0] || roadmapWidths[0] < roadmapWidths[1] * 1.4) errors.push("roadmap current phase lacks visual priority");
    await page.evaluate(() => window.deckController.goTo(0));
  }

  return [...new Set(errors)];
}

async function renderDeck(page, outputDirectory) {
  await fs.mkdir(outputDirectory, { recursive: true });
  const slideFiles = [];
  for (let index = 0; index < EXPECTED_SLIDES; index += 1) {
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

  console.log(`STRUCTURE PASS — ${EXPECTED_SLIDES} slides, unique IDs, evidence labels present, no forbidden claims`);

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
      if (render.pageCount !== EXPECTED_SLIDES) {
        console.error(`PRINT FAIL — expected ${EXPECTED_SLIDES} pages, found ${render.pageCount}`);
        process.exitCode = 1;
        return;
      }
      console.log(`PRINT PASS — ${EXPECTED_SLIDES} pages; renders: ${outputDirectory}`);
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
