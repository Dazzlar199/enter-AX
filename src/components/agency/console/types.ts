import type { Candidate, TalentProfile } from "@/types/domain";

export type OverviewMetric = { id: string; label: string; value: number; href: string; hint: string };
export type AttentionItem = { candidate: Candidate; talent?: TalentProfile; stageLabel: string };

export type AgencyOverviewModel = {
  metrics: OverviewMetric[];
  newTalents: TalentProfile[];
  attention: AttentionItem[];
};
