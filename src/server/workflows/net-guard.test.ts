import { describe, expect, it } from "vitest";

import { assertPublicUrl, isPrivateAddress } from "./net-guard";

describe("workflow network guard", () => {
  it("classifies private and public addresses", () => {
    for (const address of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
    for (const address of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700::1111"]) {
      expect(isPrivateAddress(address), address).toBe(false);
    }
  });

  it("rejects unsafe URLs before any request is made", async () => {
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow("http 또는 https");
    await expect(assertPublicUrl("http://127.0.0.1/admin")).rejects.toThrow("내부망");
    await expect(assertPublicUrl("http://[::1]/")).rejects.toThrow("내부망");
    await expect(assertPublicUrl("https://user:pass@example.com")).rejects.toThrow("계정 정보");
    await expect(assertPublicUrl("not a url")).rejects.toThrow("올바른 URL");
  });
});
