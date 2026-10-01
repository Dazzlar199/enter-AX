import { describe, expect, it } from "vitest";

import { ASPECT_TARGETS, CAPTION_PRESETS, formatSrtTime, OVERLAY_STYLE } from "./clip";

describe("clip formatting & presets", () => {
  it("formats srt timestamps with milliseconds precision", () => {
    expect(formatSrtTime(0)).toBe("00:00:00,000");
    expect(formatSrtTime(75.321)).toBe("00:01:15,321");
    expect(formatSrtTime(3665.05)).toBe("01:01:05,050");
  });

  it("defines standard 9:16, 1:1, and 16:9 aspect targets", () => {
    expect(ASPECT_TARGETS["9:16"]).toEqual({ tw: 9, th: 16, outW: 1080, outH: 1920 });
    expect(ASPECT_TARGETS["1:1"]).toEqual({ tw: 1, th: 1, outW: 1080, outH: 1080 });
    expect(ASPECT_TARGETS["16:9"]).toEqual({ tw: 16, th: 9, outW: 1920, outH: 1080 });
  });

  it("configures mobile safe zones for all caption style presets", () => {
    const presets = ["apple", "pill", "viral", "classic"] as const;

    for (const preset of presets) {
      const style = CAPTION_PRESETS[preset];
      expect(style).toBeDefined();
      // Alignment 2 = bottom-center in ASS
      expect(style).toContain("Alignment=2");
      // Safe margins from bottom, left, right
      expect(style).toContain("MarginV=380");
      expect(style).toContain("MarginL=90");
      expect(style).toContain("MarginR=200");
    }
  });

  it("configures top safe zone for overlay style", () => {
    // Top safe zone: MarginV=260 avoids top system status bar & YouTube headers
    expect(OVERLAY_STYLE).toContain("MarginV=260");
  });
});
