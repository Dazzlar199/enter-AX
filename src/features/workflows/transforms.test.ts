import { describe, expect, it } from "vitest";

import { aggregateItems, dedupeItems, filterItems, limitItems, pickFields, readPath, renderTemplate, setFields, sortItems, switchItems, toItems, waitSeconds } from "./transforms";

describe("workflow transforms", () => {
  it("reads dotted paths and normalizes API responses into items", () => {
    expect(readPath({ data: { items: [1] } }, "data.items")).toEqual([1]);
    expect(toItems([{ a: 1 }, 2])).toEqual([{ a: 1 }, { value: 2 }]);
    expect(toItems({ a: 1 })).toEqual([{ a: 1 }]);
    expect(toItems(null)).toEqual([]);
  });

  it("filters by condition and keeps only chosen fields", () => {
    const items = [{ 분야: "보컬, 댄스", age: 19 }, { 분야: "배우", age: 24 }];
    expect(filterItems(items, { field: "분야", operator: "contains", value: "보컬" })).toHaveLength(1);
    expect(filterItems(items, { field: "age", operator: "gt", value: "20" })).toEqual([{ 분야: "배우", age: 24 }]);
    expect(() => filterItems(items, { field: "", operator: "contains", value: "" })).toThrow();
    expect(pickFields(items, "age")).toEqual([{ age: 19 }, { age: 24 }]);
  });

  it("renders templates from the first item and the item count", () => {
    expect(renderTemplate("{{count}}명 · {{name}}", [{ name: "루아" }, { name: "솔" }])).toBe("2명 · 루아");
    expect(renderTemplate("{{missing}}", [])).toBe("");
  });
});

describe("workflow data nodes", () => {
  const items = [{ n: "b", s: 80 }, { n: "a", s: 95 }, { n: "b", s: 70 }];

  it("sorts numbers numerically and text by Korean collation", () => {
    expect(sortItems(items, { field: "s", direction: "desc" }).map((i) => i.s)).toEqual([95, 80, 70]);
    expect(sortItems([{ n: "나" }, { n: "가" }], { field: "n", direction: "asc" })).toEqual([{ n: "가" }, { n: "나" }]);
    expect(() => sortItems(items, { field: "" })).toThrow();
  });

  it("limits, dedupes and aggregates", () => {
    expect(limitItems(items, { count: "2" })).toHaveLength(2);
    expect(() => limitItems(items, { count: "0" })).toThrow();
    expect(dedupeItems(items, { field: "n" })).toHaveLength(2);
    expect(aggregateItems(items, { field: "s", outputName: "점수" })).toEqual([{ count: 3, 점수: [80, 95, 70] }]);
  });

  it("sets templated fields per item", () => {
    expect(setFields([{ n: "a" }], { fields: "상태 = 검토중\n제목 = {{n}} 님" })).toEqual([{ n: "a", 상태: "검토중", 제목: "a 님" }]);
    expect(() => setFields([], { fields: "잘못된줄" })).toThrow();
  });

  it("routes items to the first matching switch case, with a fallback", () => {
    const routed = switchItems(
      [{ 분야: "보컬, 댄스" }, { 분야: "배우" }, { 분야: "모델" }],
      { field: "분야", operator: "contains", case1: "보컬", case2: "배우", case3: "" },
    );
    expect(routed.case1).toHaveLength(1);
    expect(routed.case2).toHaveLength(1);
    expect(routed.case3).toHaveLength(0);
    expect(routed.other).toEqual([{ 분야: "모델" }]);
    expect(() => switchItems([], { field: "분야" })).toThrow("경우");
  });

  it("clamps wait time and rejects invalid values", () => {
    expect(waitSeconds({ seconds: "5" })).toBe(5);
    expect(waitSeconds({ seconds: "999" })).toBe(30);
    expect(() => waitSeconds({ seconds: "-1" })).toThrow();
    expect(() => waitSeconds({ seconds: "abc" })).toThrow();
  });
});
