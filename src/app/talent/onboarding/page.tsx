"use client";

import Link from "next/link";
import { useState } from "react";

import { OnboardingForm } from "@/components/talent/OnboardingForm";
import { useDemo } from "@/features/demo/DemoProvider";

export default function TalentOnboardingPage() {
  const { saveTalent } = useDemo();
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <main className="ap-page ob-done">
        <h1>프로필을 등록했어요</h1>
        <p>선택한 사진과 영상은 이 기기에서만 미리 보여지고, 아직 서버에 올라가지 않았어요. 공개 범위는 내 프로필에서 언제든 바꿀 수 있어요.</p>
        <div className="ap-actions">
          <Link className="s-btn s-btn--dark" href="/talent/profile">내 프로필 보기</Link>
          <Link className="s-btn" href="/talent">커뮤니티로</Link>
        </div>
      </main>
    );
  }
  return <main><OnboardingForm onSave={(draft) => { saveTalent(draft); setSaved(true); }} /></main>;
}
