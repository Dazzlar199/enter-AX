import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AccountBadge } from "./AccountBadge";
import { AgencySessionProvider } from "@/features/agency/AgencySessionProvider";

describe("AccountBadge", () => {
  it("renders nothing while there is no signed-in profile", () => {
    render(
      <AgencySessionProvider>
        <AccountBadge />
      </AgencySessionProvider>,
    );
    expect(screen.queryByLabelText("로그인 계정")).not.toBeInTheDocument();
  });
});
