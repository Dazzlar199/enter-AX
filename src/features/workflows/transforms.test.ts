import { describe, expect, it } from "vitest";

import { filterItems, pickFields, readPath, renderTemplate, toItems } from "./transforms";

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
