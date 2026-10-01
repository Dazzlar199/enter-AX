"use client";

import { useEffect, useRef, useState } from "react";

import { createObjectPreview } from "@/features/talent/media";
import { parseYouTubeVideoId } from "@/lib/youtube";
import type { MediaDraft } from "@/types/domain";

export function MediaInput({ kind, value, onChange }: { kind: "보컬" | "댄스"; value: MediaDraft; onChange: (media: MediaDraft) => void }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const activePreview = useRef<{ revoke(): void } | null>(null);
  const id = kind === "보컬" ? "vocal" : "dance";

  useEffect(() => () => activePreview.current?.revoke(), []);

  function selectFile(file?: File) {
    activePreview.current?.revoke();
    if (!file) return;
    if (!["video/mp4", "video/webm"].includes(file.type)) {
      setError("MP4 또는 WebM 영상 파일을 선택해 주세요.");
      return;
    }
    const preview = createObjectPreview(file);
    activePreview.current = preview;
    setPreviewUrl(preview.url);
    setError("");
    onChange({ source: "file", value: file.name });
  }

  const youtubeId = value.source === "youtube" ? parseYouTubeVideoId(value.value) : null;

  return (
    <fieldset className="media-input">
      <legend>{kind} 자료</legend>
      <div className="media-source-options">
        <label><input checked={value.source === "file"} name={`${id}-source`} onChange={() => onChange({ source: "file", value: "" })} type="radio" value="file" /> {kind} 파일</label>
        <label><input checked={value.source === "youtube"} name={`${id}-source`} onChange={() => onChange({ source: "youtube", value: "" })} type="radio" value="youtube" /> {kind} YouTube</label>
      </div>
      {value.source === "file" ? (
        <div key="file-source">
          <label htmlFor={`${id}-file`}>{kind} 영상 파일</label>
          <input id={`${id}-file`} accept="video/mp4,video/webm" type="file" onChange={(event) => selectFile(event.target.files?.[0])} />
          {previewUrl ? <video controls src={previewUrl}><track kind="captions" /></video> : null}
        </div>
      ) : (
        <div key="youtube-source">
          <label htmlFor={`${id}-youtube`}>{kind} YouTube 주소</label>
          <input
            id={`${id}-youtube`}
            type="url"
            value={value.value ?? ""}
            onChange={(event) => onChange({ source: "youtube", value: event.target.value })}
            onBlur={() => setError(value.value && !parseYouTubeVideoId(value.value) ? "YouTube 주소를 확인해 주세요." : "")}
          />
          {youtubeId ? <iframe allowFullScreen src={`https://www.youtube.com/embed/${youtubeId}`} title={`${kind} YouTube 재생`} /> : null}
        </div>
      )}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      <p className="field-help">원본 파일(MP4, WebM)은 기획사가 춤·음정 비교에 쓸 수 있어요. YouTube는 재생 전용이라 비교 분석에는 쓰이지 않아요.</p>
    </fieldset>
  );
}
