"use client";

import { AgencyOverview } from "@/components/agency/console/AgencyOverview";
import { createAgencyOverviewModel } from "@/components/agency/console/overviewModel";
import { useDemo } from "@/features/demo/DemoProvider";

export default function AgencyStartPage() {
  const { state } = useDemo();
  const agency = state.agencies.find((item) => item.id === state.activeAgencyId);
  return <AgencyOverview agencyName={agency?.name ?? "워크스페이스"} model={createAgencyOverviewModel(state)} />;
}
