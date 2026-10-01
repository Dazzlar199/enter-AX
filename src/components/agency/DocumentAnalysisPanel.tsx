"use client";

import { useState } from "react";

interface ActionPlanStep {
  step: string;
  detail: string;
}

interface DocumentAnalysis {
  summary: string;
  goals: string[];
  strengths: string[];
  risks: string[];
  missingInfo: string[];
  actionPlan: ActionPlanStep[];
}

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; analysis: DocumentAnalysis; fileName: string }
  | { status: "error"; message: string };

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="ax-doc__list">
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </div>
  );
}

export function DocumentAnalysisPanel() {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setState({ status: "loading" });

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/ax/analyze-document", { method: "POST", body: formData });
      const data = (await response.json()) as { analysis?: DocumentAnalysis; error?: string };
      if (!response.ok || !data.analysis) throw new Error(data.error ?? "분석에 실패했습니다.");

      setState({ status: "success", analysis: data.analysis, fileName: file.name });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  }

  return (
    <section aria-labelledby="doc-analysis-title" className="ax-doc">
      <header className="ax-section-head">
        <h2 id="doc-analysis-title">문서 분석</h2>
        <span>PDF · DOCX · TXT · MD</span>
      </header>
      <label className="ax-drop" data-busy={state.status === "loading"}>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 16V4m0 0-4 4m4-4 4 4M5 16v3h14v-3" /></svg>
        <strong>{state.status === "loading" ? "문서 분석 중…" : "기획서·콘셉트북 업로드"}</strong>
        <span>목표, 강점, 리스크, 보완할 정보, 다음 실행 계획으로 정리합니다.</span>
        <input
          accept=".pdf,.docx,.txt,.md"
          className="sr-only"
          disabled={state.status === "loading"}
          onChange={handleFileChange}
          type="file"
        />
      </label>

      {state.status === "error" ? (
        <p className="ax-doc__error" role="alert">{state.message}</p>
      ) : null}

      {state.status === "success" ? (
        <article className="ax-doc__result">
          <p className="ax-doc__file">{state.fileName}</p>
          <p className="ax-doc__summary">{state.analysis.summary}</p>
          <div className="ax-doc__grid">
            <ListSection title="핵심 목표" items={state.analysis.goals} />
            <ListSection title="강점" items={state.analysis.strengths} />
            <ListSection title="리스크" items={state.analysis.risks} />
            <ListSection title="보완이 필요한 정보" items={state.analysis.missingInfo} />
          </div>
          {state.analysis.actionPlan.length > 0 ? (
            <div className="ax-doc__plan">
              <h4>다음 실행 계획</h4>
              <ol>
                {state.analysis.actionPlan.map((item, index) => (
                  <li key={index}>
                    <strong>{item.step}</strong>
                    <p>{item.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
