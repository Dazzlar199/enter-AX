import { afterEach, describe, expect, it, vi } from "vitest";

import { planShortformStructure } from "./plan";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("planShortformStructure", () => {
  it("parses a valid Ollama plan into ordered, non-overlapping segments", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            response: JSON.stringify({
              contentType: "아이돌 퍼포먼스",
              segments: [
                { role: "하이라이트", start: 10, end: 25, caption: "가장 뜨거운 순간" },
                { role: "소개", start: 0, end: 5, caption: "아이돌 소개" },
              ],
            }),
          }),
      }),
    );

    const plan = await planShortformStructure([{ start: 0, end: 4, text: "안녕하세요" }], 30);

    expect(plan).toEqual({
      contentType: "아이돌 퍼포먼스",
      segments: [
        { role: "소개", start: 0, end: 5, caption: "아이돌 소개" },
        { role: "하이라이트", start: 10, end: 25, caption: "가장 뜨거운 순간" },
      ],
    });
  });

  it("drops overlapping segments and keeps the earlier one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            response: JSON.stringify({
              contentType: "인터뷰",
              segments: [
                { role: "소개", start: 0, end: 10, caption: "소개" },
                { role: "답변", start: 5, end: 20, caption: "겹치는 구간" },
              ],
            }),
          }),
      }),
    );

    const plan = await planShortformStructure([], 30);

    expect(plan.segments).toEqual([{ role: "소개", start: 0, end: 10, caption: "소개" }]);
  });

  it("trims segments that blow past the target duration budget", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            response: JSON.stringify({
              contentType: "뮤직비디오",
              segments: [
                { role: "1", start: 0, end: 20, caption: "구간1" },
                { role: "2", start: 20, end: 40, caption: "구간2" },
                { role: "3", start: 40, end: 60, caption: "구간3" },
                { role: "4", start: 60, end: 80, caption: "구간4" },
                { role: "5", start: 80, end: 100, caption: "구간5" },
              ],
            }),
          }),
      }),
    );

    const plan = await planShortformStructure([], 100, 30);
    const totalDuration = plan.segments.reduce((sum, segment) => sum + (segment.end - segment.start), 0);

    expect(totalDuration).toBeLessThanOrEqual(45);
    expect(plan.segments.length).toBeLessThan(5);
  });

  it("throws a friendly error when Ollama is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")));

    await expect(planShortformStructure([], 30)).rejects.toThrow(/Ollama/);
  });

  it("throws when the model returns no valid segments", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: JSON.stringify({ segments: [] }) }),
      }),
    );

    await expect(planShortformStructure([], 30)).rejects.toThrow(/유효한 기획안/);
  });
});
