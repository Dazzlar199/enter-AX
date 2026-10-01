"use client";

import { useState } from "react";

import {
  categoryMeta,
  type NodeCategory,
  type NodeDefinition,
} from "@/features/workflows/catalog";
import type { WorkflowNodeType } from "@/features/workflows/types";
import { Icon } from "@/components/shared/Icon";

import { NodeGlyph } from "./NodeGlyph";

export const DRAG_MIME = "application/x-enter-ax-node";

const order: NodeCategory[] = ["trigger", "app", "data", "ai", "human", "integration"];

export function NodePalette({
  nodes,
  onAdd,
  onOpenCustomModal,
  onDeleteCustom,
  onCollapse,
  readOnly = false,
}: {
  nodes: NodeDefinition[];
  onAdd: (type: WorkflowNodeType) => void;
  onOpenCustomModal: () => void;
  onDeleteCustom?: (type: string) => void;
  onCollapse?: () => void;
  readOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLowerCase();

  const matches = nodes.filter(
    (node) =>
      !keyword ||
      `${node.label} ${node.description}`.toLowerCase().includes(keyword),
  );

  const customNodes = matches.filter((node) => node.isCustom);

  return (
    <aside aria-label="단계 목록" className="wf-palette">
      <div className="wf-palette__top">
        <div>
          <p className="wf-palette__title">단계 목록</p>
          <p className="wf-palette__hint">{readOnly ? "현재 계정은 내용을 확인할 수 있습니다" : "끌어다 놓거나 눌러서 추가"}</p>
        </div>
        <div className="wf-palette__actions">
          {!readOnly ? (
            <button
              type="button"
              className="wf-btn wf-btn--custom-maker"
              title="맞춤 단계 만들기"
              onClick={onOpenCustomModal}
            >
              <span>+ 맞춤 단계</span>
            </button>
          ) : null}
          {onCollapse ? (
            <button
              type="button"
              className="wf-icon-btn wf-icon-btn--collapse"
              title="단계 목록 접기 (캔버스 넓게 보기)"
              aria-label="단계 목록 접기"
              onClick={onCollapse}
            >
              <Icon name="chevronLeft" size={16} />
            </button>
          ) : null}
        </div>
      </div>

      <input
        aria-label="단계 검색"
        className="wf-palette__search"
        placeholder="단계 검색 (카카오톡, 명단, 영상...)"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="wf-palette__groups">
        {/* Custom Nodes Section if any exist */}
        {customNodes.length > 0 ? (
          <section className="wf-palette__custom-sec" key="custom-section">
            <div className="wf-palette__custom-sec-head">
              <h3>맞춤 단계 ({customNodes.length})</h3>
            </div>
            <ul>
              {customNodes.map((node) => (
                <li key={node.type} className="wf-palette__item-wrapper">
                  <button
                    className="wf-palette__item wf-palette__item--custom"
                    data-category={node.category}
                    disabled={readOnly}
                    draggable={!readOnly}
                    type="button"
                    onClick={() => onAdd(node.type)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData(DRAG_MIME, node.type);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <span className="wf-palette__icon">
                      <NodeGlyph icon={node.icon} size={20} />
                    </span>
                    <span className="wf-palette__text">
                      <strong>{node.label}</strong>
                      {node.execution === "demo" ? <span className="wf-palette__mode">데모 단계</span> : null}
                      <small>{node.description}</small>
                    </span>
                  </button>
                  {onDeleteCustom && !readOnly ? (
                    <button
                      type="button"
                      className="wf-palette__del-btn"
                      title="맞춤 단계 삭제"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`'${node.label}' 맞춤 단계를 삭제할까요?`)) {
                          onDeleteCustom(node.type);
                        }
                      }}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Built-in Categories */}
        {order.map((category) => {
          const categoryNodes = matches.filter((node) => node.category === category && !node.isCustom);
          if (categoryNodes.length === 0) return null;
          return (
            <section key={category}>
              <h3>{categoryMeta[category].label}</h3>
              <ul>
                {categoryNodes.map((node) => (
                  <li key={node.type}>
                    <button
                      className="wf-palette__item"
                      data-category={node.category}
                      disabled={readOnly}
                      draggable={!readOnly}
                      type="button"
                      onClick={() => onAdd(node.type)}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(DRAG_MIME, node.type);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                    >
                      <span className="wf-palette__icon">
                        <NodeGlyph icon={node.icon} size={20} />
                      </span>
                      <span className="wf-palette__text">
                        <strong>{node.label}</strong>
                        {node.execution === "demo" ? <span className="wf-palette__mode">데모 단계</span> : null}
                        <small>{node.description}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
