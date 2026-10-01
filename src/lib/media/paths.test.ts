import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolveGeneratedClip } from "./paths";

describe("resolveGeneratedClip", () => {
  it("resolves clips inside public/generated", () => {
    expect(resolveGeneratedClip("/generated/job1/clip-1.mp4")).toBe(
      path.join(process.cwd(), "public", "generated", "job1", "clip-1.mp4"),
    );
  });

  it("rejects traversal and foreign prefixes", () => {
    expect(resolveGeneratedClip("/generated/../../.env")).toBeNull();
    expect(resolveGeneratedClip("/generated/a/../../../etc/passwd")).toBeNull();
    expect(resolveGeneratedClip("/other/clip.mp4")).toBeNull();
    expect(resolveGeneratedClip(undefined)).toBeNull();
  });
});
