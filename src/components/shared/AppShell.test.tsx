import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DemoProvider } from "@/features/demo/DemoProvider";

import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("provides brand, demo disclosure, navigation, and a skip link", () => {
    render(
      <DemoProvider>
        <AppShell mode="public">
          <main>본문</main>
        </AppShell>
      </DemoProvider>,
    );

    expect(screen.getByText("ENTER—AX")).toBeInTheDocument();
    expect(screen.getByText("시연 데이터")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "본문으로 건너뛰기" })).toHaveAttribute("href", "#main-content");
  });
});
