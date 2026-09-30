import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgencySessionProvider } from "@/features/agency/AgencySessionProvider";

import AgencyLoginPage from "./page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("AgencyLoginPage", () => {
  beforeEach(() => {
    replace.mockClear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows an error message when login fails", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { error: { code: "UNAUTHENTICATED", message: "이메일 또는 비밀번호가 올바르지 않습니다.", requestId: "req-1" } },
      { status: 401 },
    ));
    const user = userEvent.setup();
    render(<AgencySessionProvider><AgencyLoginPage /></AgencySessionProvider>);

    await user.type(screen.getByLabelText("이메일"), "owner@example.test");
    await user.type(screen.getByLabelText("비밀번호"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("이메일 또는 비밀번호가 올바르지 않습니다.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to the console on success", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { profile: { email: "owner@example.test", displayName: "김담당", tenantId: "t-1", role: "owner" } },
      { status: 200 },
    ));
    const user = userEvent.setup();
    render(<AgencySessionProvider><AgencyLoginPage /></AgencySessionProvider>);

    await user.type(screen.getByLabelText("이메일"), "owner@example.test");
    await user.type(screen.getByLabelText("비밀번호"), "correct horse battery staple");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/agency"));
  });
});
