import { describe, expect, it } from "vitest";

import { sanitizePublicText } from "./sanitize";

describe("sanitizePublicText", () => {
  it("masks phone numbers in every common format", () => {
    for (const raw of ["010-1234-5678", "01012345678", "010 1234 5678", "010.1234.5678"]) {
      expect(sanitizePublicText(`연락 ${raw} 로`)).toEqual({ text: "연락 010-****-**** 로", changed: true });
    }
  });

  it("removes off-site chat invites but keeps ordinary links", () => {
    expect(sanitizePublicText("들어와요 https://open.kakao.com/o/abc123 지금").text).toBe("들어와요 [외부 채팅 링크 삭제됨] 지금");
    expect(sanitizePublicText("t.me/scamchannel").changed).toBe(true);
    expect(sanitizePublicText("공식 사이트 https://example.com/audition")).toEqual({ text: "공식 사이트 https://example.com/audition", changed: false });
  });

  it("leaves longer digit runs alone", () => {
    expect(sanitizePublicText("주문번호 20260101123456789").changed).toBe(false);
  });
});
