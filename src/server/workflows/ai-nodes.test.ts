import { describe, expect, it } from "vitest";

import { aiClassify, aiExtract, aiGenerate } from "./ai-nodes";

const reply = (results: unknown[]) => async () => JSON.stringify({ results });

describe("AI workflow nodes", () => {
  it("classifies each item and falls back to 미분류 for unknown labels", async () => {
    const out = await aiClassify(
      { labels: "보컬, 댄스", instruction: "주 특기" },
      [{ n: 1 }, { n: 2 }],
      reply([{ label: "보컬", reason: "노래 위주" }, { label: "연기", reason: "x" }]),
    );
    expect(out.map((i) => i.분류)).toEqual(["보컬", "미분류"]);
  });

  it("refuses pass/fail and appearance labels", async () => {
    await expect(aiClassify({ labels: "합격, 불합격" }, [{}], reply([]))).rejects.toThrow("만들 수 없습니다");
    await expect(aiClassify({ labels: "상, 외모 우수" }, [{}], reply([]))).rejects.toThrow("만들 수 없습니다");
  });

  it("rejects mismatched response lengths and oversized batches", async () => {
    await expect(aiExtract({ fields: "연락처" }, [{}, {}], reply([{ 연락처: "x" }]))).rejects.toThrow("건수");
    await expect(aiGenerate({ instruction: "안내문" }, Array.from({ length: 21 }, () => ({})), reply([]))).rejects.toThrow("20건");
  });

  it("extracts fields with null for missing values and marks drafts for review", async () => {
    const extracted = await aiExtract({ fields: "나이, 연락처" }, [{ t: "x" }], reply([{ 나이: "17" }]));
    expect(extracted[0]).toMatchObject({ 나이: "17", 연락처: null });
    const drafted = await aiGenerate({ instruction: "안내문" }, [{ n: "a" }], reply([{ text: " 안녕하세요 " }]));
    expect(drafted[0]).toMatchObject({ 초안: "안녕하세요", 초안상태: "AI 초안 · 담당자 검토 후 사용" });
  });
});
