import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AccountBadge } from "./AccountBadge";
import { AgencySessionProvider, useAgencySession } from "@/features/agency/AgencySessionProvider";

vi.mock("@/features/agency/AgencySessionProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/agency/AgencySessionProvider")>();
  return { ...actual, useAgencySession: vi.fn(actual.useAgencySession) };
});

describe("AccountBadge", () => {
  it("renders nothing while there is no signed-in profile", () => {
    render(
      <AgencySessionProvider>
        <AccountBadge />
      </AgencySessionProvider>,
    );
    expect(screen.queryByLabelText("로그인 계정")).not.toBeInTheDocument();
  });

  it("shows the signed-in staff member's name, role, and a working logout button", async () => {
    const logout = vi.fn();
    vi.mocked(useAgencySession).mockReturnValue({
      profile: { email: "owner@example.test", displayName: "김담당", tenantId: "tenant-1", role: "owner" },
      status: "ready",
      login: vi.fn(),
      logout,
    });

    const user = userEvent.setup();
    render(<AccountBadge />);

    expect(screen.getByLabelText("로그인 계정")).toBeInTheDocument();
    expect(screen.getByText("김담당")).toBeInTheDocument();
    expect(screen.getByText("관리자")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(logout).toHaveBeenCalledOnce();

    vi.mocked(useAgencySession).mockRestore();
  });
});
