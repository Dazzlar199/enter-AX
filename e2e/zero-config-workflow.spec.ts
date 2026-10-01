import { expect, test } from "@playwright/test";

test.describe("Zero-Config Vertical Entertainment AX", () => {
  test("user can open AI Generator, select an entertainment blueprint, and auto-build a full pipeline", async ({
    page,
  }) => {
    await page.goto("/agency/ax");

    // Click 'AI 파이프라인 생성' button in topbar
    const aiBtn = page.getByRole("button", { name: "업무 흐름 빠른 설정" });
    await expect(aiBtn).toBeVisible();
    await aiBtn.click();

    // Verify AI Generator modal opened
    await expect(
      page.getByRole("dialog", { name: "업무 흐름 빠른 설정" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "업무 흐름 빠른 설정" })
    ).toBeVisible();
    await expect(page.getByText("자주 쓰는 업무 흐름")).toBeVisible();

    // Select the 1st enterprise blueprint: K-POP 댄스 오디션 AI 심사 & 알림톡 통보
    const danceCard = page
      .locator(".wf-blueprint-card")
      .filter({ hasText: "K-POP 댄스 오디션 검토" });
    await danceCard.getByRole("button", { name: "이 흐름 사용하기" }).click();

    // Verify modal closes and notice appears
    await expect(
      page.getByRole("dialog", { name: "업무 흐름 빠른 설정" })
    ).not.toBeVisible();
    await expect(page.locator(".wf-notice")).toBeVisible();

    // Check that pipeline nodes are now present on canvas
    await expect(
      page.locator(".wf-canvas").getByText("안무 동작 비교").first()
    ).toBeVisible();
    await expect(page.locator(".wf-canvas").getByText("캐스팅 담당자 확인").first()).toBeVisible();
    await expect(
      page.locator(".wf-canvas").getByText("지원자 명단 정리").first()
    ).toBeVisible();
  });

  test("user can generate workflow from natural language prompt", async ({ page }) => {
    await page.goto("/agency/ax");

    // Open AI Generator
    await page.getByRole("button", { name: "업무 흐름 빠른 설정" }).click();
    await expect(
      page.getByRole("dialog", { name: "업무 흐름 빠른 설정" })
    ).toBeVisible();

    // Fill natural language prompt for 9:16 shortform
    const promptInput = page.locator(".wf-prompt-input");
    await promptInput.fill("오디션 영상에서 9:16 숏폼 추출해서 유튜브 쇼츠랑 틱톡에 동시 배포해줘");

    // Submit prompt
    await page.getByRole("button", { name: "업무 흐름 만들기" }).click();

    // Verify modal closed
    await expect(
      page.getByRole("dialog", { name: "업무 흐름 빠른 설정" })
    ).not.toBeVisible();
    await expect(page.locator(".wf-notice")).toBeVisible();

    // Check shortform pipeline nodes on canvas
    await expect(
      page.locator(".wf-canvas").getByText("세로 영상 만들기")
    ).toBeVisible();
    await expect(
      page.locator(".wf-canvas").getByText("YouTube Shorts 공식 업로드")
    ).toBeVisible();
    await expect(
      page.locator(".wf-canvas").getByText("TikTok 숏폼 동시 배포")
    ).toBeVisible();
  });

  test("user can apply 1-click industry preset and insert variable chips without writing JSON or code", async ({
    page,
  }) => {
    await page.goto("/agency/ax");

    // Select a node (e.g. KakaoTalk or MediaPipe) by clicking on it
    const select = page.getByLabel("업무 흐름 선택");
    await select.selectOption({ label: "K-POP 오디션 검토 및 안내" });

    // Click on KakaoTalk node to open its settings
    const kakaoNode = page
      .locator(".react-flow__node")
      .filter({ hasText: "카카오톡 합격 알림톡 발송" })
      .first();
    await kakaoNode.click();

    // Check panel has the settings tab
    const settingsTab = page.getByRole("tab", { name: "설정" });
    await settingsTab.click();

    // Verify '실무 프리셋 (원클릭 자동완성)' section exists
    await expect(page.getByText("실무 프리셋 (원클릭 자동완성)")).toBeVisible();
    await expect(page.getByText("1차 서류 합격 통보")).toBeVisible();

    // Click preset
    await page.getByRole("button", { name: /1차 서류 합격 통보/ }).click();
    await expect(page.getByText(/프리셋이 적용되었습니다/)).toBeVisible();

    // Verify smart variables section exists
    await expect(page.getByText("데이터 변수 원클릭 삽입")).toBeVisible();
    const varChip = page.getByRole("button", { name: /지원자명/ });
    await expect(varChip).toBeVisible();

    // Click variable chip
    await varChip.click();
    await expect(page.getByText(/변수가/)).toBeVisible();
  });
});
