"use client";

import { useMemo, useState } from "react";

import { TalentFilters } from "@/components/agency/TalentFilters";
import { TalentGrid } from "@/components/agency/TalentGrid";
import { filterTalents, type TalentFilters as FilterState } from "@/features/agency/filters";
import { useDemo } from "@/features/demo/DemoProvider";

export default function DiscoverPage() {
  const { state, toggleFavorite } = useDemo();
  const [filters, setFilters] = useState<FilterState>({});
  const talents = useMemo(() => filterTalents(state.talents, filters), [state.talents, filters]);
  return (
    <div className="ag-page">
      <header className="ag-head">
        <div>
          <h1>지원자 찾기</h1>
          <p>등록된 지원자 {state.talents.length}명 중 {talents.length}명</p>
        </div>
      </header>
      <TalentFilters filters={filters} onChange={setFilters} />
      <TalentGrid favorites={state.favoriteTalentIds} talents={talents} onFavorite={toggleFavorite} />
    </div>
  );
}
