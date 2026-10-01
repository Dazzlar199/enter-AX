"use client";

import { useState } from "react";

import { FileField, MetricBar } from "@/components/agency/AnalysisParts";

interface PitchComparison {
  referenceVoicedRatio: number;
  candidateVoicedRatio: number;
  pitchMatchScore: number | null;
}

type ComparisonState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; comparison: PitchComparison }
  | { status: "error"; message: string };

export function VocalAnalysisPanel() {
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [candidateFile, setCandidateFile] = useState<File | null>(null);
  const [state, setState] = useState<ComparisonState>({ status: "idle" });

  async function runComparison(event: React.FormEvent) {
    event.preventDefault();
    if (!referenceFile || !candidateFile) return;

    setState({ status: "loading" });

    try {
      const formData = new FormData();
      formData.append("reference", referenceFile);
      formData.append("candidate", candidateFile);
      const response = await fetch("/api/talent/compare-pitch", { method: "POST", body: formData });
      const data = (await response.json()) as { comparison?: PitchComparison; error?: string };
      if (!response.ok || !data.comparison) throw new Error(data.error ?? "비교에 실패했습니다.");

      setState({ status: "success", comparison: data.comparison });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  }

  const mediaTypes = "video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/mp4";
  return (
    <div className="an-panel">
      <section className="an-block">
        <div className="an-block__head">
          <div>
            <h3>음정 비교</h3>
            <p>원곡과 지원자 음원의 음정 곡선을 맞춰(DTW) 비교합니다. 키 차이는 보정하고, 가사·발음은 평가하지 않아요.</p>
          </div>
        </div>
        <form className="an-form" onSubmit={runComparison}>
          <FileField accept={mediaTypes} disabled={state.status === "loading"} file={referenceFile} label="원곡 보컬 또는 MV" onChange={setReferenceFile} />
          <FileField accept={mediaTypes} disabled={state.status === "loading"} file={candidateFile} label="지원자 음원" onChange={setCandidateFile} />
          <button className="s-btn s-btn--dark s-btn--sm" disabled={!referenceFile || !candidateFile || state.status === "loading"} type="submit">
            {state.status === "loading" ? "비교 중… (1~2분)" : "음정 비교 실행"}
          </button>
        </form>
        {state.status === "error" ? <p className="an-error" role="alert">{state.message}</p> : null}
        {state.status === "success" ? (
          <div className="an-result">
            <MetricBar hint="키·옥타브 차이를 보정한 음정 곡선 유사도" label="음정 일치도" missing="노래 구간이 너무 짧아요" value={state.comparison.pitchMatchScore} />
            <p className="an-note">
              원곡 발성 구간 {Math.round(state.comparison.referenceVoicedRatio * 100)}% · 지원자 발성 구간 {Math.round(state.comparison.candidateVoicedRatio * 100)}%
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
