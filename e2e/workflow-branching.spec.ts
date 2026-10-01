import { expect, test } from "@playwright/test";

test("if-node exposes two labelled outputs and the run reaches the approval gate", async ({ page }) => {
  await page.goto("/agency/ax");
  await page.getByRole("combobox", { name: "업무 흐름 선택" }).selectOption({ label: "분야별로 갈라 담당자 확인" });

  await expect(page.locator('.react-flow__handle[data-handleid="true"]')).toHaveCount(1);
  await expect(page.locator('.react-flow__handle[data-handleid="false"]')).toHaveCount(1);

  await page.getByRole("button", { name: "업무 흐름 시작", exact: true }).click();
  await expect(page.getByText("승인이 필요합니다")).toBeVisible();
});
