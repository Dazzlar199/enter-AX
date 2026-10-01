import type { TalentField, TalentProfile } from "@/types/domain";

import type { WorkflowItem } from "./types";

const fieldLabel: Record<TalentField, string> = { idol: "아이돌", vocal: "보컬", dance: "댄스", actor: "배우", model: "모델" };

/** Reads a dotted path such as `data.items` from any JSON value. */
export function readPath(value: unknown, path: string): unknown {
  if (!path.trim()) return value;
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object") return (current as Record<string, unknown>)[key.trim()];
    return undefined;
  }, value);
}

export function toItems(value: unknown): WorkflowItem[] {
  if (Array.isArray(value)) return value.map((entry) => (entry && typeof entry === "object" && !Array.isArray(entry) ? (entry as WorkflowItem) : { value: entry }));
  if (value && typeof value === "object") return [value as WorkflowItem];
  if (value === undefined || value === null || value === "") return [];
  return [{ value }];
}

export function talentsToItems(talents: TalentProfile[], params: Record<string, string>): WorkflowItem[] {
  return talents
    .filter((talent) => params.field === "all" || !params.field || talent.fields.includes(params.field as TalentField))
    .filter((talent) => params.offers !== "open" || talent.openToOffers)
    .map((talent) => ({
      id: talent.id,
      활동명: talent.stageName,
      분야: talent.fields.map((field) => fieldLabel[field]).join(", "),
      지역: talent.region,
      연령대: talent.ageBand,
      소개: talent.bio,
      제안수신: talent.openToOffers,
      등록일: talent.createdAt.slice(0, 10),
    }));
}

export function filterItems(items: WorkflowItem[], params: Record<string, string>): WorkflowItem[] {
  const field = params.field?.trim();
  if (!field) throw new Error("필터할 필드를 입력해 주세요.");
  const expected = (params.value ?? "").trim();
  return items.filter((item) => {
    const actual = readPath(item, field);
    const text = actual === undefined || actual === null ? "" : String(actual);
    switch (params.operator) {
      case "equals":
        return text === expected;
      case "not_empty":
        return text.trim() !== "";
      case "gt":
        return Number(text) > Number(expected);
      case "contains":
      default:
        return text.toLowerCase().includes(expected.toLowerCase());
    }
  });
}

export function pickFields(items: WorkflowItem[], keep: string): WorkflowItem[] {
  const keys = keep.split(",").map((key) => key.trim()).filter(Boolean);
  if (keys.length === 0) return items;
  return items.map((item) => Object.fromEntries(keys.map((key) => [key, readPath(item, key)])));
}

/** Replaces `{{field}}` with the first item's value and `{{count}}` with the item count. */
export function renderTemplate(template: string, items: WorkflowItem[]): string {
  const first = items[0] ?? {};
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    if (key === "count") return String(items.length);
    const value = readPath(first, key);
    if (value === undefined || value === null) return "";
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  });
}
