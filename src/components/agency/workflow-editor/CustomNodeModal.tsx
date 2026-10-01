"use client";

import { useState } from "react";

import {
  availableGlyphs,
  availableLogos,
  categoryMeta,
  saveCustomNode,
  type NodeCategory,
  type NodeDefinition,
  type NodeIcon,
  type ParamField,
} from "@/features/workflows/catalog";
import { Icon } from "@/components/shared/Icon";

import { NodeGlyph } from "./NodeGlyph";

interface CustomNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (node: NodeDefinition) => void;
}

export function CustomNodeModal({ isOpen, onClose, onCreated }: CustomNodeModalProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<NodeCategory>("integration");
  const [iconType, setIconType] = useState<"logo" | "glyph">("logo");
  const [selectedLogo, setSelectedLogo] = useState<string>(availableLogos[0].path);
  const [selectedGlyph, setSelectedGlyph] = useState<Extract<NodeIcon, { glyph: string }>["glyph"]>("sparkle");
  const runtime = "client" as const;

  // Dynamic parameter fields
  const [fields, setFields] = useState<ParamField[]>([
    { key: "targetUrl", label: "대상 엔드포인트 URL", kind: "url", required: true, placeholder: "https://api.my-agency.com/v1/..." },
    { key: "message", label: "전달 데이터 / 메시지", kind: "textarea", placeholder: "{{활동명}} 지원자 데이터 전송" },
  ]);

  if (!isOpen) return null;

  const handleAddField = () => {
    const id = Date.now().toString(36).slice(-4);
    setFields((prev) => [
      ...prev,
      {
        key: `field_${id}`,
        label: `새 항목 ${prev.length + 1}`,
        kind: "text",
        required: false,
        placeholder: "값을 입력해 주세요",
      },
    ]);
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateField = (index: number, updates: Partial<ParamField>) => {
    setFields((prev) =>
      prev.map((field, i) => (i === index ? { ...field, ...updates } : field)),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      alert("단계 이름을 입력해 주세요.");
      return;
    }

    const typeKey = `custom.${label.toLowerCase().replace(/[^a-z0-9]/g, "_") || Date.now()}`;
    const icon: NodeIcon = iconType === "logo" ? { logo: selectedLogo } : { glyph: selectedGlyph };

    const defaults: Record<string, string> = {};
    fields.forEach((field) => {
      defaults[field.key] = "";
    });

    const newCustomNode: NodeDefinition = {
      type: typeKey,
      label: label.trim(),
      description: description.trim() || "직접 만든 맞춤 단계입니다.",
      category,
      icon,
      runtime,
      params: fields,
      defaults,
      isCustom: true,
    };

    saveCustomNode(newCustomNode);
    onCreated(newCustomNode);
    onClose();
  };

  return (
    <div className="wf-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="custom-node-title">
      <div className="wf-modal">
        <header className="wf-modal__header">
          <div className="wf-modal__title-wrap">
            <span className="wf-modal__badge">관리자 설정</span>
            <h2 id="custom-node-title">맞춤 단계 만들기</h2>
            <p>우리 회사에서 쓰는 외부 서비스나 내부 도구에 맞춰 입력 항목을 구성합니다.</p>
          </div>
          <button aria-label="닫기" className="wf-icon-btn" type="button" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="wf-modal__body">
          {/* Basic Info */}
          <div className="wf-form-section">
            <div className="wf-field">
              <label htmlFor="node-label">
                단계 이름 <em>*</em>
              </label>
              <input
                id="node-label"
                required
                placeholder="예: 치지직 생방송 공지, 사내 ERP 등록, 스포티파이 연동"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <div className="wf-field">
              <label htmlFor="node-desc">단계 설명</label>
              <input
                id="node-desc"
                placeholder="이 단계에서 처리할 일을 짧게 적어 주세요."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="wf-grid-2">
              <div className="wf-field">
                <label htmlFor="node-category">카테고리</label>
                <select
                  id="node-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as NodeCategory)}
                >
                  {(["integration", "trigger", "app", "data", "ai", "human"] as NodeCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryMeta[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="wf-field">
                <span className="wf-panel__hint">맞춤 단계는 현재 데모 결과만 보여줍니다. 실제 외부 연동은 관리자 연결 설정이 추가된 뒤 사용할 수 있습니다.</span>
              </div>
            </div>
          </div>

          {/* Icon / Brand Logo Selection */}
          <div className="wf-form-section">
            <div className="wf-field-label-group">
                <label>표시 아이콘 선택</label>
              <div className="wf-pill-toggle">
                <button
                  type="button"
                  aria-pressed={iconType === "logo"}
                  onClick={() => setIconType("logo")}
                >
                  공식 브랜드 로고 (15종)
                </button>
                <button
                  type="button"
                  aria-pressed={iconType === "glyph"}
                  onClick={() => setIconType("glyph")}
                >
                  시스템 글리프 (9종)
                </button>
              </div>
            </div>

            {iconType === "logo" ? (
              <div className="wf-logo-grid">
                {availableLogos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="wf-logo-choice"
                    data-selected={selectedLogo === item.path || undefined}
                    onClick={() => setSelectedLogo(item.path)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.path} alt={item.label} width={26} height={26} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="wf-glyph-grid">
                {availableGlyphs.map((glyph) => (
                  <button
                    key={glyph}
                    type="button"
                    className="wf-glyph-choice"
                    data-selected={selectedGlyph === glyph || undefined}
                    onClick={() => setSelectedGlyph(glyph)}
                  >
                    <NodeGlyph icon={{ glyph }} size={24} />
                    <span>{glyph}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Parameter Builder */}
          <div className="wf-form-section">
            <div className="wf-field-label-group">
              <label>설정 항목 ({fields.length}개)</label>
              <button type="button" className="wf-btn wf-btn--sm" onClick={handleAddField}>
                + 필드 추가
              </button>
            </div>
            <p className="wf-panel__hint">이 단계를 추가한 뒤 입력하게 될 설정 항목입니다.</p>

            <div className="wf-param-builder-list">
              {fields.map((field, idx) => (
                <div key={idx} className="wf-param-builder-row">
                  <input
                    aria-label="필드 라벨"
                    placeholder="표시 라벨 (예: 채널 ID)"
                    value={field.label}
                    onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                  />
                  <input
                    aria-label="파라미터 키"
                    placeholder="키 (영문)"
                    value={field.key}
                    onChange={(e) => handleUpdateField(idx, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
                  />
                  <select
                    aria-label="입력 유형"
                    value={field.kind}
                    onChange={(e) => handleUpdateField(idx, { kind: e.target.value as ParamField["kind"] })}
                  >
                    <option value="text">텍스트 (한 줄)</option>
                    <option value="textarea">긴 글 (본문)</option>
                    <option value="url">웹 주소 (URL)</option>
                    <option value="select">선택 목록 (Select)</option>
                  </select>
                  <label className="wf-check-label">
                    <input
                      type="checkbox"
                      checked={field.required ?? false}
                      onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                    />
                    필수
                  </label>
                  <button
                    type="button"
                    className="wf-icon-btn wf-icon-btn--del"
                    aria-label="삭제"
                    onClick={() => handleRemoveField(idx)}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <footer className="wf-modal__footer">
            <button type="button" className="wf-btn" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="wf-btn wf-btn--primary">
              맞춤 단계 만들기
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
