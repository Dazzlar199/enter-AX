import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DemoProvider } from "@/features/demo/DemoProvider";

import Home from "./page";

describe("Enter-AX landing", () => {
  it("states the product plainly and routes each audience to its start", () => {
    render(
      <DemoProvider>
        <Home />
      </DemoProvider>,
    );

    expect(screen.getByRole("heading", { level: 1, name: /오디션 지원은 한 번에/ })).toBeInTheDocument();
    expect(screen.queryByText(/LIVE INTERACTIVE OS|CREATIVE LAB/)).not.toBeInTheDocument();
    const talentLinks = screen.getAllByRole("link", { name: "오디션 프로필 등록" });
    const agencyLinks = screen.getAllByRole("link", { name: "기획사로 시작하기" });
    expect(talentLinks).toHaveLength(3);
    expect(agencyLinks).toHaveLength(3);
    talentLinks.forEach((link) => expect(link).toHaveAttribute("href", "/talent/onboarding"));
    agencyLinks.forEach((link) => expect(link).toHaveAttribute("href", "/agency"));
  });
});
