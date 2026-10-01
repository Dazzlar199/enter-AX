import { describe, expect, it } from "vitest";

import { scanRisks } from "./safety";

describe("scanRisks", () => {
  it("flags phone numbers, payment demands and off-site chat invites", () => {
    expect(scanRisks("연락은 010-1234-5678로 주세요").map((f) => f.kind)).toEqual(["contact"]);
    expect(scanRisks("프로필 촬영비 30만원 입금하면 합격").map((f) => f.kind)).toEqual(["payment"]);
    expect(scanRisks("https://open.kakao.com/o/abc 로 들어오세요").map((f) => f.kind)).toEqual(["offsite"]);
  });

  it("returns nothing for ordinary posts", () => {
    expect(scanRisks("보컬 레슨 후기 공유해요. 2차 오디션은 다음 주래요")).toEqual([]);
    expect(scanRisks("")).toEqual([]);
  });
});
