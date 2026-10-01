import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { demoState } from "@/features/demo/fixtures";

import { AgencyOverview } from "./AgencyOverview";
import { createAgencyOverviewModel } from "./overviewModel";

describe("AgencyOverview", () => {
  it("shows real counts, newest applicants, and the way into the workflow editor", () => {
    render(<AgencyOverview agencyName="노바 엔터테인먼트" model={createAgencyOverviewModel(demoState)} />);

    expect(screen.getByRole("heading", { level: 1, name: "노바 엔터테인먼트" })).toBeInTheDocument();
    expect(screen.getByText("관리 중인 지원자").nextSibling).toHaveTextContent(String(demoState.candidates.length));
    expect(screen.getByRole("heading", { name: "새로 등록된 지원자" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "자동화 만들기" })).toHaveAttribute("href", "/agency/ax");
  });
});
