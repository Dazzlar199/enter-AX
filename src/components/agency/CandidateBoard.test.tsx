import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { demoState } from "@/features/demo/fixtures";

import { CandidateBoard } from "./CandidateBoard";

it("moves a candidate with the accessible stage menu", async () => {
  const user = userEvent.setup();
  const onMove = vi.fn();
  render(<CandidateBoard candidates={demoState.candidates} talents={demoState.talents} onMove={onMove} />);
  expect(screen.getByRole("heading", { name: "진행 현황" })).toBeInTheDocument();
  expect(screen.getByText("관리 중인 지원자")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "새 지원자" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "내부 검토" })).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("candidate-1 단계 이동"), "internal-review");
  expect(onMove).toHaveBeenCalledWith("candidate-1", "internal-review");
  expect(screen.getAllByText(/최근 활동/).length).toBeGreaterThan(0);
});
