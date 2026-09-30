import { describe, expect, it } from "vitest";

import { agencyLoginSchema } from "./agency-schema";

describe("agency login schema", () => {
  it("lowercases and trims the email", () => {
    expect(agencyLoginSchema.parse({ email: "  Owner@Example.TEST ", password: "12345678" }).email).toBe("owner@example.test");
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(agencyLoginSchema.safeParse({ email: "a@b.test", password: "1234567" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(agencyLoginSchema.safeParse({ email: "not-an-email", password: "12345678" }).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(agencyLoginSchema.safeParse({ email: "a@b.test", password: "12345678", role: "owner" }).success).toBe(false);
  });
});
