import type { DemoState, PipelineStage } from "@/types/domain";

import type { AgencyOverviewModel } from "./types";

const stageLabel: Partial<Record<PipelineStage, string>> = {
  "internal-review": "내부 검토",
  "offer-sent": "제안 보냄",
  accepted: "수락",
  "follow-up": "미팅·추가 오디션",
  "final-review": "최종 심사",
};

/** Stages where a person on the team has to act next. */
const needsAction: PipelineStage[] = ["internal-review", "accepted", "follow-up", "final-review"];

export function createAgencyOverviewModel(state: DemoState): AgencyOverviewModel {
  const agencyOffers = state.offers.filter((offer) => offer.agencyId === state.activeAgencyId);
  return {
    metrics: [
      { id: "candidates", label: "관리 중인 지원자", value: state.candidates.length, href: "/agency/pipeline", hint: "지원자 관리 전체" },
      { id: "action", label: "확인할 지원자", value: state.candidates.filter((item) => needsAction.includes(item.stage)).length, href: "/agency/pipeline", hint: "검토·미팅·최종 심사" },
      { id: "favorites", label: "관심 지원자", value: state.favoriteTalentIds.length, href: "/agency/discover", hint: "지원자 찾기에서 저장" },
      { id: "offers", label: "답변 기다리는 제안", value: agencyOffers.filter((offer) => offer.status === "sent").length, href: "/agency/pipeline", hint: "보낸 제안" },
    ],
    newTalents: [...state.talents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4),
    attention: state.candidates
      .filter((item) => needsAction.includes(item.stage))
      .map((candidate) => ({
        candidate,
        talent: state.talents.find((talent) => talent.id === candidate.talentId),
        stageLabel: stageLabel[candidate.stage] ?? candidate.stage,
      })),
  };
}
