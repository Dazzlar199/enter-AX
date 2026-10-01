import { expect, test } from "@playwright/test";

test("landing explains the product and routes talent and agencies", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /오디션 지원은 한 번에/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /업무 자동화 화면/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "오디션 프로필 등록" }).first()).toHaveAttribute("href", "/talent/onboarding");
  await expect(page.getByRole("link", { name: "기획사로 시작하기" }).first()).toHaveAttribute("href", "/agency");
  await expect(page.getByText(/Dazzling Studio/i)).toHaveCount(0);
});
