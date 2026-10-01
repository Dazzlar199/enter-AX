import Image from "next/image";
import Link from "next/link";

import { fieldLabel, talentCover } from "@/features/talent/cover";
import type { TalentProfile } from "@/types/domain";

const ageLabel: Record<TalentProfile["ageBand"], string> = { teen: "10대", "20s": "20대", "30s": "30대" };

export function TalentGrid({
  talents,
  favorites,
  onFavorite,
}: {
  talents: TalentProfile[];
  favorites: string[];
  onFavorite: (id: string) => void;
}) {
  if (talents.length === 0) {
    return <p className="ag-empty">조건에 맞는 지원자가 없습니다. 필터를 줄여 보세요.</p>;
  }
  return (
    <ul className="ag-grid">
      {talents.map((talent, index) => {
        const isFavorite = favorites.includes(talent.id);
        const hasDirectFile = talent.media.some((media) => media.source === "file");
        return (
          <li className="ag-card" key={talent.id}>
            <div className="s-media ag-card__media">
              <Image alt={`${talent.stageName} 샘플 이미지`} fill priority={index < 4} sizes="(max-width: 700px) 50vw, (max-width: 1200px) 33vw, 22vw" src={talentCover(talent)} style={{ objectFit: "cover" }} />
              <span className="ag-card__visibility" data-public={talent.visibility === "public" || undefined}>
                {talent.visibility === "public" ? "전체 공개" : "기획사 전용"}
              </span>
              <button
                aria-label={isFavorite ? `${talent.stageName} 관심 해제` : `${talent.stageName} 관심 저장`}
                aria-pressed={isFavorite}
                className="ag-fav"
                type="button"
                onClick={() => onFavorite(talent.id)}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
                <span className="sr-only">{isFavorite ? "관심 해제" : "관심 저장"}</span>
              </button>
            </div>
            <div className="ag-card__body">
              <div className="ag-card__title">
                <h2>{talent.stageName}</h2>
                <span>{ageLabel[talent.ageBand]} · {talent.region}</span>
              </div>
              <div className="ag-card__chips">
                {talent.fields.map((field) => <span className="s-chip" data-field={field} key={field}>{fieldLabel[field]}</span>)}
              </div>
              <p className="ag-card__media-state" data-file={hasDirectFile || undefined}>
                {hasDirectFile ? "원본 파일 · 비교 분석 가능" : "YouTube 링크 · 재생 전용"}
              </p>
              <Link className="s-btn s-btn--sm ag-card__open" href={`/agency/talent/${talent.id}`}>상세 검수</Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
