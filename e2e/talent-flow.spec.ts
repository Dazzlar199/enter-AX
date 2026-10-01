import { expect, test } from "@playwright/test";

test("talent can move through profile, media and consent steps", async ({ page }) => {
  await page.goto("/talent/onboarding");
  await page.getByLabel("이름 또는 활동명").fill("테스트 지원자");
  await page.getByLabel("생년월일").fill("2002-04-18");
  await page.getByLabel("거주 지역").fill("서울");
  await page.getByLabel("자기소개").fill("무대와 카메라 앞에서 성장하는 지원자입니다.");
  await page.getByLabel("아이돌").check();
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("heading", { name: "얼굴 사진 3장" })).toBeVisible();
  const image = { name: "face.png", mimeType: "image/png", buffer: Buffer.from("demo-image") };
  await page.locator('input[type="file"]').nth(0).setInputFiles(image);
  await page.locator('input[type="file"]').nth(1).setInputFiles(image);
  await page.locator('input[type="file"]').nth(2).setInputFiles(image);
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("heading", { name: "보컬·댄스 자료" })).toBeVisible();
  await expect(page.getByText(/YouTube는 재생 전용/).first()).toBeVisible();
  const video = { name: "vocal.mp4", mimeType: "video/mp4", buffer: Buffer.from("demo-video") };
  await page.getByLabel("보컬 영상 파일").setInputFiles(video);
  await page.getByRole("radio", { name: "댄스 YouTube" }).check();
  await page.getByLabel("댄스 YouTube 주소").fill("https://youtu.be/dQw4w9WgXcQ");
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("heading", { name: "공개 범위와 동의" })).toBeVisible();
  await page.getByRole("checkbox", { name: /개인정보 처리와 선택한 범위/ }).check();
  await page.getByRole("button", { name: "프로필 등록" }).click();
  await expect(page.getByRole("heading", { name: "프로필을 등록했어요" })).toBeVisible();
});

test("talent can confirm an offer response", async ({ page }) => {
  await page.goto("/talent/offers");
  const accept = page.getByRole("button", { name: "제안 수락" });
  if (await accept.count()) {
    await accept.first().click();
    await page.getByRole("button", { name: "확인" }).click();
    await expect(page.getByText("수락함").first()).toBeVisible();
  }
});
