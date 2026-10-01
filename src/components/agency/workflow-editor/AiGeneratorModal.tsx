"use client";

import { useState } from "react";
import { Icon } from "@/components/shared/Icon";
import {
  buildWorkflowFromBlueprint,
  enterpriseBlueprints,
  generateWorkflowFromPrompt,
  type PipelineTemplateIntent,
} from "@/features/workflows/generator";
import type { WorkflowDefinition } from "@/features/workflows/types";

export function AiGeneratorModal({
  isOpen,
  onClose,
  onGenerated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (workflow: WorkflowDefinition) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleCreateBlueprint = (blueprint: PipelineTemplateIntent) => {
    setIsGenerating(true);
    setTimeout(() => {
      const generated = buildWorkflowFromBlueprint(blueprint);
      setIsGenerating(false);
      onGenerated(generated);
    }, 150);
  };

  const handleGeneratePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      const generated = generateWorkflowFromPrompt(prompt);
      setIsGenerating(false);
      onGenerated(generated);
    }, 250);
  };

  const quickChips = [
    "구글 폼 댄스 지원자 검토 후 카카오톡 안내 준비",
    "오디션 영상 세로 화면 변환 후 유튜브와 틱톡 게시 준비",
    "A&R 데모곡 중복 확인 후 미팅 일정 준비",
    "보컬 지원자 검토 내용을 정리해 슬랙으로 공유",
  ];

  return (
    <div
      className="wf-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="업무 흐름 빠른 설정"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="wf-modal wf-modal--ai">
        <header className="wf-modal__header">
          <div className="wf-modal__title-wrap">
            <span className="wf-modal__badge wf-modal__badge--ai">빠른 설정</span>
            <h2>업무 흐름 빠른 설정</h2>
            <p>
              준비된 업무 양식을 고르거나 원하는 작업을 문장으로 입력하면 필요한 단계를 구성합니다.
            </p>
          </div>
          <button
            aria-label="닫기"
            className="wf-icon-btn"
            type="button"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="wf-modal__body">
          {/* Section 1: Pre-built Blueprints */}
          <section className="wf-form-section">
            <div className="wf-section-head">
              <span className="wf-section-tag">준비된 양식</span>
              <h3 className="wf-section-title">자주 쓰는 업무 흐름</h3>
              <p className="wf-section-desc">
                접수, 검토, 담당자 확인, 안내 준비 순서를 한 번에 불러옵니다.
              </p>
            </div>

            <div className="wf-blueprint-grid">
              {enterpriseBlueprints.map((blueprint) => (
                <div
                  key={blueprint.id}
                  className="wf-blueprint-card"
                  onClick={() => handleCreateBlueprint(blueprint)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCreateBlueprint(blueprint);
                    }
                  }}
                >
                  <div className="wf-blueprint-card__head">
                    <span className="wf-blueprint-card__title">
                      {blueprint.title}
                    </span>
                    <span className="wf-blueprint-card__count">
                      {blueprint.nodes.length}개 단계
                    </span>
                  </div>
                  <p className="wf-blueprint-card__desc">
                    {blueprint.description}
                  </p>
                  <div className="wf-blueprint-card__flow">
                    {blueprint.nodes.map((n, i) => (
                      <span key={i} className="wf-blueprint-card__step">
                        {n.name.split(" ")[0]}
                        {i < blueprint.nodes.length - 1 ? (
                          <i aria-hidden="true">→</i>
                        ) : null}
                      </span>
                    ))}
                  </div>
                  <div className="wf-blueprint-card__action">
                    <button
                      type="button"
                      className="wf-btn wf-btn--primary wf-btn--sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateBlueprint(blueprint);
                      }}
                      disabled={isGenerating}
                    >
                      {isGenerating ? "구성 중..." : "이 흐름 사용하기"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Natural Language Prompt */}
          <section className="wf-form-section wf-form-section--prompt">
            <div className="wf-section-head">
              <span className="wf-section-tag wf-section-tag--purple">직접 설명</span>
              <h3 className="wf-section-title">원하는 업무를 문장으로 입력</h3>
              <p className="wf-section-desc">
                입력한 내용과 가장 가까운 준비된 업무 흐름을 찾아 단계와 기본 설정을 채웁니다.
              </p>
            </div>

            <form onSubmit={handleGeneratePrompt} className="wf-prompt-box">
              <textarea
                className="wf-prompt-input"
                rows={3}
                placeholder="예: 구글 폼으로 받은 댄스 지원자를 검토하고 담당자 확인 후 카카오톡 안내를 준비해줘"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />

              <div className="wf-prompt-quick-chips">
                <span className="wf-prompt-quick-label">추천 키워드:</span>
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="wf-quick-chip"
                    onClick={() => setPrompt(chip)}
                  >
                    {chip.length > 28 ? `${chip.slice(0, 28)}…` : chip}
                  </button>
                ))}
              </div>

              <div className="wf-prompt-footer">
                <span className="wf-prompt-hint">
                  카카오톡 안내 양식, 공유 채널 등 기본 설정을 함께 채웁니다.
                </span>
                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className="wf-btn wf-btn--ai-submit"
                >
                  <Icon name="sparkle" size={14} />
                  <span>{isGenerating ? "업무 흐름 구성 중…" : "업무 흐름 만들기"}</span>
                </button>
              </div>
            </form>
          </section>
        </div>

        <footer className="wf-modal__footer">
          <button
            className="wf-btn wf-btn--ghost"
            type="button"
            onClick={onClose}
          >
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
}
