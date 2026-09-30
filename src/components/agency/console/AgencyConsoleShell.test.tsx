import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import { AgencySessionProvider } from "@/features/agency/AgencySessionProvider";
import { DemoProvider } from "@/features/demo/DemoProvider";

import { AgencyConsoleShell } from "./AgencyConsoleShell";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/agency"),
  useRouter: () => ({ replace: vi.fn() }),
}));

describe("AgencyConsoleShell", () => {
  it("groups the complete agency operation surface", () => {
    render(
      <AgencySessionProvider>
        <DemoProvider>
          <AgencyConsoleShell><div>workspace</div></AgencyConsoleShell>
        </DemoProvider>
      </AgencySessionProvider>,
    );

    expect(screen.getByRole("navigation", { name: "기획사 워크스페이스" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("href", "/agency");
    expect(screen.getByRole("link", { name: "지원자 찾기" })).toHaveAttribute("href", "/agency/discover");
    expect(screen.getByRole("link", { name: "지원자 관리" })).toHaveAttribute("href", "/agency/pipeline");
    expect(screen.getByRole("link", { name: "업무 자동화" })).toHaveAttribute("href", "/agency/ax");
    expect(screen.getByRole("link", { name: "콘텐츠 제작" })).toHaveAttribute("href", "/agency/content");
    expect(screen.getAllByText("준비 중", { selector: ".agency-console-nav__status" })).toHaveLength(2);
  });

  it("renders login page children without the sidebar chrome", () => {
    vi.mocked(usePathname).mockReturnValue("/agency/login");
    render(
      <AgencySessionProvider>
        <DemoProvider>
          <AgencyConsoleShell><p>login form</p></AgencyConsoleShell>
        </DemoProvider>
      </AgencySessionProvider>,
    );
    expect(screen.getByText("login form")).toBeInTheDocument();
    expect(screen.queryByLabelText("기획사 메뉴")).not.toBeInTheDocument();
  });
});
