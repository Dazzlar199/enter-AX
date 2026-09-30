"use client";

import { notFound, useParams } from "next/navigation";

import { TalentReview } from "@/components/agency/TalentReview";
import { useAgencySession } from "@/features/agency/AgencySessionProvider";
import { useDemo } from "@/features/demo/DemoProvider";

export default function TalentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, createOffer, toggleFavorite, moveTalentToReview } = useDemo();
  const { profile } = useAgencySession();
  const talent = state.talents.find((item) => item.id === id);
  const agency = state.agencies.find((item) => item.id === state.activeAgencyId);
  if (!talent || !agency) notFound();
  return (
    <div className="ap-page ap-page--wide">
      <TalentReview
        agency={agency}
        isFavorite={state.favoriteTalentIds.includes(talent.id)}
        isViewOnly={profile?.role === "viewer"}
        talent={talent}
        onCreateOffer={createOffer}
        onFavorite={() => toggleFavorite(talent.id)}
        onReview={() => moveTalentToReview(talent.id)}
      />
    </div>
  );
}
