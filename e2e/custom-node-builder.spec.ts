import { expect, test } from "@playwright/test";

test("administrator can create a custom step and add it to the step list", async ({ page }) => {
  await page.goto("/agency/ax");

  // Verify palette title and '+ 노드 제작' button
  await expect(page.locator(".wf-palette").getByText("단계 목록", { exact: true })).toBeVisible();
  const makeNodeBtn = page.getByRole("button", { name: "+ 맞춤 단계" });
  await expect(makeNodeBtn).toBeVisible();

  // Click '+ 노드 제작' to open the Custom Node Builder modal
  await makeNodeBtn.click();
  await expect(page.getByRole("heading", { name: "맞춤 단계 만들기" })).toBeVisible();
  await expect(page.getByText("관리자 설정")).toBeVisible();

  // Fill in custom node information
  await page.getByLabel("단계 이름").fill("치지직 방송 연동");
  await page.getByLabel("단계 설명").fill("신곡 발표 라이브 스트리밍 알림 웹훅");

  // Select a logo (e.g. YouTube or Python or Kakao)
  const logoBtn = page.locator(".wf-logo-choice").first();
  await logoBtn.click();

  // Submit the custom node
  await page.getByRole("button", { name: "맞춤 단계 만들기" }).click();

  // Verify notification and appearance in palette
  await expect(page.getByText(/등록되었습니다|성공/)).toBeVisible();
  await expect(page.getByText(/맞춤 단계 \(1\)/)).toBeVisible();
  await expect(page.locator(".wf-palette").getByText("치지직 방송 연동")).toBeVisible();
});

test("agency can run the K-POP audition review flow", async ({ page }) => {
  await page.goto("/agency/ax");

  // Switch to K-POP audition pipeline workflow
  const select = page.getByLabel("업무 흐름 선택");
  await select.selectOption({ label: "K-POP 오디션 검토 및 안내" });

  // Verify the pipeline nodes are rendered
  await expect(page.locator(".wf-canvas").getByText("카카오톡 안내 준비").first()).toBeVisible();
  await expect(page.locator(".wf-canvas").getByText("안무 동작 비교").first()).toBeVisible();

  // Toggle card preview
  const toggleBtn = page.getByRole("button", { name: "단계 자세히 보기" });
  await toggleBtn.click();

  // Run the workflow
  await page.getByRole("button", { name: "업무 흐름 시작", exact: true }).click();

  // Check approval gate
  await expect(page.getByText("승인이 필요합니다")).toBeVisible();
  await page.getByRole("button", { name: "확인하고 계속" }).click();

  // Verify completion of all 7 steps
  await expect(page.getByText(/실행 완료 · 6\/6 단계/)).toBeVisible();
});

test("user can collapse palette, minimize panel, and toggle canvas focus mode", async ({ page }) => {
  await page.goto("/agency/ax");

  // Palette is initially visible
  await expect(page.locator(".wf-palette").getByText("단계 목록", { exact: true })).toBeVisible();

  // Click collapse button on palette
  const collapsePaletteBtn = page.getByRole("button", { name: "단계 목록 접기" });
  await collapsePaletteBtn.click();

  // Palette is hidden, floating open tab is visible on canvas
  await expect(page.locator(".wf-palette").getByText("단계 목록", { exact: true })).toBeHidden();
  const floatingHubBtn = page.getByRole("button", { name: "단계 목록 펼치기" });
  await expect(floatingHubBtn).toBeVisible();

  // Re-open palette via floating button
  await floatingHubBtn.click();
  await expect(page.locator(".wf-palette").getByText("단계 목록", { exact: true })).toBeVisible();

  // On small mobile viewports, collapse palette before canvas interaction so canvas has full width
  const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
  if (isMobile) {
    await collapsePaletteBtn.click();
    await expect(page.locator(".wf-palette").getByText("단계 목록", { exact: true })).toBeHidden();
    // Allow ReactFlow fitView transition (200ms) to settle
    await page.waitForTimeout(350);
  }

  // Click a canvas node to open right panel
  await page.getByTestId("rf__node-talents").getByText("보컬 지원자").click();
  await expect(page.getByLabel("단계 설정")).toBeVisible();

  // Minimize right panel
  const minimizePanelBtn = page.getByRole("button", { name: "패널 접기" });
  await minimizePanelBtn.click();

  // Floating settings pill appears
  const floatingSettingsBtn = page.getByRole("button", { name: "단계 설정 패널 열기" });
  await expect(floatingSettingsBtn).toBeVisible();

  // Re-open panel
  await floatingSettingsBtn.click();
  await expect(page.getByLabel("단계 설정")).toBeVisible();

  // Toggle Canvas Focus (최대화)
  const focusBtn = page.getByRole("button", { name: /캔버스 최대화/ });
  await focusBtn.click();
  await expect(page.getByText("원래 크기로")).toBeVisible();
  await expect(page.locator(".wf-palette").getByText("단계 목록", { exact: true })).toBeHidden();

  // Restore from focus
  await page.getByRole("button", { name: "원래 크기로" }).click();
  await expect(page.locator(".wf-palette").getByText("단계 목록", { exact: true })).toBeVisible();
});

