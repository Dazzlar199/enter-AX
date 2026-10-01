"use client";

import { OfferInbox } from "@/components/talent/OfferInbox";
import { useDemo } from "@/features/demo/DemoProvider";

export default function TalentOffersPage() {
  const { state, respondToOffer } = useDemo();
  return (
    <main className="ap-page">
      <header className="ap-head">
        <div>
          <h1>받은 제안</h1>
          <p>기획사가 보낸 오디션 제안을 확인하고 답변하세요. 내 연락처는 수락하기 전까지 공개되지 않아요.</p>
        </div>
      </header>
      <OfferInbox agencies={state.agencies} offers={state.offers} onRespond={({ offerId, status }) => respondToOffer(offerId, status)} />
    </main>
  );
}
