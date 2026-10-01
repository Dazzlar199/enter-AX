import Image from "next/image";

import { fieldLabel, talentCover } from "@/features/talent/cover";
import type { Candidate, PipelineStage, TalentProfile } from "@/types/domain";

const stages: Array<{ id: PipelineStage; label: string }> = [
  { id: "discovered", label: "새 지원자" },
  { id: "saved", label: "관심" },
  { id: "internal-review", label: "내부 검토" },
  { id: "offer-sent", label: "제안 보냄" },
  { id: "accepted", label: "수락" },
  { id: "follow-up", label: "미팅·추가 오디션" },
  { id: "final-review", label: "최종 심사" },
  { id: "completed", label: "완료" },
  { id: "on-hold", label: "보류" },
];

/** Activity labels store raw stage ids ("internal-review 단계로 이동"); show the Korean stage name instead. */
function readableActivity(label: string | undefined): string {
  if (!label) return "";
  return stages.reduce((text, stage) => text.replace(stage.id, stage.label), label);
}

export function CandidateBoard({
  candidates,
  talents,
  onMove,
}: {
  candidates: Candidate[];
  talents: TalentProfile[];
  onMove: (candidateId: string, stage: PipelineStage) => void;
}) {
  const activeCandidates = candidates.filter((item) => !["completed", "on-hold"].includes(item.stage));
  const followUpCandidates = candidates.filter((item) => ["follow-up", "final-review"].includes(item.stage));

  return (
    <>
      <section className="ag-summary" aria-labelledby="pipeline-overview-title">
        <h2 className="sr-only" id="pipeline-overview-title">진행 현황</h2>
        <dl>
          <div><dt>관리 중인 지원자</dt><dd>{candidates.length}</dd></div>
          <div><dt>진행 중</dt><dd>{activeCandidates.length}</dd></div>
          <div><dt>미팅·최종 심사</dt><dd>{followUpCandidates.length}</dd></div>
        </dl>
      </section>
      <div className="ag-board">
        {stages.map((stage) => {
          const stageCandidates = candidates.filter((item) => item.stage === stage.id);
          return (
            <section className="ag-column" key={stage.id}>
              <header>
                <h2>{stage.label}</h2>
                <span>{stageCandidates.length}</span>
              </header>
              <div className="ag-column__list">
                {stageCandidates.length === 0 ? <p className="ag-column__empty">비어 있음</p> : null}
                {stageCandidates.map((candidate) => {
                  const talent = talents.find((item) => item.id === candidate.talentId);
                  const hasFile = talent?.media.some((media) => media.source === "file");
                  return (
                    <article className="ag-candidate" key={candidate.id}>
                      <div className="ag-candidate__head">
                        <span className="ag-candidate__photo">
                          {talent ? <Image alt="" fill sizes="40px" src={talentCover(talent)} style={{ objectFit: "cover" }} /> : null}
                        </span>
                        <div>
                          <strong>{talent?.stageName ?? "알 수 없음"}</strong>
                          <span>{talent?.fields.map((field) => fieldLabel[field]).join(" · ") ?? "분야 미정"}</span>
                        </div>
                      </div>
                      <dl className="ag-candidate__meta">
                        <div><dt>담당</dt><dd>{candidate.owner}</dd></div>
                        <div><dt>다음</dt><dd>{candidate.nextAction}</dd></div>
                        <div><dt>자료</dt><dd>{hasFile ? "원본 분석 가능" : "재생 전용"}</dd></div>
                      </dl>
                      <p className="ag-candidate__activity">최근 활동 · {readableActivity(candidate.activity.at(-1)?.label)}</p>
                      <select
                        aria-label={`${candidate.id} 단계 이동`}
                        className="ag-candidate__move"
                        value={candidate.stage}
                        onChange={(event) => onMove(candidate.id, event.target.value as PipelineStage)}
                      >
                        {stages.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
