import Image from "next/image";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { fieldLabel, talentCover } from "@/features/talent/cover";
import type { TalentProfile } from "@/types/domain";

const ageLabel: Record<TalentProfile["ageBand"], string> = { teen: "10대", "20s": "20대", "30s": "30대" };

export function TalentProfileCard({ talent }: { talent: TalentProfile }) {
  return (
    <article className="ap-card ap-profile">
      <div className="s-media ap-profile__photo">
        <Image alt={`${talent.stageName} 샘플 이미지`} fill priority sizes="240px" src={talentCover(talent)} style={{ objectFit: "cover" }} />
      </div>
      <div className="ap-profile__body">
        <StatusBadge tone={talent.visibility === "public" ? "info" : "positive"}>
          {talent.visibility === "public" ? "전체 공개" : "인증 기획사에만 공개"}
        </StatusBadge>
        <h2>{talent.stageName}</h2>
        <div className="ap-profile__meta">
          {talent.fields.map((field) => <span className="s-chip" data-field={field} key={field}>{fieldLabel[field]}</span>)}
          <span>{talent.region} · {ageLabel[talent.ageBand]}</span>
        </div>
        <p className="ap-profile__bio">{talent.bio}</p>
        <div className="ap-profile__actions">
          <Link className="s-btn" href="/talent/onboarding">프로필 수정</Link>
        </div>
      </div>
    </article>
  );
}
