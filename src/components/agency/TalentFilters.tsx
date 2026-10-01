import type { TalentFilters as Filters } from "@/features/agency/filters";

const selectFields: Array<{ key: "field" | "ageBand" | "region" | "visibility"; label: string; options: Array<[string, string]> }> = [
  { key: "field", label: "지원 분야", options: [["idol", "아이돌"], ["vocal", "보컬"], ["dance", "댄스"], ["actor", "배우"], ["model", "모델"]] },
  { key: "ageBand", label: "연령대", options: [["teen", "10대"], ["20s", "20대"], ["30s", "30대"]] },
  { key: "region", label: "지역", options: ["서울", "부산", "인천", "대전", "광주"].map((region) => [region, region]) },
  { key: "visibility", label: "공개 범위", options: [["verified-agencies", "기획사 전용"], ["public", "전체 공개"]] },
];

/** Horizontal filter bar: every control is a labelled select so it stays keyboard- and screen-reader friendly. */
export function TalentFilters({ filters, onChange }: { filters: Filters; onChange: (filters: Filters) => void }) {
  const active = Object.values(filters).filter((value) => value !== undefined && value !== false).length;
  return (
    <div aria-label="탐색 조건" className="ag-filters" role="group">
      {selectFields.map((field) => (
        <label className="ag-select" data-active={filters[field.key] ? "" : undefined} key={field.key}>
          <span className="sr-only">{field.label}</span>
          <select
            aria-label={field.label}
            value={(filters[field.key] as string | undefined) ?? ""}
            onChange={(event) => onChange({ ...filters, [field.key]: event.target.value || undefined })}
          >
            <option value="">{field.label}: 전체</option>
            {field.options.map(([value, label]) => <option key={value} value={value}>{field.label}: {label}</option>)}
          </select>
        </label>
      ))}
      <label className="ag-toggle">
        <input checked={filters.directFileOnly ?? false} type="checkbox" onChange={(event) => onChange({ ...filters, directFileOnly: event.target.checked || undefined })} />
        원본 파일 보유
      </label>
      {active ? <button className="ag-reset" type="button" onClick={() => onChange({})}>필터 초기화</button> : null}
    </div>
  );
}
