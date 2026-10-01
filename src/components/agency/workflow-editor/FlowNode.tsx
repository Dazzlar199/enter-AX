"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import { getNodeDefinition, missingParams } from "@/features/workflows/catalog";
import type { NodeRunState, WorkflowNode } from "@/features/workflows/types";
import { Icon } from "@/components/shared/Icon";

import { NodeGlyph } from "./NodeGlyph";
import { NodePreview } from "./NodePreview";

export type FlowNodeData = {
  node: WorkflowNode;
  run: NodeRunState;
  preview: boolean;
  onSelect?: (id: string) => void;
};
export type FlowNodeType = Node<FlowNodeData, "workflow">;

const statusText: Record<NodeRunState["status"], string> = {
  idle: "",
  running: "실행 중…",
  success: "완료",
  error: "오류",
  waiting: "승인 대기",
  rejected: "반려됨",
  skipped: "건너뜀",
};

function StatusBadge({ run, missing }: { run: NodeRunState; missing: string[] }) {
  if (run.status === "success") return <span aria-hidden="true" className="wf-badge wf-badge--ok"><Icon name="check" size={13} /></span>;
  if (run.status === "error" || run.status === "rejected") return <span aria-hidden="true" className="wf-badge wf-badge--err"><Icon name="alert" size={13} /></span>;
  if (run.status === "waiting") return <span aria-hidden="true" className="wf-badge wf-badge--wait"><Icon name="pause" size={12} /></span>;
  if (run.status === "idle" && missing.length > 0) {
    return <span aria-hidden="true" className="wf-badge wf-badge--warn" title={`필수 설정: ${missing.join(", ")}`}><Icon name="alert" size={13} /></span>;
  }
  return null;
}

function FlowNodeView({ data, selected }: NodeProps<FlowNodeType>) {
  const { node, run, preview } = data;
  const definition = getNodeDefinition(node.type);
  const missing = missingParams(node.type, { ...definition.defaults, ...node.params });
  const isTrigger = definition.category === "trigger";
  const count = run.status === "success" ? run.output?.length ?? 0 : null;
  const meta = count !== null ? `${count}건 처리` : run.status !== "idle" ? statusText[run.status] : missing.length > 0 ? "설정 필요" : definition.label;

  if (preview) {
    return (
      <div
        className="wf-node wf-node--card"
        data-category={definition.category}
        data-selected={selected || undefined}
        data-status={run.status}
        onClick={() => data.onSelect?.(node.id)}
      >
        {!isTrigger ? <Handle className="wf-handle" position={Position.Left} type="target" /> : null}
        <div className="wf-card" data-trigger={isTrigger || undefined}>
          <div className="wf-card__head">
            <span className="wf-card__icon"><NodeGlyph icon={definition.icon} size={20} /></span>
            <div className="wf-card__head-text">
              <span className="wf-card__name">{node.name}</span>
              <span className="wf-card__type-tag">{definition.label}</span>
            </div>
            <span className="wf-card__meta">{meta}</span>
          </div>
          <div className="wf-card__view">
            <NodePreview node={node} run={run} />
          </div>
          <StatusBadge missing={missing} run={run} />
          {isTrigger ? <span aria-hidden="true" className="wf-bolt"><Icon name="bolt" size={12} /></span> : null}
        </div>
        <Handle className="wf-handle" position={Position.Right} type="source" />
      </div>
    );
  }

  // Modern compact horizontal card (n8n standard)
  return (
    <div
      className="wf-node wf-node--compact"
      data-category={definition.category}
      data-selected={selected || undefined}
      data-status={run.status}
      onClick={() => data.onSelect?.(node.id)}
    >
      {!isTrigger ? <Handle className="wf-handle" position={Position.Left} type="target" /> : null}
      <div className="wf-compact-card" data-trigger={isTrigger || undefined}>
        <span className="wf-compact-card__icon">
          <NodeGlyph icon={definition.icon} size={24} />
        </span>
        <div className="wf-compact-card__info">
          <strong className="wf-compact-card__name">{node.name}</strong>
          <span className="wf-compact-card__meta">{meta}</span>
        </div>
        <StatusBadge missing={missing} run={run} />
        {isTrigger ? <span aria-hidden="true" className="wf-bolt"><Icon name="bolt" size={12} /></span> : null}
      </div>
      <Handle className="wf-handle" position={Position.Right} type="source" />
    </div>
  );
}

export const FlowNode = memo(FlowNodeView);
