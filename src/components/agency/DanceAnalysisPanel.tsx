"use client";

import { useState } from "react";
import { FileField, MetricBar } from "@/components/agency/AnalysisParts";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface PoseAnalysis {
  durationSec: number;
  sampledFrames: number;
  detectionRate: number;
  movementRange: number;
  avgMovementSpeed: number;
  limbSymmetry: number;
  framingScore: number;
  tempoBpm: number | null;
  beatSyncScore: number | null;
}

interface ChoreoComparison {
  referenceFrames: number;
  candidateFrames: number;
  choreoMatchScore: number | null;
}

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; analysis: PoseAnalysis }
  | { status: "error"; message: string };

type ChoreoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; comparison: ChoreoComparison }
  | { status: "error"; message: string };

export function DanceAnalysisPanel() {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [choreoState, setChoreoState] = useState<ChoreoState>({ status: "idle" });
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [candidateFile, setCandidateFile] = useState<File | null>(null);

  async function runChoreoComparison(event: React.FormEvent) {
    event.preventDefault();
    if (!referenceFile || !candidateFile) return;

    setChoreoState({ status: "loading" });

    try {
      const formData = new FormData();
      formData.append("reference", referenceFile);
      formData.append("candidate", candidateFile);
      const response = await fetch("/api/talent/compare-choreography", { method: "POST", body: formData });
      const data = (await response.json()) as { comparison?: ChoreoComparison; error?: string };
      if (!response.ok || !data.comparison) throw new Error(data.error ?? "비교에 실패했습니다.");

      setChoreoState({ status: "success", comparison: data.comparison });
    } catch (error) {
      setChoreoState({
        status: "error",
        message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setState({ status: "loading" });

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/talent/analyze-pose", { method: "POST", body: formData });
      const data = (await response.json()) as { analysis?: PoseAnalysis; error?: string };
      if (!response.ok || !data.analysis) throw new Error(data.error ?? "분석에 실패했습니다.");

      setState({ status: "success", analysis: data.analysis });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  }

  const videoTypes = "video/mp4,video/webm,video/quicktime";
  return (
    <div className="an-panel">
      <section className="an-block">
        <div className="an-block__head">
          <div>
            <h3>동작 측정</h3>
            <p>영상 한 개에서 박자·움직임 범위·대칭을 측정합니다. 실력 판단보다는 촬영 상태 확인용이에요.</p>
          </div>
          <label className="s-btn s-btn--sm an-upload">
            {state.status === "loading" ? "측정 중… (1~2분)" : "영상 올려 측정"}
            <input accept={videoTypes} className="sr-only" disabled={state.status === "loading"} type="file" onChange={handleFileChange} />
          </label>
        </div>
        {state.status === "error" ? <p className="an-error" role="alert">{state.message}</p> : null}
        {state.status === "success" ? (
          <div className="an-result">
            <div className="an-result__tags">
              <StatusBadge tone="positive">MediaPipe 측정 결과</StatusBadge>
              {state.analysis.tempoBpm ? <StatusBadge tone="info">{state.analysis.tempoBpm} BPM</StatusBadge> : null}
            </div>
            <MetricBar hint="음악 비트와 동작의 정점이 겹치는 정도" label="박자 맞춤" value={state.analysis.beatSyncScore} />
            <MetricBar hint="팔다리가 화면에서 움직인 넓이" label="움직임 범위" value={state.analysis.movementRange} />
            <MetricBar hint="프레임 사이 관절 평균 이동량" label="움직임 속도" value={state.analysis.avgMovementSpeed} />
            <MetricBar hint="좌우 팔다리 움직임의 균형" label="좌우 대칭" value={state.analysis.limbSymmetry} />
            <MetricBar hint="상체가 화면에서 차지하는 비중" label="프레이밍" value={state.analysis.framingScore} />
            <p className="an-note">인식률 {Math.round(state.analysis.detectionRate * 100)}% · 움직임의 양과 형태를 잰 값입니다. 실력 비교는 아래 안무 비교를 사용하세요.</p>
          </div>
        ) : null}
      </section>

      <section className="an-block">
        <div className="an-block__head">
          <div>
            <h3>안무 비교</h3>
            <p>기준 안무 영상과 지원자 영상의 관절 좌표를 같은 구간끼리 맞춰(DTW) 유사도를 계산합니다.</p>
          </div>
        </div>
        <form className="an-form" onSubmit={runChoreoComparison}>
          <FileField accept={videoTypes} disabled={choreoState.status === "loading"} file={referenceFile} label="기준 안무 영상" onChange={setReferenceFile} />
          <FileField accept={videoTypes} disabled={choreoState.status === "loading"} file={candidateFile} label="지원자 영상" onChange={setCandidateFile} />
          <button className="s-btn s-btn--dark s-btn--sm" disabled={!referenceFile || !candidateFile || choreoState.status === "loading"} type="submit">
            {choreoState.status === "loading" ? "비교 중… (2~3분)" : "안무 비교 실행"}
          </button>
        </form>
        {choreoState.status === "error" ? <p className="an-error" role="alert">{choreoState.message}</p> : null}
        {choreoState.status === "success" ? (
          <div className="an-result">
            <MetricBar
              hint={`기준 ${choreoState.comparison.referenceFrames}프레임 · 지원자 ${choreoState.comparison.candidateFrames}프레임 비교`}
              label="안무 일치도"
              value={choreoState.comparison.choreoMatchScore}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
