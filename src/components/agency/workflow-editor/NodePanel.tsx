"use client";

import { useState } from "react";

import { categoryMeta, getNodeDefinition } from "@/features/workflows/catalog";
import type { NodeRunState, WorkflowItem, WorkflowNode } from "@/features/workflows/types";

import { Icon } from "@/components/shared/Icon";

import { NodeGlyph } from "./NodeGlyph";
import { NodePreviewLarge } from "./NodePreview";

type Tab = "preview" | "settings" | "input" | "output";

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ItemsView({ items, empty }: { items?: WorkflowItem[]; empty: string }) {
  const [asJson, setAsJson] = useState(false);
  if (!items) return <p className="wf-panel__empty">{empty}</p>;
  if (items.length === 0) return <p className="wf-panel__empty">데이터가 없어요.</p>;
  const columns = [...new Set(items.slice(0, 50).flatMap((item) => Object.keys(item)))].slice(0, 12);

  return (
    <div className="wf-items">
      <div className="wf-items__bar">
        <span>{items.length}건</span>
        <div role="group" aria-label="보기 방식">
          <button aria-pressed={!asJson} type="button" onClick={() => setAsJson(false)}>표</button>
          <button aria-pressed={asJson} type="button" onClick={() => setAsJson(true)}>JSON</button>
        </div>
      </div>
      {asJson ? (
        <pre className="wf-json">{JSON.stringify(items.slice(0, 50), null, 2)}</pre>
      ) : (
        <div className="wf-table-wrap">
          <table className="wf-table">
            <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
            <tbody>
              {items.slice(0, 50).map((item, index) => (
                <tr key={index}>{columns.map((column) => <td key={column}>{formatCell(item[column])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {items.length > 50 ? <p className="wf-panel__hint">처음 50개만 표시합니다.</p> : null}
    </div>
  );
}

const SMART_VARIABLES = [
  { key: "{{활동명}}", label: "지원자명", desc: "이름 또는 활동명" },
  { key: "{{연락처}}", label: "연락처", desc: "휴대폰 번호" },
  { key: "{{분야}}", label: "분야", desc: "보컬/댄스/랩/연기" },
  { key: "{{총점}}", label: "AI점수", desc: "평가 종합 점수" },
  { key: "{{지역}}", label: "지역", desc: "거주지/국가" },
  { key: "{{오디션일시}}", label: "일정", desc: "미팅/오디션 일정" },
  { key: "{{포트폴리오링크}}", label: "영상URL", desc: "제출 영상 링크" },
];

export function NodePanel({
  node,
  run,
  onChange,
  onDelete,
  onClose,
  onApprove,
  onMinimize,
  canEdit,
  canApprove,
}: {
  node: WorkflowNode;
  run: NodeRunState;
  onChange: (next: WorkflowNode) => void;
  onDelete: () => void;
  onClose: () => void;
  onApprove: (approved: boolean) => void;
  onMinimize?: () => void;
  canEdit: boolean;
  canApprove: boolean;
}) {
  const definition = getNodeDefinition(node.type);
  const params = { ...definition.defaults, ...node.params };
  const [tab, setTab] = useState<Tab>(run.status === "idle" ? "settings" : "preview");
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const setParam = (key: string, value: string) => onChange({ ...node, params: { ...node.params, [key]: value } });

  const applyPreset = (preset: { id: string; label: string; params: Record<string, string> }) => {
    onChange({
      ...node,
      params: {
        ...node.params,
        ...preset.params,
      },
    });
    setPresetNotice(`'${preset.label}' 실무 프리셋이 적용되었습니다.`);
    setTimeout(() => setPresetNotice(null), 3500);
  };

  const insertVariable = (variableKey: string) => {
    // Find target parameter to insert into (either focused field, or primary message/text field)
    const targetKey =
      focusedField ??
      definition.params.find((p) =>
        ["message", "prompt", "criteria", "text", "subject", "title", "captionTemplate", "eventSummary"].includes(p.key),
      )?.key ??
      definition.params.find((p) => p.kind === "textarea" || p.kind === "text")?.key;

    if (!targetKey) {
      setPresetNotice("변수를 삽입할 입력 필드가 없습니다.");
      setTimeout(() => setPresetNotice(null), 2500);
      return;
    }

    const currentVal = params[targetKey] ?? "";
    const newVal = currentVal ? `${currentVal} ${variableKey}` : variableKey;
    setParam(targetKey, newVal);
    setPresetNotice(`'${variableKey}' 변수가 '${targetKey}' 필드에 자동 삽입되었습니다.`);
    setTimeout(() => setPresetNotice(null), 3000);
  };

  return (
    <aside aria-label="단계 설정" className="wf-panel" data-category={definition.category}>
      <header className="wf-panel__head">
        <span className="wf-panel__icon"><NodeGlyph icon={definition.icon} size={24} /></span>
        <div className="wf-panel__title">
          <input aria-label="단계 이름" disabled={!canEdit} value={node.name} onChange={(event) => onChange({ ...node, name: event.target.value.slice(0, 60) })} />
          <span>{categoryMeta[definition.category].label} · {definition.label}{definition.runtime === "server" ? " · 서버에서 처리" : ""}</span>
        </div>
        <div className="wf-panel__actions">
          {onMinimize ? (
            <button
              aria-label="패널 접기"
              className="wf-icon-btn"
              type="button"
              title="설정 패널 접기 (캔버스 넓게 보기)"
              onClick={onMinimize}
            >
              <Icon name="chevronRight" size={16} />
            </button>
          ) : null}
          <button aria-label="패널 닫기" className="wf-icon-btn" type="button" title="패널 닫기" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
      </header>

      {presetNotice ? (
        <div className="wf-preset-alert" role="status">
          <Icon name="sparkle" size={14} />
          <span>{presetNotice}</span>
        </div>
      ) : null}

      {definition.execution === "demo" ? <p className="wf-panel__demo" role="note">데모 단계 · 실제 발송이나 외부 서비스 변경은 일어나지 않습니다.</p> : null}

      {run.status === "waiting" ? (
        <section className="wf-approval" aria-label="승인 요청">
          <p className="wf-approval__who">{params.approver || "담당자"}의 승인이 필요합니다</p>
          {params.message ? <p className="wf-approval__msg">{params.message}</p> : null}
          <p className="wf-approval__count">대상 {run.input?.length ?? 0}건</p>
          <div className="wf-approval__actions">
            <button className="wf-btn wf-btn--primary" disabled={!canApprove} type="button" onClick={() => onApprove(true)}>확인하고 계속</button>
            <button className="wf-btn" disabled={!canApprove} type="button" onClick={() => onApprove(false)}>반려</button>
          </div>
        </section>
      ) : null}

      {run.status === "error" && run.error ? <p className="wf-error" role="alert">{run.error}</p> : null}

      <div className="wf-tabs" role="tablist" aria-label="단계 정보">
        {([["preview", "미리보기"], ["settings", "설정"], ["input", "받은 데이터"], ["output", "처리 결과"]] as const).map(([value, label]) => (
          <button aria-selected={tab === value} key={value} role="tab" type="button" onClick={() => setTab(value)}>{label}</button>
        ))}
      </div>

      <div className="wf-panel__body">
        {tab === "preview" ? (
          <NodePreviewLarge node={node} run={run} />
        ) : tab === "settings" ? (
          <div className="wf-form">
            <p className="wf-panel__desc">{definition.description}</p>

            {/* Zero-Config Entertainment Presets */}
            {definition.presets && definition.presets.length > 0 ? (
              <div className="wf-preset-section">
                <div className="wf-preset-section__head">
                  <span className="wf-preset-section__title">
                    <Icon name="sparkle" size={14} />
                    실무 프리셋 (원클릭 자동완성)
                  </span>
                  <span className="wf-preset-section__sub">직접 입력 없이 검증된 템플릿 즉시 적용</span>
                </div>
                <div className="wf-preset-grid">
                  {definition.presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="wf-preset-card"
                      disabled={!canEdit}
                      onClick={() => applyPreset(preset)}
                    >
                      <div className="wf-preset-card__top">
                        <span className="wf-preset-card__label">{preset.label}</span>
                        {preset.badge ? <span className="wf-preset-card__badge">{preset.badge}</span> : null}
                      </div>
                      <p className="wf-preset-card__desc">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Smart Upstream Variable Chips */}
            <div className="wf-var-section">
              <div className="wf-var-section__head">
                <span className="wf-var-section__title">
                  <Icon name="bolt" size={14} />
                  데이터 변수 원클릭 삽입
                </span>
                <span className="wf-var-section__sub">JSON/코드 없이 클릭 시 본문에 바로 삽입됩니다.</span>
              </div>
              <div className="wf-var-chips">
                {SMART_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className="wf-var-chip"
                    disabled={!canEdit}
                    title={`${v.desc} (${v.key}) 자동 삽입`}
                    onClick={() => insertVariable(v.key)}
                  >
                    <span className="wf-var-chip__tag">{v.key}</span>
                    <span className="wf-var-chip__name">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {definition.params.length === 0 ? <p className="wf-panel__empty">설정할 항목이 없습니다.</p> : null}
            {definition.params.map((field) => {
              const id = `param-${node.id}-${field.key}`;
              const value = params[field.key] ?? "";
              return (
                <div className="wf-field" key={field.key}>
                  <label htmlFor={id}>{field.label}{field.required ? <em aria-label="필수"> *</em> : null}</label>
                  {field.kind === "select" ? (
                    <select
                      id={id}
                      disabled={!canEdit}
                      value={value}
                      onFocus={() => setFocusedField(field.key)}
                      onChange={(event) => setParam(field.key, event.target.value)}
                    >
                      {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  ) : field.kind === "textarea" ? (
                    <textarea
                      id={id}
                      disabled={!canEdit}
                      placeholder={field.placeholder}
                      rows={4}
                      value={value}
                      onFocus={() => setFocusedField(field.key)}
                      onChange={(event) => setParam(field.key, event.target.value)}
                    />
                  ) : (
                    <input
                      id={id}
                      disabled={!canEdit}
                      inputMode={field.kind === "url" ? "url" : undefined}
                      placeholder={field.placeholder}
                      value={value}
                      onFocus={() => setFocusedField(field.key)}
                      onChange={(event) => setParam(field.key, event.target.value)}
                    />
                  )}
                  {field.help ? <p className="wf-field__help">{field.help}</p> : null}
                </div>
              );
            })}
          </div>
        ) : tab === "input" ? (
          <ItemsView empty="실행하면 이 단계로 들어온 데이터가 여기에 표시됩니다." items={run.input} />
        ) : (
          <ItemsView empty="실행하면 이 단계가 만든 데이터가 여기에 표시됩니다." items={run.output} />
        )}
      </div>

      <footer className="wf-panel__foot">
        {canEdit ? <button className="wf-btn wf-btn--danger" type="button" onClick={onDelete}>단계 삭제</button> : <span className="wf-panel__hint">현재 계정은 이 단계를 확인할 수만 있습니다.</span>}
      </footer>
    </aside>
  );
}
