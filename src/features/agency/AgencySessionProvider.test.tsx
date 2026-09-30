import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./session-client", () => ({
  fetchAgencySession: vi.fn(),
  loginAgency: vi.fn(),
  logoutAgency: vi.fn(),
}));

describe("AgencySessionProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_BACKEND_MODE", "api");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("settles to a signed-out ready state when fetchAgencySession throws (e.g. a revoked membership's FORBIDDEN)", async () => {
    const { fetchAgencySession } = await import("./session-client");
    vi.mocked(fetchAgencySession).mockRejectedValue(new Error("Forbidden"));

    const { AgencySessionProvider, useAgencySession } = await import("./AgencySessionProvider");

    function Probe() {
      const { profile, status } = useAgencySession();
      return <div data-testid="probe">{`${status}:${profile ? profile.email : "none"}`}</div>;
    }

    render(
      <AgencySessionProvider>
        <Probe />
      </AgencySessionProvider>,
    );

    // Must not stay stuck on "loading" forever - it should settle to ready/signed-out.
    await waitFor(() => {
      expect(screen.getByTestId("probe")).toHaveTextContent("ready:none");
    });
  });
});
