"use client";

import { CandidateBoard } from "@/components/agency/CandidateBoard";
import { useDemo } from "@/features/demo/DemoProvider";

export default function PipelinePage() {
  const { state, moveCandidate } = useDemo();
  return (
    <div className="ag-page ag-page--wide">
      <header className="ag-head">
        <div>
          <h1>지원자 관리</h1>
          <p>지원자별 진행 단계와 담당자, 다음 할 일을 팀이 함께 봅니다.</p>
        </div>
      </header>
      <CandidateBoard candidates={state.candidates} talents={state.talents} onMove={moveCandidate} />
    </div>
  );
}
