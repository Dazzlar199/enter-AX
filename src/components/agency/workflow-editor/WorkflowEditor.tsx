"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  deleteCustomNode,
  getAllNodeDefinitions,
  getNodeDefinition,
  missingParams,
  type NodeDefinition,
} from "@/features/workflows/catalog";
import { emptyRun, executionOrder, resolveApproval, runWorkflow, type NodeExecutor } from "@/features/workflows/engine";
import { createExecutor, type WorkflowAppContext } from "@/features/workflows/executor";
import { LocalWorkflowStore } from "@/features/workflows/store";
import { blankWorkflow } from "@/features/workflows/templates";
import type { NodeRunState, RunState, WorkflowDefinition, WorkflowNode, WorkflowNodeType } from "@/features/workflows/types";
import type { WorkflowPermissions } from "@/features/workflows/permissions";
import { Icon } from "@/components/shared/Icon";

import { CustomNodeModal } from "./CustomNodeModal";
import { AiGeneratorModal } from "./AiGeneratorModal";
import { FlowNode, type FlowNodeType } from "./FlowNode";
import { DRAG_MIME, NodePalette } from "./NodePalette";
import { NodePanel } from "./NodePanel";

const nodeTypes = { workflow: FlowNode };
const IDLE: NodeRunState = { status: "idle" };

const runLabel: Record<RunState["status"], string> = {
  idle: "실행 전",
  running: "실행 중",
  waiting: "승인 대기",
  success: "실행 완료",
  error: "오류 발생",
};

function toFlowNode(
  node: WorkflowNode,
  run: NodeRunState,
  preview: boolean,
  onSelect: (id: string) => void,
  previous?: FlowNodeType,
): FlowNodeType {
  return {
    ...previous,
    id: node.id,
    type: "workflow",
    position: previous?.position ?? node.position,
    data: { node, run, preview, onSelect },
  };
}

function Editor({ app, permissions }: { app: WorkflowAppContext; permissions: WorkflowPermissions }) {
  const store = useMemo(() => new LocalWorkflowStore(), []);
  const { screenToFlowPosition, fitView, setCenter } = useReactFlow();
  const appRef = useRef(app);
  appRef.current = app;

  const [workflows, setWorkflows] = useState<WorkflowDefinition[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, RunState>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [flowNodes, setFlowNodes] = useState<FlowNodeType[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [preview, setPreview] = useState(true);

  // Pane resizing and collapsing state
  const [paletteWidth, setPaletteWidth] = useState(270);
  const [panelWidth, setPanelWidth] = useState(380);
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isFocusCanvas, setIsFocusCanvas] = useState(false);

  // Custom node builder modal & catalog sync
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [catalogNodes, setCatalogNodes] = useState<NodeDefinition[]>([]);

  const selectNode = useCallback((id: string) => {
    setSelectedId(id);
    setIsPanelCollapsed(false);
    setIsFocusCanvas(false);
  }, []);

  useEffect(() => {
    setCatalogNodes(getAllNodeDefinitions());
  }, []);

  useEffect(() => {
    const loaded = store.list();
    setWorkflows(loaded);
    setActiveId(loaded[0]?.id ?? null);
  }, [store]);

  const active = workflows?.find((workflow) => workflow.id === activeId) ?? null;
  const run = useMemo(() => (active ? runs[active.id] ?? emptyRun(active) : null), [active, runs]);
  const running = run?.status === "running";

  // Keep React Flow's node list in sync with the definition and run state.
  const flowWorkflowId = useRef<string | null>(null);
  useEffect(() => {
    if (!active || !run) return;
    const sameWorkflow = flowWorkflowId.current === active.id;
    flowWorkflowId.current = active.id;
    setFlowNodes((previous) =>
      active.nodes.map((node) =>
        toFlowNode(
          node,
          run.nodes[node.id] ?? IDLE,
          preview,
          selectNode,
          sameWorkflow ? previous.find((entry) => entry.id === node.id) : undefined,
        ),
      ),
    );
  }, [active, run, preview, selectNode]);

  // When a run stops at an approval node, open that node so the approver sees the request right away.
  const waitingId = active && run ? active.nodes.find((node) => run.nodes[node.id]?.status === "waiting")?.id ?? null : null;
  useEffect(() => {
    if (waitingId) {
      setSelectedId(waitingId);
      setIsPanelCollapsed(false);
    }
  }, [waitingId]);

  const panelOpen = Boolean(selectedId && !isPanelCollapsed && !isFocusCanvas);
  const zoomTarget = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const target = zoomTarget.current;
      zoomTarget.current = null;
      if (target) void setCenter(target.x, target.y, { zoom: 1.5, duration: 300 });
      else void fitView({ padding: 0.15, minZoom: 0.25, maxZoom: 1.1, duration: 200 });
    }, 30);
    return () => window.clearTimeout(timer);
  }, [panelOpen, preview, fitView, setCenter, isPaletteCollapsed]);

  const displayNodes = useMemo(() => flowNodes.map((node) => ({ ...node, selected: node.id === selectedId })), [flowNodes, selectedId]);

  useEffect(() => {
    if (!activeId) return;
    setSelectedId(null);
    const timer = window.setTimeout(() => fitView({ padding: 0.15, minZoom: 0.25, maxZoom: 1.1 }), 60);
    return () => window.clearTimeout(timer);
  }, [activeId, fitView]);

  // Drag resizing for left palette
  const startResizePalette = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = paletteWidth;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(180, Math.min(460, startWidth + delta));
        setPaletteWidth(newWidth);
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [paletteWidth],
  );

  // Drag resizing for right panel
  const startResizePanel = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = panelWidth;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = startX - moveEvent.clientX; // dragging left increases width
        const newWidth = Math.max(280, Math.min(640, startWidth + delta));
        setPanelWidth(newWidth);
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [panelWidth],
  );

  // Autosave the active workflow shortly after each edit.
  const lastSaved = useRef<string>("");
  useEffect(() => {
    if (!active) return;
    const serialized = JSON.stringify({ ...active, updatedAt: "" });
    if (!lastSaved.current) {
      lastSaved.current = serialized;
      return;
    }
    if (serialized === lastSaved.current) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      store.save(active);
      lastSaved.current = serialized;
      setSaveState("saved");
    }, 400);
    return () => window.clearTimeout(timer);
  }, [active, store]);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 3500);
  }, []);

  const updateActive = useCallback(
    (mutate: (workflow: WorkflowDefinition) => WorkflowDefinition) => {
      setWorkflows((current) =>
        current?.map((workflow) => (workflow.id === activeId ? { ...mutate(workflow), updatedAt: new Date().toISOString() } : workflow)) ?? current,
      );
    },
    [activeId],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNodeType>[]) => {
      if (!permissions.canEdit && changes.some((change) => change.type !== "select")) return;
      setFlowNodes((current) => applyNodeChanges(changes, current));
      const removed = new Set(changes.filter((change) => change.type === "remove").map((change) => change.id));
      const moved = changes.filter((change) => change.type === "position" && change.position && change.dragging === false);
      for (const change of changes) {
        if (change.type === "select") {
          setSelectedId((current) => (change.selected ? change.id : current === change.id ? null : current));
          if (change.selected) setIsPanelCollapsed(false);
        }
      }
      if (removed.size === 0 && moved.length === 0) return;
      updateActive((workflow) => ({
        ...workflow,
        nodes: workflow.nodes
          .filter((node) => !removed.has(node.id))
          .map((node) => {
            const change = moved.find((entry) => entry.type === "position" && entry.id === node.id);
            return change && change.type === "position" && change.position ? { ...node, position: change.position } : node;
          }),
        edges: workflow.edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target)),
      }));
    },
    [permissions.canEdit, updateActive],
  );

  const flowEdges: Edge[] = useMemo(() => {
    if (!active || !run) return [];
    return active.edges.map((edge) => {
      const source = run.nodes[edge.source];
      const target = run.nodes[edge.target];
      const count = source?.status === "success" ? source.output?.length ?? 0 : null;
      const done = source?.status === "success" && target && target.status !== "idle" && target.status !== "skipped";
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: source?.status === "running" || target?.status === "running",
        className: `wf-edge${done ? " wf-edge--done" : ""}`,
        label: count !== null ? `${count}건` : undefined,
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: done ? "#16804f" : "#a7a7a2" },
        selected: edge.id === selectedEdgeId,
      };
    });
  }, [active, run, selectedEdgeId]);

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      if (!permissions.canEdit && changes.some((change) => change.type !== "select")) return;
      const removed = new Set(changes.filter((change) => change.type === "remove").map((change) => change.id));
      for (const change of changes) {
        if (change.type === "select") setSelectedEdgeId((current) => (change.selected ? change.id : current === change.id ? null : current));
      }
      if (removed.size === 0) return;
      updateActive((workflow) => ({ ...workflow, edges: workflow.edges.filter((edge) => !removed.has(edge.id)) }));
    },
    [permissions.canEdit, updateActive],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!permissions.canEdit) return;
      if (!active || !connection.source || !connection.target || connection.source === connection.target) return;
      if (active.edges.some((edge) => edge.source === connection.source && edge.target === connection.target)) return;
      const edge = { id: `${connection.source}->${connection.target}`, source: connection.source, target: connection.target };
      try {
        executionOrder({ ...active, edges: [...active.edges, edge] });
      } catch (reason) {
        flash(reason instanceof Error ? reason.message : "연결할 수 없습니다.");
        return;
      }
      updateActive((workflow) => ({ ...workflow, edges: [...workflow.edges, edge] }));
    },
    [active, flash, permissions.canEdit, updateActive],
  );

  const addNode = useCallback(
    (type: WorkflowNodeType, position?: { x: number; y: number }) => {
      if (!permissions.canEdit) return;
      if (!active) return;
      const definition = getNodeDefinition(type);
      if (definition.category === "trigger" && active.nodes.some((node) => getNodeDefinition(node.type).category === "trigger")) {
        flash("시작 단계는 자동화마다 하나만 둘 수 있습니다.");
        return;
      }
      const anchor = active.nodes.find((node) => node.id === selectedId) ?? [...active.nodes].sort((a, b) => b.position.x - a.position.x)[0];
      const prefix = type.includes(".") ? type.split(".")[1] : type;
      const id = `${prefix}-${Date.now().toString(36).slice(-4)}`;
      const node: WorkflowNode = {
        id,
        type,
        name: definition.label,
        position: position ?? { x: (anchor?.position.x ?? 0) + 270, y: anchor?.position.y ?? 0 },
        params: { ...definition.defaults },
      };
      updateActive((workflow) => ({
        ...workflow,
        nodes: [...workflow.nodes, node],
        edges: !position && anchor && anchor.id === selectedId ? [...workflow.edges, { id: `${anchor.id}->${id}`, source: anchor.id, target: id }] : workflow.edges,
      }));
      setSelectedId(id);
      setIsPanelCollapsed(false);
    },
    [active, flash, permissions.canEdit, selectedId, updateActive],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(DRAG_MIME) as WorkflowNodeType;
      if (!type) return;
      const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(type, { x: point.x - 60, y: point.y - 30 });
    },
    [addNode, screenToFlowPosition],
  );

  const executor: NodeExecutor = useCallback(async (node, input) => {
    const definition = getNodeDefinition(node.type);
    const missing = missingParams(node.type, { ...definition.defaults, ...node.params });
    if (missing.length) throw new Error(`필수 설정을 입력해 주세요: ${missing.join(", ")}`);
    return createExecutor(appRef.current)(node, input);
  }, []);

  const execute = useCallback(
    async (from: RunState) => {
      if (!active) return;
      const workflowId = active.id;
      try {
        await runWorkflow(active, from, executor, (state) => setRuns((current) => ({ ...current, [workflowId]: state })));
      } catch (reason) {
        flash(reason instanceof Error ? reason.message : "실행할 수 없습니다.");
        setRuns((current) => ({ ...current, [workflowId]: { ...from, status: "error" } }));
      }
    },
    [active, executor, flash],
  );

  const startRun = () => {
    if (!active || running || !permissions.canExecute) return;
    if (!active.nodes.some((node) => getNodeDefinition(node.type).category === "trigger")) {
      flash("‘시작 방법’ (직접 시작 또는 구글 폼) 단계를 먼저 추가해 주세요.");
      return;
    }
    void execute(emptyRun(active));
  };

  const approve = (nodeId: string, approved: boolean) => {
    if (!run || !permissions.canApprove) return;
    void execute(resolveApproval(run, nodeId, approved));
  };

  const createWorkflow = () => {
    if (!permissions.canEdit) return;
    const workflow = blankWorkflow(`새 자동화 ${(workflows?.length ?? 0) + 1}`);
    store.save(workflow);
    setWorkflows((current) => [...(current ?? []), workflow]);
    setActiveId(workflow.id);
  };

  const deleteWorkflow = () => {
    if (!active || !workflows || !permissions.canEdit) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      window.setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    store.remove(active.id);
    const rest = workflows.filter((workflow) => workflow.id !== active.id);
    const next = rest.length ? rest : store.list();
    setWorkflows(next);
    setActiveId(next[0]?.id ?? null);
    setConfirmDelete(false);
  };

  if (!workflows || !active || !run) return <div className="wf-loading">자동화를 불러오는 중…</div>;

  const selectedNode = active.nodes.find((node) => node.id === selectedId) ?? null;
  const waitingNode = active.nodes.find((node) => run.nodes[node.id]?.status === "waiting");
  const doneCount = Object.values(run.nodes).filter((node) => node.status === "success").length;

  const effectivePaletteWidth = isPaletteCollapsed || isFocusCanvas ? 0 : paletteWidth;
  const effectivePanelWidth = selectedNode && !isPanelCollapsed && !isFocusCanvas ? panelWidth : 0;

  return (
    <div className="wf-editor">
      <div className="wf-topbar">
        <div className="wf-topbar__left">
          <select aria-label="업무 흐름 선택" className="wf-select" value={active.id} onChange={(event) => setActiveId(event.target.value)}>
            {workflows.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}
          </select>
          <input
            aria-label="자동화 이름"
            className="wf-name"
            disabled={!permissions.canEdit}
            value={active.name}
            onChange={(event) => updateActive((workflow) => ({ ...workflow, name: event.target.value.slice(0, 80) || "이름 없음" }))}
          />
          <span className="wf-saved" aria-live="polite">{saveState === "saving" ? "저장 중…" : "자동 저장됨"}</span>
        </div>
        <div className="wf-topbar__right">
          <span className="wf-runstate" data-status={run.status} aria-live="polite">
            <i aria-hidden="true" />
            {run.status === "waiting" && waitingNode ? `승인 대기 · ${waitingNode.name}` : run.status === "idle" ? runLabel.idle : `${runLabel[run.status]} · ${doneCount}/${active.nodes.length} 단계`}
          </span>

          <button
            aria-pressed={isFocusCanvas}
            className="wf-btn wf-toggle"
            type="button"
            title="캔버스 넓게 보기 (좌우 패널 접기/펼치기)"
            onClick={() => {
              setIsFocusCanvas((prev) => {
                const next = !prev;
                setIsPaletteCollapsed(next);
                setIsPanelCollapsed(next);
                return next;
              });
            }}
          >
            <Icon name="maximize" size={14} />
            {isFocusCanvas ? "원래 크기로" : "캔버스 최대화"}
          </button>

          <button aria-pressed={preview} className="wf-btn wf-toggle" type="button" onClick={() => setPreview((current) => !current)}>
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" /><circle cx="10" cy="10" r="2.5" /></svg>
            단계 자세히 보기
          </button>

          <button
            className="wf-btn wf-btn--ai"
            type="button"
            title="업무 설명이나 준비된 양식으로 단계 구성"
            disabled={!permissions.canEdit}
            onClick={() => setAiModalOpen(true)}
          >
            <Icon name="sparkle" size={14} />
            <span>업무 흐름 빠른 설정</span>
          </button>

          <button className="wf-btn" disabled={!permissions.canEdit} type="button" onClick={createWorkflow}>+ 새 업무 흐름</button>
          <button className="wf-btn wf-btn--ghost" disabled={!permissions.canEdit} type="button" onClick={deleteWorkflow}>{confirmDelete ? "한 번 더 눌러 삭제" : "삭제"}</button>
          <button className="wf-btn wf-btn--run" disabled={running || !permissions.canExecute} type="button" onClick={startRun}>
            <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" /></svg>
            {running ? "처리 중…" : "업무 흐름 시작"}
          </button>
        </div>
      </div>

      {notice ? <p className="wf-notice" role="status">{notice}</p> : null}

      <div
        className="wf-body"
        data-panel={selectedNode ? "" : undefined}
        style={{
          gridTemplateColumns: `${effectivePaletteWidth ? `${effectivePaletteWidth}px` : "0px"} minmax(0, 1fr) ${effectivePanelWidth ? `${effectivePanelWidth}px` : "0px"}`,
        }}
      >
        {/* Left Palette with Dynamic Width & Collapse Support */}
        <div
          className="wf-pane-container wf-pane-container--palette"
          style={{
            width: effectivePaletteWidth || undefined,
            display: effectivePaletteWidth === 0 ? "none" : "flex",
          }}
        >
          <NodePalette
            nodes={catalogNodes}
            readOnly={!permissions.canEdit}
            onAdd={(type) => addNode(type)}
            onCollapse={() => setIsPaletteCollapsed(true)}
            onDeleteCustom={(type) => {
              deleteCustomNode(type);
              setCatalogNodes(getAllNodeDefinitions());
              flash("맞춤 단계가 삭제되었습니다.");
            }}
            onOpenCustomModal={() => setCustomModalOpen(true)}
          />
        </div>

        {/* Left Splitter */}
        {effectivePaletteWidth > 0 ? (
          <div
            className="wf-resizer wf-resizer--left"
            style={{ left: `${effectivePaletteWidth}px` }}
            title="드래그하여 팔레트 너비 조절 (더블클릭 시 접기)"
            onDoubleClick={() => setIsPaletteCollapsed(true)}
            onMouseDown={startResizePalette}
          >
            <div className="wf-resizer__handle" />
          </div>
        ) : null}

        {/* Center Canvas */}
        <div className="wf-canvas" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={onDrop}>
          {/* Floating Expand Buttons on Canvas when Panes are Collapsed */}
          {isPaletteCollapsed || isFocusCanvas ? (
            <button
              aria-label="단계 목록 펼치기"
              className="wf-floating-tab wf-floating-tab--left"
              title="단계 목록 열기"
              type="button"
              onClick={() => {
                setIsPaletteCollapsed(false);
                setIsFocusCanvas(false);
              }}
            >
              <Icon name="sidebar" size={14} />
              <span>+ 단계 목록</span>
            </button>
          ) : null}

          {selectedNode && (isPanelCollapsed || isFocusCanvas) ? (
            <button
              aria-label="단계 설정 패널 열기"
              className="wf-floating-tab wf-floating-tab--right"
              title="단계 설정 열기"
              type="button"
              onClick={() => {
                setIsPanelCollapsed(false);
                setIsFocusCanvas(false);
              }}
            >
              <Icon name="sidebar" size={14} />
              <span>{selectedNode.name} 설정</span>
            </button>
          ) : null}

          <ReactFlow
            deleteKeyCode={permissions.canEdit ? ["Backspace", "Delete"] : null}
            edges={flowEdges}
            fitView
            fitViewOptions={{ padding: 0.15, minZoom: 0.25, maxZoom: 1.1 }}
            maxZoom={1.8}
            minZoom={0.3}
            nodeTypes={nodeTypes}
            nodes={displayNodes}
            nodesConnectable={permissions.canEdit}
            nodesDraggable={permissions.canEdit}
            proOptions={{ hideAttribution: true }}
            onConnect={onConnect}
            onEdgesChange={onEdgesChange}
            onNodesChange={onNodesChange}
            onNodeClick={(_, node) => {
              setSelectedId(node.id);
              setIsPanelCollapsed(false);
            }}
            onNodeDoubleClick={(_, node) => {
              setSelectedId(node.id);
              setIsPanelCollapsed(false);
              const width = node.measured?.width ?? 240;
              const height = node.measured?.height ?? 140;
              const target = { x: node.position.x + width / 2, y: node.position.y + height / 2 };
              zoomTarget.current = target;
              window.setTimeout(() => {
                if (zoomTarget.current !== target) return;
                zoomTarget.current = null;
                void setCenter(target.x, target.y, { zoom: 1.5, duration: 300 });
              }, 260);
            }}
            onPaneClick={() => setSelectedId(null)}
            zoomOnDoubleClick={false}
          >
            <Background color="#cbd5e1" gap={22} size={1.5} variant={BackgroundVariant.Dots} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="wf-minimap" nodeColor="#94a3b8" style={{ width: 150, height: 96 }} />
          </ReactFlow>
          {active.nodes.length <= 1 ? (
            <p className="wf-canvas__hint">왼쪽 팔레트에서 카카오톡, 노션, AI 안무 분석 등 원하는 단계를 끌어다 놓고 선으로 연결해 보세요.</p>
          ) : null}
        </div>

        {/* Right Splitter */}
        {effectivePanelWidth > 0 ? (
          <div
            className="wf-resizer wf-resizer--right"
            style={{ right: `${effectivePanelWidth}px` }}
            title="드래그하여 설정창 너비 조절 (더블클릭 시 접기)"
            onDoubleClick={() => setIsPanelCollapsed(true)}
            onMouseDown={startResizePanel}
          >
            <div className="wf-resizer__handle" />
          </div>
        ) : null}

        {/* Right Panel with Dynamic Width & Minimize Support */}
        {selectedNode && effectivePanelWidth > 0 ? (
          <div
            className="wf-pane-container wf-pane-container--panel"
            style={{ width: effectivePanelWidth }}
          >
            <NodePanel
              key={selectedNode.id}
              node={selectedNode}
              run={run.nodes[selectedNode.id] ?? IDLE}
              onApprove={(approved) => approve(selectedNode.id, approved)}
              canApprove={permissions.canApprove}
              canEdit={permissions.canEdit}
              onChange={(next) => updateActive((workflow) => ({ ...workflow, nodes: workflow.nodes.map((node) => (node.id === next.id ? next : node)) }))}
              onClose={() => {
                setSelectedId(null);
                setIsPanelCollapsed(false);
              }}
              onDelete={() => {
                updateActive((workflow) => ({
                  ...workflow,
                  nodes: workflow.nodes.filter((node) => node.id !== selectedNode.id),
                  edges: workflow.edges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id),
                }));
                setSelectedId(null);
              }}
              onMinimize={() => setIsPanelCollapsed(true)}
            />
          </div>
        ) : null}
      </div>

      <CustomNodeModal
        isOpen={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        onCreated={(newNode) => {
          setCatalogNodes(getAllNodeDefinitions());
          flash(`맞춤 단계 '${newNode.label}'이(가) 등록되었습니다.`);
        }}
      />

      <AiGeneratorModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onGenerated={(newWf) => {
          store.save(newWf);
          setWorkflows((current) => [...(current ?? []), newWf]);
          setActiveId(newWf.id);
          setAiModalOpen(false);
          flash(`'${newWf.name}' 업무 흐름을 만들었습니다.`);
          window.setTimeout(() => fitView({ padding: 0.15, minZoom: 0.25, maxZoom: 1.1 }), 80);
        }}
      />
    </div>
  );
}

export function WorkflowEditor({ app, permissions }: { app: WorkflowAppContext; permissions: WorkflowPermissions }) {
  return (
    <ReactFlowProvider>
      <Editor app={app} permissions={permissions} />
    </ReactFlowProvider>
  );
}
