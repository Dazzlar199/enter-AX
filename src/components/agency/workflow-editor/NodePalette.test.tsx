import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { NodeDefinition } from "@/features/workflows/catalog";

import { NodePalette } from "./NodePalette";

const demoStep: NodeDefinition = {
  type: "kakaotalk.alimtalk",
  label: "카카오톡 안내 준비",
  description: "안내 내용을 확인합니다.",
  category: "integration",
  icon: { glyph: "megaphone" },
  runtime: "client",
  execution: "demo",
  params: [],
  defaults: {},
};

describe("NodePalette", () => {
  it("uses work-language labels and clearly marks simulated steps", () => {
    render(<NodePalette nodes={[demoStep]} onAdd={vi.fn()} onOpenCustomModal={vi.fn()} />);

    expect(screen.getByText("단계 목록")).toBeInTheDocument();
    expect(screen.getByText("데모 단계")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /카카오톡 안내 준비/ })).toBeEnabled();
  });

  it("prevents adding and creating steps in read-only mode", () => {
    render(<NodePalette nodes={[demoStep]} readOnly onAdd={vi.fn()} onOpenCustomModal={vi.fn()} />);

    expect(screen.getByRole("button", { name: /카카오톡 안내 준비/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "맞춤 단계 만들기" })).not.toBeInTheDocument();
  });
});
