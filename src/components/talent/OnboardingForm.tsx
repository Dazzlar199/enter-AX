"use client";

import { useEffect, useState } from "react";

import { fieldLabel } from "@/features/talent/cover";
import { validateTalentDraft } from "@/features/talent/validation";
import type { TalentDraft, ValidationErrors } from "@/types/domain";

import { MediaInput } from "./MediaInput";
import { PhotoTriptych } from "./PhotoTriptych";

const steps = ["기본 프로필", "얼굴 사진 3장", "보컬·댄스 자료", "공개 범위와 동의"];

function stepForField(field: keyof ValidationErrors): 1 | 2 | 3 | 4 {
  if (field === "photos") return 2;
  if (field === "vocal" || field === "dance") return 3;
  if (field === "guardianConsent") return 4;
  return 1;
}

const blankDraft: TalentDraft = {
  stageName: "",
  birthDate: "",
  gender: "undisclosed",
  nationality: "대한민국",
  region: "",
  fields: [],
  bio: "",
  socialUrl: "",
  isMinor: false,
  guardianConsent: false,
  visibility: "verified-agencies",
  openToOffers: true,
  marketingConsent: false,
  photos: { front: "", left: "", right: "" },
  vocal: { source: "file", value: "" },
  dance: { source: "file", value: "" },
};

export function OnboardingForm({
  onSave,
  initialStep = 1,
}: {
  onSave: (draft: TalentDraft) => void;
  initialStep?: 1 | 2 | 3 | 4;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(initialStep);
  const [draft, setDraft] = useState(blankDraft);
  const [requiredConsent, setRequiredConsent] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => setHydrated(true), []);

  function update<Key extends keyof TalentDraft>(key: Key, value: TalentDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function goToNextStep() {
    const nextErrors = validateTalentDraft(draft);
    setErrors(nextErrors);
    const blockedByCurrentStep = Object.keys(nextErrors).some(
      (field) => stepForField(field as keyof ValidationErrors) === step
    );
    if (blockedByCurrentStep) return;
    setStep((current) => Math.min(4, current + 1) as 1 | 2 | 3 | 4);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validateTalentDraft(draft);
    setErrors(nextErrors);
    const errorFields = Object.keys(nextErrors) as Array<keyof ValidationErrors>;
    if (errorFields.length > 0) {
      const earliestStep = errorFields
        .map(stepForField)
        .reduce((min, current) => (current < min ? current : min));
      setStep(earliestStep);
      return;
    }
    if (requiredConsent) onSave(draft);
  }

  return (
    <form className="onboarding-form" onSubmit={submit}>
      <ol className="onboarding-progress" aria-label="등록 단계">
        {steps.map((label, index) => (
          <li aria-current={step === index + 1 ? "step" : undefined} key={label}>
            <span>0{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <section className="onboarding-panel">
        <header>
          <p>{step}단계 / 4</p>
          <h1>{steps[step - 1]}</h1>
          <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            {step === 1 && "캐스팅 디렉터가 가장 먼저 확인하는 기본 인적 사항과 지원 분야를 입력해 주세요."}
            {step === 2 && "자연스러운 정면, 좌측, 우측 3방향의 프로필 사진을 등록해 주세요."}
            {step === 3 && "나의 역량을 증명할 보컬 음원과 댄스 퍼포먼스 미디어를 첨부해 주세요."}
            {step === 4 && "프로필의 공개 범위와 프라이버시 보호 동의를 설정해 주세요."}
          </p>
        </header>

        {step === 1 ? (
          <div className="form-grid">
            <label>
              이름 또는 활동명
              <input
                disabled={!hydrated}
                placeholder="예: 민지, 루아 (Lua)"
                value={draft.stageName}
                onChange={(e) => update("stageName", e.target.value)}
              />
            </label>
            <label>
              생년월일
              <input
                disabled={!hydrated}
                type="date"
                value={draft.birthDate}
                onChange={(e) => update("birthDate", e.target.value)}
              />
            </label>
            <label>
              성별
              <select
                disabled={!hydrated}
                value={draft.gender}
                onChange={(e) => update("gender", e.target.value as TalentDraft["gender"])}
              >
                <option value="undisclosed">선택 안 함</option>
                <option value="woman">여성</option>
                <option value="man">남성</option>
                <option value="nonbinary">논바이너리</option>
              </select>
            </label>
            <label>
              국적
              <input
                disabled={!hydrated}
                placeholder="대한민국"
                value={draft.nationality}
                onChange={(e) => update("nationality", e.target.value)}
              />
            </label>
            <label>
              거주 지역
              <input
                disabled={!hydrated}
                placeholder="예: 서울특별시 마포구"
                value={draft.region}
                onChange={(e) => update("region", e.target.value)}
              />
            </label>
            <fieldset>
              <legend>지원 분야 · 여러 개 선택 가능</legend>
              <div className="ob-fields">
                {(["idol", "vocal", "dance", "actor", "model"] as const).map((field) => (
                  <label className="ob-field" key={field}>
                    <input
                      disabled={!hydrated}
                      type="checkbox"
                      checked={draft.fields.includes(field)}
                      onChange={(e) =>
                        update(
                          "fields",
                          e.target.checked
                            ? [...draft.fields, field]
                            : draft.fields.filter((item) => item !== field)
                        )
                      }
                    />
                    <span>{fieldLabel[field]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="form-span">
              자기소개
              <textarea
                disabled={!hydrated}
                placeholder="나의 강점, 보컬 음색의 특징, 안무 스타일, 활동 경력 및 포부를 자유롭게 기술해 주세요."
                value={draft.bio}
                onChange={(e) => update("bio", e.target.value)}
              />
            </label>
            <label className="form-span">
              SNS 링크 · 선택
              <input
                disabled={!hydrated}
                placeholder="https://instagram.com/yourname 또는 YouTube 링크"
                type="url"
                value={draft.socialUrl}
                onChange={(e) => update("socialUrl", e.target.value)}
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <>
            <PhotoTriptych
              onChange={(key, name) =>
                update("photos", { ...draft.photos, [key]: name })
              }
            />
            <p className="privacy-notice" style={{ marginTop: "24px" }}>
              [초상권 보호] 제출된 프로필 사진은 정식 인증 기획사의 캐스팅 심사 용도로만 보호되며, 본인 동의 없이 외부에 공개되지 않습니다.
            </p>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <MediaInput
              kind="보컬"
              value={draft.vocal}
              onChange={(value) => update("vocal", value)}
            />
            <MediaInput
              kind="댄스"
              value={draft.dance}
              onChange={(value) => update("dance", value)}
            />
            <p className="privacy-notice" style={{ marginTop: "24px" }}>
              [미디어 보안] 등록된 영상 및 음원은 공식 인증된 기획사 캐스팅 심사역에게만 보안 스트리밍 권한이 부여됩니다.
            </p>
          </>
        ) : null}

        {step === 4 ? (
          <div className="consent-stack">
            <fieldset>
              <legend style={{ padding: "0 6px", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700 }}>
                프로필 공개 범위 설정
              </legend>
              <div style={{ display: "grid", gap: "10px", marginTop: "6px" }}>
                <label style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    checked={draft.visibility === "verified-agencies"}
                    name="visibility"
                    type="radio"
                    onChange={() => update("visibility", "verified-agencies")}
                  />
                  <span>
                    <strong>검증된 엔터사에만 공개</strong> (권장: 공식 사업자 등록 기획사만 열람)
                  </span>
                </label>
                <label style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    checked={draft.visibility === "public"}
                    name="visibility"
                    type="radio"
                    onChange={() => update("visibility", "public")}
                  />
                  <span>
                    <strong>전체 공개 포트폴리오 허용</strong> (공개 프로필 주소 생성)
                  </span>
                </label>
              </div>
            </fieldset>

            <div style={{ display: "grid", gap: "12px", border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "20px", background: "var(--bg-surface-2)" }}>
              <label>
                <input
                  checked={draft.openToOffers}
                  type="checkbox"
                  onChange={(e) => update("openToOffers", e.target.checked)}
                />
                <span>엔터사 오디션 제안 수신 (비공개 캐스팅 오퍼 수신 허용)</span>
              </label>
              <label>
                <input
                  checked={draft.marketingConsent}
                  type="checkbox"
                  onChange={(e) => update("marketingConsent", e.target.checked)}
                />
                <span>홍보·마케팅 이용 동의 · 선택 (Enter-AX 추천 루키 숏폼 피처링)</span>
              </label>
              <label>
                <input
                  checked={draft.isMinor}
                  type="checkbox"
                  onChange={(e) => update("isMinor", e.target.checked)}
                />
                만 19세 미만
              </label>
              {draft.isMinor ? (
                <div style={{ padding: "12px 16px", borderRadius: "8px", background: "#ffffff", border: "1px solid rgba(244, 63, 94, 0.2)", marginTop: "4px" }}>
                  <label>
                    <input
                      checked={draft.guardianConsent}
                      type="checkbox"
                      onChange={(e) => update("guardianConsent", e.target.checked)}
                    />
                    <span>법정대리인 동의 확인 (보호자 연대 서약 완료)</span>
                  </label>
                  {!draft.guardianConsent ? (
                    <p className="field-error" style={{ margin: "6px 0 0", color: "var(--accent-rose)" }}>
                      법정대리인 동의가 필요합니다.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <label style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "12px", marginTop: "6px" }}>
                <input
                  checked={requiredConsent}
                  type="checkbox"
                  onChange={(e) => setRequiredConsent(e.target.checked)}
                />
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  개인정보 처리와 선택한 범위의 프로필 공개에 동의합니다 · 필수
                </span>
              </label>
            </div>
          </div>
        ) : null}

        {(Object.entries(errors) as Array<[keyof ValidationErrors, string]>)
          .filter(([field]) => stepForField(field) === step)
          .map(([field, error]) => (
            <p className="field-error" key={field} style={{ margin: "14px 0 0", color: "var(--accent-rose)" }}>
              {error}
            </p>
          ))}

        <footer className="form-navigation">
          <button
            className="button-outline"
            disabled={step === 1}
            type="button"
            onClick={() => setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3 | 4)}
          >
            이전 단계
          </button>
          {step < 4 ? (
            <button className="button-solid" type="button" onClick={goToNextStep}>
              다음 단계
            </button>
          ) : (
            <button
              className="button-solid"
              disabled={!requiredConsent || (draft.isMinor && !draft.guardianConsent)}
              type="submit"
            >
              프로필 등록
            </button>
          )}
        </footer>
      </section>
    </form>
  );
}
