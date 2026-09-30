"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { DanceAnalysisPanel } from "@/components/agency/DanceAnalysisPanel";
import { VocalAnalysisPanel } from "@/components/agency/VocalAnalysisPanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { OfferInput } from "@/features/demo/repository";
import { fieldLabel, talentCover } from "@/features/talent/cover";
import type { Agency, TalentProfile } from "@/types/domain";

const ageLabel: Record<TalentProfile["ageBand"], string> = { teen: "10대", "20s": "20대", "30s": "30대" };

export function TalentReview({
  agency,
  talent,
  isFavorite = false,
  isViewOnly = false,
  onCreateOffer,
  onFavorite,
  onReview,
}: {
  agency: Agency;
  talent: TalentProfile;
  isFavorite?: boolean;
  isViewOnly?: boolean;
  onCreateOffer: (input: OfferInput) => void;
  onFavorite: () => void;
  onReview: () => void;
}) {
  const verified = agency.verification === "verified" && !isViewOnly;
  const [form, setForm] = useState({ title: "", purpose: "", dueAt: "", message: "" });
  const [sent, setSent] = useState(false);
  const [queued, setQueued] = useState(false);
  const hasDirectFile = talent.media.some((media) => media.source === "file");
  const reviewMedia = talent.media.filter((media) => media.kind === "vocal" || media.kind === "dance");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!verified || !form.title || !form.purpose || !form.dueAt || !form.message) return;
    onCreateOffer({
      talentId: talent.id,
      title: form.title,
      purpose: form.purpose,
      field: talent.fields[0],
      dueAt: new Date(`${form.dueAt}T09:00:00.000Z`).toISOString(),
      department: agency.department,
      message: form.message,
    });
    setForm({ title: "", purpose: "", dueAt: "", message: "" });
    setSent(true);
  };

  return (
    <div className="rv">
      <Link className="rv-back" href="/agency/discover">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg>
        지원자 찾기
      </Link>

      <section className="ap-card rv-hero">
        <div className="s-media rv-hero__photo">
          <Image alt={`${talent.stageName} 샘플 이미지`} fill priority sizes="260px" src={talentCover(talent)} style={{ objectFit: "cover" }} />
        </div>
        <div className="rv-hero__body">
          <StatusBadge tone={talent.visibility === "public" ? "info" : "positive"}>
            {talent.visibility === "public" ? "전체 공개 프로필" : "인증 기획사 전용 프로필"}
          </StatusBadge>
          <h1>{talent.stageName}</h1>
          <div className="ap-profile__meta">
            {talent.fields.map((field) => <span className="s-chip" data-field={field} key={field}>{fieldLabel[field]}</span>)}
            <span>{talent.region} · {ageLabel[talent.ageBand]}</span>
          </div>
          <p className="ap-profile__bio">{talent.bio}</p>
          <p className="rv-media-state" data-file={hasDirectFile || undefined}>
            {hasDirectFile ? "원본 파일 · 분석 연결 가능" : "YouTube · 재생 전용"}
          </p>
          <div className="ap-actions">
            <button aria-pressed={isFavorite} className={isFavorite ? "s-btn s-btn--dark" : "s-btn"} type="button" onClick={onFavorite}>
              {isFavorite ? "관심 해제" : "관심 저장"}
            </button>
            <button
              className="s-btn"
              disabled={queued}
              type="button"
              onClick={() => {
                onReview();
                setQueued(true);
              }}
            >
              {queued ? "지원자 관리에 추가됨" : "지원자 관리에 추가"}
            </button>
          </div>
        </div>
      </section>

      {!verified ? (
        <section className="ap-section">
          <div className="ap-card rv-locked">
            <h2>검증 완료 후 열람할 수 있습니다.</h2>
            <p>지원자의 초상권과 음원을 보호하기 위해, 기획사 인증을 마친 계정만 원본 영상과 비교 도구를 쓸 수 있어요.</p>
          </div>
        </section>
      ) : (
        <section className="ap-section" aria-labelledby="rv-media-title">
          <h2 id="rv-media-title">심사 자료</h2>
          <p className="rv-section-note">비교 결과는 검토를 돕는 참고 자료예요. 합격·불합격은 담당자가 정합니다.</p>
          <div className="rv-media">
            {reviewMedia.map((media) => (
              <article className="ap-card rv-media__item" key={media.kind}>
                <header>
                  <h3>{media.kind === "vocal" ? "보컬" : "댄스"}</h3>
                  <StatusBadge tone={media.source === "file" ? "positive" : "neutral"}>
                    {media.source === "file" ? "원본 파일" : "YouTube 링크"}
                  </StatusBadge>
                </header>
                {media.kind === "dance" ? <DanceAnalysisPanel /> : <VocalAnalysisPanel />}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="ap-section" aria-labelledby="rv-offer-title">
        <h2 id="rv-offer-title">오디션 제안 보내기</h2>
        <form className="ap-card rv-form" onSubmit={submit}>
          <label>
            <span>제안 제목</span>
            <input placeholder="예: 하반기 비공개 2차 실기 오디션" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label>
            <span>제안 목적</span>
            <input placeholder="예: 메인보컬 파트 대면 테스트" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </label>
          <label>
            <span>회신 기한</span>
            <input type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
          </label>
          <div className="rv-form__fixed">
            <span>분야 · 보내는 부서</span>
            <strong>{fieldLabel[talent.fields[0]]} · {agency.department}</strong>
          </div>
          <label className="rv-form__wide">
            <span>메시지</span>
            <textarea placeholder="오디션 일정, 장소, 준비물 등 지원자에게 전할 내용을 적어 주세요." rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </label>
          <div className="rv-form__wide rv-form__submit">
            {sent ? <p role="status">제안을 보냈어요. 지원자가 답하면 지원자 관리에서 확인할 수 있어요.</p> : <span />}
            <button className="s-btn s-btn--dark" disabled={!verified} type="submit">오디션 제안 보내기</button>
          </div>
        </form>
      </section>
    </div>
  );
}
