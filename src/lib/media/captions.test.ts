import { describe, expect, it } from "vitest";

import { microChunkRelativeCaptions, relativeCaptionsForClip } from "./captions";
import type { TranscriptChunk } from "./transcribe";

describe("microChunkRelativeCaptions", () => {
  it("preserves short captions without unnecessary splitting", () => {
    const input = [{ start: 1, end: 2.2, text: "안녕하세요" }];
    const result = microChunkRelativeCaptions(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ start: 1, end: 2.2, text: "안녕하세요" });
  });

  it("splits long sentences into 2~4 word chunks with proportional time distribution", () => {
    const input = [
      {
        start: 0,
        end: 6.0,
        text: "안녕하세요 여러분 오늘은 저희 세 번째 미니앨범 컴백 쇼케이스 현장입니다",
      },
    ];
    const result = microChunkRelativeCaptions(input, { maxWordsPerChunk: 3, maxDurationSec: 2.0 });

    // Should be split into multiple chunks
    expect(result.length).toBeGreaterThanOrEqual(3);
    // Start should match 0, last end should match 6.0
    expect(result[0].start).toBe(0);
    expect(result[result.length - 1].end).toBe(6.0);

    // Each chunk should have reasonable text and increasing timestamps
    for (let i = 0; i < result.length; i++) {
      expect(result[i].end).toBeGreaterThan(result[i].start);
      if (i > 0) {
        expect(result[i].start).toBeCloseTo(result[i - 1].end, 2);
      }
    }
  });

  it("respects punctuation breaks like commas and question marks", () => {
    const input = [
      {
        start: 2.0,
        end: 5.5,
        text: "준비되셨나요? 네, 지금 바로 시작합니다!",
      },
    ];
    const result = microChunkRelativeCaptions(input, { maxWordsPerChunk: 4 });
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].text).toContain("준비되셨나요?");
  });
});

describe("relativeCaptionsForClip", () => {
  const sampleChunks: TranscriptChunk[] = [
    { start: 0, end: 4, text: "앞부분 무관한 내용입니다" },
    { start: 5, end: 12, text: "하이라이트 첫 번째 파트입니다 정말 멋진 춤과 노래를 보여줍니다" },
    { start: 13, end: 18, text: "마무리 소감입니다" },
  ];

  it("filters chunks outside of [clipStart, clipEnd] and offsets times to 0", () => {
    const result = relativeCaptionsForClip(sampleChunks, 5, 12, { microChunk: false });
    expect(result).toHaveLength(1);
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(7);
  });

  it("applies micro-chunking by default", () => {
    const result = relativeCaptionsForClip(sampleChunks, 5, 12);
    expect(result.length).toBeGreaterThan(1);
    expect(result[0].start).toBe(0);
    expect(result[result.length - 1].end).toBe(7);
  });
});
