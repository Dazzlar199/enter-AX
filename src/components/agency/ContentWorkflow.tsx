"use client";

import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ContentJobInput } from "@/features/demo/repository";
import type { ContentAction, ContentClipCandidate } from "@/types/domain";

interface ProcessApiClip {
  index: number;
  start: number;
  end: number;
  score: number;
  url: string;
}

interface TranscriptChunk {
  start: number;
  end: number;
  text: string;
}

interface PlanSegment {
  role: string;
  start: number;
  end: number;
  caption: string;
}

interface ProcessApiResponse {
  jobId: string;
  transcript: string;
  transcriptChunks: TranscriptChunk[];
  clips: ProcessApiClip[];
  plan?: PlanSegment[];
  contentType?: string;
  error?: string;
}

type CapcutExportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; draftName: string }
  | { status: "error"; message: string };

interface ImageSearchResult {
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  sourceUrl: string;
  sourceDomain: string;
}

type PromoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; url: string; narration?: string }
  | { status: "error"; message: string };

interface ChannelVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
}

const CHANNEL_LAST_SEEN_KEY = "enter-ax:channel-last-seen";

type PublishState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; url: string }
  | { status: "error"; message: string };

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function ContentWorkflow({
  onCreate,
  onTransition,
}: {
  onCreate: (input: ContentJobInput) => string;
  onTransition: (id: string, action: ContentAction, reason?: string) => void;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [channels, setChannels] = useState<Array<"shorts" | "reels" | "tiktok">>([
    "shorts",
    "reels",
  ]);
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [layoutMode, setLayoutMode] = useState<"blur" | "crop">("blur");
  const [captionStyle, setCaptionStyle] = useState<"apple" | "pill" | "viral" | "classic">("apple");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunk[]>([]);
  const [clips, setClips] = useState<ContentClipCandidate[]>([]);
  const [usePlanning, setUsePlanning] = useState(false);
  const [artistName, setArtistName] = useState("");
  const [trackInfo, setTrackInfo] = useState("");
  const [channelHandle, setChannelHandle] = useState("");
  const [capcutFolder, setCapcutFolder] = useState("");
  const [capcutExports, setCapcutExports] = useState<Record<string, CapcutExportState>>({});
  const [imageQuery, setImageQuery] = useState("");
  const [imageResults, setImageResults] = useState<ImageSearchResult[]>([]);
  const [imageSearchStatus, setImageSearchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [imageSearchError, setImageSearchError] = useState("");
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [promoStates, setPromoStates] = useState<Record<string, PromoState>>({});
  const [channelUrl, setChannelUrl] = useState("");
  const [channelVideos, setChannelVideos] = useState<ChannelVideo[]>([]);
  const [channelStatus, setChannelStatus] = useState<"idle" | "loading" | "error">("idle");
  const [channelError, setChannelError] = useState("");
  const [channelLastSeen, setChannelLastSeen] = useState("");
  const [youtubeConnected, setYoutubeConnected] = useState<boolean | null>(null);
  const [youtubeStatusMessage, setYoutubeStatusMessage] = useState("");
  const [youtubeTitles, setYoutubeTitles] = useState<Record<string, string>>({});
  const [publishStates, setPublishStates] = useState<Record<string, PublishState>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function searchImages(event: React.FormEvent) {
    event.preventDefault();
    if (!imageQuery.trim()) return;
    setImageSearchStatus("loading");
    setImageSearchError("");

    try {
      const response = await fetch(`/api/content/image-search?query=${encodeURIComponent(imageQuery)}`);
      const data = (await response.json()) as { results?: ImageSearchResult[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "이미지 검색에 실패했습니다.");

      setImageResults(data.results ?? []);
      setImageSearchStatus("idle");
    } catch (error) {
      setImageSearchStatus("error");
      setImageSearchError(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    }
  }

  function toggleImageSelection(imageUrl: string) {
    setSelectedImageUrls((current) =>
      current.includes(imageUrl)
        ? current.filter((url) => url !== imageUrl)
        : current.length < 6
          ? [...current, imageUrl]
          : current,
    );
  }

  async function createPromoShort(clip: ContentClipCandidate) {
    if (!clip.url || selectedImageUrls.length === 0) return;
    setPromoStates((current) => ({ ...current, [clip.id]: { status: "loading" } }));

    const selectedImages = selectedImageUrls
      .map((url) => imageResults.find((result) => result.imageUrl === url))
      .filter((result): result is ImageSearchResult => Boolean(result))
      .map((result) => ({ imageUrl: result.imageUrl, sourceDomain: result.sourceDomain, title: result.title }));

    try {
      const response = await fetch("/api/content/intro-montage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: selectedImages,
          clipUrl: clip.url,
          aspectRatio,
          topic: imageQuery,
          useNarration: Boolean(imageQuery.trim()),
        }),
      });
      const data = (await response.json()) as { url?: string; narration?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "홍보 숏폼 생성에 실패했습니다.");

      setPromoStates((current) => ({
        ...current,
        [clip.id]: { status: "success", url: data.url!, narration: data.narration },
      }));
    } catch (error) {
      setPromoStates((current) => ({
        ...current,
        [clip.id]: {
          status: "error",
          message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        },
      }));
    }
  }

  async function exportToCapcut(clip: ContentClipCandidate) {
    if (!capcutFolder.trim() || !clip.url) return;
    setCapcutExports((current) => ({ ...current, [clip.id]: { status: "loading" } }));

    try {
      const response = await fetch("/api/content/capcut-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftsFolder: capcutFolder,
          draftName: clip.title,
          clipUrl: clip.url,
          start: clip.startSec ?? 0,
          end: clip.endSec ?? 0,
          transcriptChunks,
        }),
      });
      const data = (await response.json()) as { draftName?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "CapCut 드래프트 생성에 실패했습니다.");

      setCapcutExports((current) => ({
        ...current,
        [clip.id]: { status: "success", draftName: data.draftName ?? clip.title },
      }));
    } catch (error) {
      setCapcutExports((current) => ({
        ...current,
        [clip.id]: {
          status: "error",
          message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        },
      }));
    }
  }

  useEffect(() => setHydrated(true), []);
  useEffect(() => setChannelLastSeen(localStorage.getItem(CHANNEL_LAST_SEEN_KEY) ?? ""), []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/youtube/status");
        const data = (await res.json()) as { connected?: boolean };
        setYoutubeConnected(Boolean(data.connected));
      } catch {
        setYoutubeConnected(false);
      }
    })();

    const params = new URLSearchParams(window.location.search);
    const youtubeParam = params.get("youtube");
    if (youtubeParam === "connected") {
      setYoutubeStatusMessage("유튜브 계정이 연결됐습니다.");
    } else if (youtubeParam === "denied") {
      setYoutubeStatusMessage("유튜브 연동 권한이 거부됐습니다.");
    } else if (youtubeParam === "error") {
      setYoutubeStatusMessage("유튜브 연동 중 오류가 발생했습니다.");
    }
    if (youtubeParam) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function publishToYoutube(clip: ContentClipCandidate) {
    if (!clip.url) return;
    const title = (youtubeTitles[clip.id] ?? clip.title).trim();
    if (!title) return;

    setPublishStates((current) => ({ ...current, [clip.id]: { status: "loading" } }));

    try {
      const response = await fetch("/api/content/publish-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipUrl: clip.url, title, privacyStatus: "private" }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "유튜브 업로드에 실패했습니다.");

      setPublishStates((current) => ({ ...current, [clip.id]: { status: "success", url: data.url! } }));
    } catch (error) {
      setPublishStates((current) => ({
        ...current,
        [clip.id]: {
          status: "error",
          message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        },
      }));
    }
  }

  function applyPipelineResult(data: ProcessApiResponse, jobPurpose: string) {
    const realClips: ContentClipCandidate[] = data.clips.map((clip) => ({
      id: `${data.jobId}-clip-${clip.index}`,
      title: data.plan
        ? `AI 기획 숏폼${data.contentType ? ` (${data.contentType})` : ""}`
        : `${formatTime(clip.start)} ~ ${formatTime(clip.end)} 구간`,
      label: data.plan ? "AI 기획 결과" : "AI 추출 결과",
      url: clip.url,
      startSec: clip.start,
      endSec: clip.end,
      score: clip.score,
      planSegments: data.plan,
    }));

    const id = onCreate({
      title: `${jobPurpose} 숏폼`,
      purpose: jobPurpose,
      channels,
      duration,
      tone: "",
      captionStyle: "",
      aspectRatio,
      step: "review",
      clipCandidates: realClips,
      transcript: data.transcript,
    });

    setJobId(id);
    setTranscript(data.transcript);
    setTranscriptChunks(data.transcriptChunks ?? []);
    setClips(realClips);
    setCapcutExports({});
    setPromoStates({});
  }

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    if (!purpose.trim() || !file) return;

    setStatus("processing");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("duration", String(duration));
      formData.append("aspectRatio", aspectRatio);
      formData.append("usePlanning", String(usePlanning));
      formData.append("purpose", purpose);
      formData.append("artistName", artistName);
      formData.append("trackInfo", trackInfo);
      formData.append("channelHandle", channelHandle);
      formData.append("layoutMode", layoutMode);
      formData.append("captionStyle", captionStyle);

      const response = await fetch("/api/content/process", { method: "POST", body: formData });
      const data = (await response.json()) as ProcessApiResponse;
      if (!response.ok) throw new Error(data.error ?? "처리에 실패했습니다.");

      applyPipelineResult(data, purpose);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    }
  }

  async function checkChannel(event: React.FormEvent) {
    event.preventDefault();
    if (!channelUrl.trim()) return;
    setChannelStatus("loading");
    setChannelError("");

    try {
      const response = await fetch(`/api/content/channel-videos?channelUrl=${encodeURIComponent(channelUrl)}`);
      const data = (await response.json()) as { videos?: ChannelVideo[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "채널 영상을 가져오지 못했습니다.");

      setChannelVideos(data.videos ?? []);
      setChannelStatus("idle");
    } catch (error) {
      setChannelStatus("error");
      setChannelError(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    }
  }

  const isProcessing = status === "processing";

  return (
    <div className="content-workflow">
      <header className="workflow-page-header">
        <h1>콘텐츠 제작</h1>
        <p>
          원본 영상을 올리면 하이라이트 구간을 찾아 세로형 숏폼 초안을 만듭니다. YouTube 채널 영상은 참고용으로만 확인할 수 있어요. 게시는 담당자가 승인한 뒤에만 진행돼요.
        </p>
      </header>

      {/* 1. CHANNEL AUTO-WATCH */}
      <section className="workflow-card">
        <header className="workflow-card-header">
          <h2>YouTube 채널에서 가져오기</h2>
          <p>
            채널 주소를 입력하면 최근 영상 목록을 불러옵니다. 영상을 골라 숏폼 초안을 만들 수 있어요.
          </p>
        </header>

        <form onSubmit={checkChannel} className="channel-watch-form">
          <div className="channel-watch-input-wrap">
            <input
              className="channel-watch-input"
              placeholder="예: https://www.youtube.com/@아티스트채널"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
            />
          </div>
          <button
            className="channel-watch-btn"
            disabled={!channelUrl.trim() || channelStatus === "loading"}
            type="submit"
          >
            {channelStatus === "loading" ? "확인 중..." : "새 영상 확인"}
          </button>
        </form>

        {channelStatus === "error" ? (
          <p className="field-error" role="alert" style={{ marginTop: "12px" }}>
            {channelError}
          </p>
        ) : null}

        {channelVideos.length > 0 ? (
          <div className="channel-video-grid">
            {channelVideos.map((video) => {
              const isNew = channelLastSeen ? new Date(video.publishedAt) > new Date(channelLastSeen) : false;
              return (
                <article key={video.videoId} className="channel-video-card">
                  <div className="channel-video-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={video.title}
                      src={video.thumbnailUrl}
                    />
                    {isNew ? (
                      <span className="channel-video-badge-new">새 영상</span>
                    ) : null}
                  </div>
                  <div className="channel-video-info">
                    <p className="channel-video-title">{video.title}</p>
                    <p className="channel-video-date">
                      {new Date(video.publishedAt).toLocaleDateString("ko-KR")}
                    </p>
                    <p className="channel-video-hint">원본 파일을 내려받아 아래 업로드 영역에 올려주세요.</p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* 2. OMNI-CHANNEL SHORT-FORM STUDIO */}
      <form onSubmit={generate} className="workflow-card">
        <header className="workflow-card-header">
          <h2>원본 영상으로 만들기</h2>
          <p>
            영상을 올리면 음성과 자막을 분석해 하이라이트 구간을 골라내고, 9:16 세로 화면과 자막 초안을 만듭니다.
          </p>
        </header>

        <div className="content-brief">
          <div className="workflow-field">
            <label htmlFor="promo-purpose" className="workflow-label">
              홍보 목적
            </label>
            <input
              id="promo-purpose"
              className="workflow-input"
              disabled={!hydrated || isProcessing}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="예: 신인 소개, 컴백 스포일러, 챌린지 홍보"
            />
          </div>

          <div className="workflow-field">
            <label htmlFor="source-video-file" className="workflow-label">
              원본 영상 파일
            </label>
            <div className="workflow-file-box">
              <input
                id="source-video-file"
                accept="video/mp4,video/webm,video/quicktime"
                disabled={!hydrated || isProcessing}
                ref={fileInputRef}
                type="file"
                className="workflow-file-input"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="file-selected-pill">
                  <span>{file.name}</span>
                </div>
              ) : null}
            </div>
          </div>

          <fieldset className="channel-pills-fieldset col-full">
            <legend className="channel-pills-legend">게시 채널</legend>
            <div className="channel-pills-wrap">
              {(["shorts", "reels", "tiktok"] as const).map((channel) => (
                <label key={channel} className={`channel-pill-label ${channels.includes(channel) ? "active" : ""}`}>
                  <input
                    checked={channels.includes(channel)}
                    disabled={isProcessing}
                    type="checkbox"
                    onChange={(e) =>
                      setChannels(
                        e.target.checked
                          ? [...channels, channel]
                          : channels.filter((item) => item !== channel)
                      )
                    }
                  />
                  <span>{({ shorts: "YouTube Shorts", reels: "Instagram Reels", tiktok: "TikTok" } as const)[channel]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="workflow-field">
            <label htmlFor="highlight-duration" className="workflow-label">
              하이라이트 구간 길이
            </label>
            <select
              id="highlight-duration"
              className="workflow-select"
              disabled={isProcessing}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) as 15 | 30 | 60)}
            >
              <option value="15">15초 (짧은 티저)</option>
              <option value="30">30초 (하이라이트)</option>
              <option value="60">60초 (스토리형)</option>
            </select>
          </div>

          <div className="workflow-field">
            <label htmlFor="aspect-ratio" className="workflow-label">
              화면 비율
            </label>
            <select
              id="aspect-ratio"
              className="workflow-select"
              disabled={isProcessing}
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}
            >
              <option value="9:16">9:16 (세로)</option>
              <option value="1:1">1:1 (정사각형)</option>
              <option value="16:9">16:9 (가로)</option>
            </select>
          </div>

          <div className="workflow-field">
            <label htmlFor="layout-mode" className="workflow-label">
              화면 레이아웃 모드 <span className="workflow-subtext">(9:16 변환 시)</span>
            </label>
            <select
              id="layout-mode"
              className="workflow-select"
              disabled={isProcessing}
              value={layoutMode}
              onChange={(e) => setLayoutMode(e.target.value as typeof layoutMode)}
            >
              <option value="blur">배경 흐림 (원본 화면 전체 유지)</option>
              <option value="crop">인물 중심 자르기 (세로 화면 채우기)</option>
            </select>
          </div>

          <div className="workflow-field">
            <label htmlFor="caption-style" className="workflow-label">
              자막 스타일 프리셋 <span className="workflow-subtext">(모바일 세이프존 자동 적용)</span>
            </label>
            <select
              id="caption-style"
              className="workflow-select"
              disabled={isProcessing}
              value={captionStyle}
              onChange={(e) => setCaptionStyle(e.target.value as typeof captionStyle)}
            >
              <option value="apple">미니멀 (흰 글자 · 옅은 그림자)</option>
              <option value="pill">캡슐 (반투명 어두운 상자)</option>
              <option value="viral">노랑 강조 (노란 글자 · 검은 외곽선)</option>
              <option value="classic">레트로 (주황 외곽선)</option>
            </select>
          </div>

          <div className="workflow-metadata-row">
            <div className="workflow-field">
              <label htmlFor="artist-name" className="workflow-label">
                아티스트명 <span className="workflow-subtext">(화면 좌상단 표시, 비우면 정보 오버레이 없음)</span>
              </label>
              <input
                id="artist-name"
                className="workflow-input"
                disabled={isProcessing}
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="예: W3WAY"
              />
            </div>

            <div className="workflow-field">
              <label htmlFor="track-info" className="workflow-label">
                곡/클립 정보 <span className="workflow-subtext">(좌상단 둘째 줄)</span>
              </label>
              <input
                id="track-info"
                className="workflow-input"
                disabled={isProcessing}
                value={trackInfo}
                onChange={(e) => setTrackInfo(e.target.value)}
                placeholder="예: ONE WAY FLIGHT"
              />
            </div>

            <div className="workflow-field">
              <label htmlFor="channel-handle" className="workflow-label">
                채널 핸들 <span className="workflow-subtext">(화면 우상단 표시, 선택)</span>
              </label>
              <input
                id="channel-handle"
                className="workflow-input"
                disabled={isProcessing}
                value={channelHandle}
                onChange={(e) => setChannelHandle(e.target.value)}
                placeholder="예: enter-ax"
              />
            </div>
          </div>

          <label className="ai-planning-banner">
            <div className="ai-planning-content">
              <span className="ai-planning-title">
                스토리 기획 모드
              </span>
              <span className="ai-planning-desc">
                단순 오디오 볼륨 대신, 대화와 대본 맥락을 분석하여 인트로→클라이맥스 구조의 완성형 숏폼을 기획합니다.
              </span>
            </div>
            <input
              checked={usePlanning}
              disabled={isProcessing}
              type="checkbox"
              style={{ width: "20px", height: "20px", accentColor: "var(--accent-blue)", cursor: "pointer" }}
              onChange={(e) => setUsePlanning(e.target.checked)}
            />
          </label>
        </div>

        {errorMessage ? (
          <p className="field-error" role="alert" style={{ marginTop: "16px" }}>
            {errorMessage}
          </p>
        ) : null}

        <div style={{ marginTop: "32px" }}>
          <button
            className="workflow-submit-btn"
            disabled={!hydrated || !purpose.trim() || !file || isProcessing}
            type="submit"
          >
            {isProcessing ? "영상 분석·렌더링 중입니다..." : "AI로 하이라이트 추출하기"}
          </button>
        </div>
      </form>

      {jobId ? (
        <section className="workflow-card content-results">
          <header className="results-header">
            <div>
              <StatusBadge tone="positive">초안 준비됨</StatusBadge>
              <h2>추출된 하이라이트 구간</h2>
            </div>
            <span style={{ fontSize: "0.85rem", color: "var(--accent-blue)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              발행 준비 완료 · 배포 대기
            </span>
          </header>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", background: "var(--bg-surface-2)", borderRadius: "14px", border: "1px solid var(--border-subtle)" }}>
            {youtubeConnected === false ? (
              <a className="button-outline" href="/api/auth/youtube/start" style={{ fontSize: "0.85rem", minHeight: "36px", padding: "6px 16px" }}>
                유튜브 계정 연결하기
              </a>
            ) : youtubeConnected === true ? (
              <StatusBadge tone="positive">YouTube 계정 연결됨</StatusBadge>
            ) : null}
            {youtubeStatusMessage ? (
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{youtubeStatusMessage}</span>
            ) : null}
          </div>

          {transcript ? (
            <article className="results-transcript-card">
              <h3>전체 음성 인식 스크립트</h3>
              <p className="results-transcript-text">{transcript}</p>
            </article>
          ) : null}

          <div className="workflow-field">
            <label htmlFor="capcut-folder-input" className="workflow-label">
              CapCut 드래프트 폴더 경로 <span className="workflow-subtext">(CapCut 앱 &gt; 설정 &gt; 草稿位置/Draft Location에서 확인)</span>
            </label>
            <input
              id="capcut-folder-input"
              className="workflow-input"
              placeholder="예: /Users/나/Movies/CapCut/User Data/Projects/com.lveditor.draft"
              value={capcutFolder}
              onChange={(e) => setCapcutFolder(e.target.value)}
            />
          </div>

          <article style={{ background: "var(--bg-surface-2)", padding: "22px", borderRadius: "16px", border: "1px solid var(--border-subtle)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
              비주얼 인트로 몽타주 제작
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "14px", lineHeight: 1.5 }}>
              공식 웹 이미지 검색과 프로페셔널 나레이션을 결합하여 숏폼 오프닝에 배치할 고감도 인트로 몽타주를 생성합니다.
            </p>
            <form onSubmit={searchImages} style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
              <input
                className="workflow-input"
                placeholder="예: WEWAY"
                style={{ flex: 1 }}
                value={imageQuery}
                onChange={(e) => setImageQuery(e.target.value)}
              />
              <button className="button-outline" disabled={!imageQuery.trim() || imageSearchStatus === "loading"} type="submit" style={{ minHeight: "48px" }}>
                {imageSearchStatus === "loading" ? "검색 중..." : "이미지 검색"}
              </button>
            </form>

            {imageSearchStatus === "error" ? (
              <p className="field-error" role="alert" style={{ marginBottom: "12px" }}>
                {imageSearchError}
              </p>
            ) : null}

            {imageResults.length > 0 ? (
              <>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "10px", fontWeight: 600 }}>
                  최대 6개까지 선택 가능 ({selectedImageUrls.length}/6 선택됨)
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px" }}>
                  {imageResults.map((result) => {
                    const selected = selectedImageUrls.includes(result.imageUrl);
                    return (
                      <button
                        key={result.imageUrl}
                        onClick={() => toggleImageSelection(result.imageUrl)}
                        style={{
                          padding: 0,
                          border: selected ? "3px solid var(--accent-blue)" : "1px solid var(--border-medium)",
                          borderRadius: "10px",
                          overflow: "hidden",
                          cursor: "pointer",
                          position: "relative",
                          background: "#ffffff",
                          boxShadow: selected ? "0 4px 12px rgba(0, 102, 255, 0.2)" : "var(--shadow-subtle)",
                          transition: "all 0.15s ease",
                        }}
                        type="button"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={result.title}
                          src={result.thumbnailUrl}
                          style={{ width: "100%", height: "96px", objectFit: "cover", display: "block" }}
                        />
                        <span
                          style={{
                            display: "block",
                            fontSize: "0.68rem",
                            padding: "4px 6px",
                            color: "#ffffff",
                            background: "rgba(17, 17, 24, 0.8)",
                            backdropFilter: "blur(4px)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            fontWeight: 600,
                          }}
                        >
                          {result.sourceDomain}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </article>

          <div className="clip-grid">
            {clips.map((clip) => {
              const exportState = capcutExports[clip.id] ?? { status: "idle" as const };
              const promoState = promoStates[clip.id] ?? { status: "idle" as const };
              const publishState = publishStates[clip.id] ?? { status: "idle" as const };
              return (
                <article aria-label="클립 후보" key={clip.id} className="clip-card">
                  {clip.url ? (
                    <video controls src={clip.url} style={{ width: "100%", borderRadius: "12px", background: "#000" }} />
                  ) : null}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <h3>{clip.title}</h3>
                    <StatusBadge tone="info">{clip.label}</StatusBadge>
                  </div>
                  {clip.planSegments ? (
                    <ul style={{ listStyle: "none", padding: 0, margin: "0", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {clip.planSegments.map((segment, index) => (
                        <li key={`${segment.role}-${index}`} style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                          <StatusBadge tone="neutral">{segment.role}</StatusBadge>{" "}
                          {formatTime(segment.start)} ~ {formatTime(segment.end)} · {segment.caption}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
                      에너지 점수 {clip.score?.toFixed(3)}
                    </p>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)" }}>
                    <div>
                      <button
                        className="button-outline"
                        disabled={!capcutFolder.trim() || exportState.status === "loading"}
                        onClick={() => exportToCapcut(clip)}
                        style={{ width: "100%", fontSize: "0.85rem", minHeight: "38px" }}
                        type="button"
                      >
                        {exportState.status === "loading" ? "CapCut 드래프트 생성 중..." : "CapCut으로 내보내기"}
                      </button>
                      {exportState.status === "success" ? (
                        <p style={{ fontSize: "0.8rem", color: "var(--accent-blue)", marginTop: "6px", fontWeight: 600 }}>
                          &ldquo;{exportState.draftName}&rdquo; 드래프트 생성 완료. CapCut 앱을 열어 프로젝트 목록에서 확인 후 직접 내보내기 해주세요.
                        </p>
                      ) : null}
                      {exportState.status === "error" ? (
                        <p className="field-error" role="alert" style={{ marginTop: "6px" }}>
                          {exportState.message}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <button
                        className="button-outline"
                        disabled={selectedImageUrls.length === 0 || promoState.status === "loading"}
                        onClick={() => createPromoShort(clip)}
                        style={{ width: "100%", fontSize: "0.85rem", minHeight: "38px" }}
                        type="button"
                      >
                        {promoState.status === "loading" ? "홍보 숏츠 만드는 중..." : "선택한 이미지로 홍보 숏츠 만들기"}
                      </button>
                      {promoState.status === "success" ? (
                        <div style={{ marginTop: "10px" }}>
                          <video controls src={promoState.url} style={{ width: "100%", borderRadius: "10px", background: "#000" }} />
                          <p style={{ fontSize: "0.8rem", color: "var(--accent-blue)", marginTop: "6px", fontWeight: 600 }}>
                            이미지 인트로 + 하이라이트가 합쳐진 홍보 숏츠가 생성됐습니다.
                          </p>
                          {promoState.narration ? (
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                              AI 나레이션: &ldquo;{promoState.narration}&rdquo;
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      {promoState.status === "error" ? (
                        <p className="field-error" role="alert" style={{ marginTop: "6px" }}>
                          {promoState.message}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                        유튜브 업로드 제목
                        <input
                          className="workflow-input"
                          disabled={publishState.status === "loading"}
                          style={{ height: "40px", fontSize: "0.85rem", marginTop: "4px" }}
                          value={youtubeTitles[clip.id] ?? clip.title}
                          onChange={(e) => setYoutubeTitles((current) => ({ ...current, [clip.id]: e.target.value }))}
                        />
                      </label>
                      <button
                        className="button-solid"
                        disabled={!youtubeConnected || publishState.status === "loading"}
                        onClick={() => publishToYoutube(clip)}
                        style={{ width: "100%", fontSize: "0.85rem", minHeight: "38px" }}
                        type="button"
                      >
                        {publishState.status === "loading" ? "유튜브 업로드 중..." : "유튜브에 비공개로 게시하기"}
                      </button>
                      {publishState.status === "success" ? (
                        <p style={{ fontSize: "0.8rem", color: "var(--accent-blue)", marginTop: "6px", fontWeight: 600 }}>
                          업로드 완료 (비공개):{" "}
                          <a href={publishState.url} rel="noreferrer" target="_blank" style={{ textDecoration: "underline" }}>
                            {publishState.url}
                          </a>
                        </p>
                      ) : null}
                      {publishState.status === "error" ? (
                        <p className="field-error" role="alert" style={{ marginTop: "6px" }}>
                          {publishState.message}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="content-approval">
            <button
              className="button-outline"
              onClick={() => onTransition(jobId, "request-changes", "담당자 수정 요청")}
              type="button"
            >
              수정 요청
            </button>
            <button
              className="button-solid"
              onClick={() => onTransition(jobId, "approve")}
              type="button"
            >
              승인
            </button>
            <button
              className="button-outline"
              onClick={() => onTransition(jobId, "schedule")}
              type="button"
            >
              예약 배포 데모 완료
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
