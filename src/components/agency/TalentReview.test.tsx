import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { demoState } from "@/features/demo/fixtures";

import { TalentReview } from "./TalentReview";

it("disables the offer button for a view-only role even when the agency is verified", () => {
  render(
    <TalentReview
      agency={{ ...demoState.agencies[0], verification: "verified" }}
      talent={demoState.talents[0]}
      isViewOnly
      onCreateOffer={vi.fn()}
      onFavorite={vi.fn()}
      onReview={vi.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "오디션 제안 보내기" })).toBeDisabled();
});

it("still shows review media to a view-only role at a verified agency", () => {
  render(
    <TalentReview
      agency={{ ...demoState.agencies[0], verification: "verified" }}
      talent={demoState.talents[0]}
      isViewOnly
      onCreateOffer={vi.fn()}
      onFavorite={vi.fn()}
      onReview={vi.fn()}
    />,
  );
  expect(screen.getByText("심사 자료")).toBeInTheDocument();
  expect(screen.queryByText("검증 완료 후 열람할 수 있습니다.")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "오디션 제안 보내기" })).toBeDisabled();
});

it("blocks profile media and offers for a pending agency", () => {
  render(<TalentReview agency={demoState.agencies[2]} talent={demoState.talents[0]} onCreateOffer={vi.fn()} onFavorite={vi.fn()} onReview={vi.fn()} />);
  expect(screen.getByText("검증 완료 후 열람할 수 있습니다.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "오디션 제안 보내기" })).toBeDisabled();
});

it("submits a complete contact request from a verified agency", async () => {
  const user = userEvent.setup();
  const onCreateOffer = vi.fn();
  render(<TalentReview agency={demoState.agencies[0]} talent={demoState.talents[0]} onCreateOffer={onCreateOffer} onFavorite={vi.fn()} onReview={vi.fn()} />);
  await user.type(screen.getByLabelText("제안 제목"), "비공개 추가 오디션");
  await user.type(screen.getByLabelText("제안 목적"), "보컬 확인");
  await user.type(screen.getByLabelText("회신 기한"), "2026-09-30");
  await user.type(screen.getByLabelText("메시지"), "참여를 제안합니다.");
  await user.click(screen.getByRole("button", { name: "오디션 제안 보내기" }));
  expect(onCreateOffer).toHaveBeenCalledWith(expect.objectContaining({ talentId: "talent-lua", title: "비공개 추가 오디션", purpose: "보컬 확인", department: "신인개발팀", message: "참여를 제안합니다." }));
});
