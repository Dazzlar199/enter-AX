import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ContentWorkflow } from "./ContentWorkflow";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jobId: "content-job-test",
          transcript: "테스트 스크립트입니다.",
          clips: [
            { index: 1, start: 4, end: 19, score: 0.12, url: "/generated/content-job-test/clip-1.mp4" },
            { index: 2, start: 30, end: 45, score: 0.08, url: "/generated/content-job-test/clip-2.mp4" },
          ],
        }),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("uploads a video and renders real AI-extracted highlight clips", async () => {
  const user = userEvent.setup();
  const onCreate = vi.fn().mockReturnValue("content-job-test");
  render(<ContentWorkflow onCreate={onCreate} onTransition={vi.fn()} />);

  const submit = screen.getByRole("button", { name: "AI로 하이라이트 추출하기" });
  expect(submit).toBeDisabled();

  await user.type(screen.getByLabelText("홍보 목적"), "신인 소개");
  expect(submit).toBeDisabled();

  const file = new File(["fake video bytes"], "practice.mp4", { type: "video/mp4" });
  await user.upload(screen.getByLabelText("원본 영상 파일"), file);
  expect(submit).toBeEnabled();

  await user.click(submit);

  await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
  expect(onCreate.mock.calls[0][0]).toMatchObject({
    purpose: "신인 소개",
    transcript: "테스트 스크립트입니다.",
  });

  expect(await screen.findAllByRole("article", { name: "클립 후보" })).toHaveLength(2);
  expect(screen.getAllByText("AI 추출 결과")).toHaveLength(2);
  expect(screen.getByText("테스트 스크립트입니다.")).toBeInTheDocument();

  const videos = document.querySelectorAll("video");
  expect(videos).toHaveLength(2);
  expect(videos[0]).toHaveAttribute("src", "/generated/content-job-test/clip-1.mp4");

  expect(screen.getByRole("button", { name: "승인" })).toBeEnabled();
});

it("exports a highlighted clip as a CapCut draft", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (url === "/api/content/process") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              jobId: "content-job-test",
              transcript: "테스트 스크립트입니다.",
              transcriptChunks: [{ start: 4, end: 19, text: "테스트 스크립트입니다." }],
              clips: [{ index: 1, start: 4, end: 19, score: 0.12, url: "/generated/content-job-test/clip-1.mp4" }],
            }),
        });
      }
      if (url === "/api/content/capcut-draft") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ draftName: "4:00 ~ 19:00 구간" }) });
      }
      if (url === "/api/auth/youtube/status") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ connected: false }) });
      }
      throw new Error(`unexpected fetch to ${url}`);
    }),
  );

  const user = userEvent.setup();
  render(<ContentWorkflow onCreate={vi.fn().mockReturnValue("content-job-test")} onTransition={vi.fn()} />);

  await user.type(screen.getByLabelText("홍보 목적"), "신인 소개");
  await user.upload(screen.getByLabelText("원본 영상 파일"), new File(["fake"], "practice.mp4", { type: "video/mp4" }));
  await user.click(screen.getByRole("button", { name: "AI로 하이라이트 추출하기" }));
  await screen.findAllByRole("article", { name: "클립 후보" });

  const exportButton = screen.getByRole("button", { name: "CapCut으로 내보내기" });
  expect(exportButton).toBeDisabled();

  await user.type(screen.getByLabelText(/CapCut 드래프트 폴더 경로/), "/tmp/CapCut Drafts");
  expect(exportButton).toBeEnabled();

  await user.click(exportButton);

  expect(await screen.findByText(/드래프트 생성 완료/)).toBeInTheDocument();
});

it("shows an error message when the pipeline call fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "MP4, WebM, MOV 영상 파일만 지원합니다." }),
    }),
  );

  const user = userEvent.setup();
  render(<ContentWorkflow onCreate={vi.fn()} onTransition={vi.fn()} />);

  await user.type(screen.getByLabelText("홍보 목적"), "신인 소개");
  const file = new File(["fake"], "practice.mp4", { type: "video/mp4" });
  await user.upload(screen.getByLabelText("원본 영상 파일"), file);
  await user.click(screen.getByRole("button", { name: "AI로 하이라이트 추출하기" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("MP4, WebM, MOV 영상 파일만 지원합니다.");
});

it("allows configuring ambient blur layout mode and subtitle presets", async () => {
  const user = userEvent.setup();
  render(<ContentWorkflow onCreate={vi.fn()} onTransition={vi.fn()} />);

  const layoutSelect = screen.getByLabelText(/화면 레이아웃 모드/);
  expect(layoutSelect).toHaveValue("blur");
  await user.selectOptions(layoutSelect, "crop");
  expect(layoutSelect).toHaveValue("crop");

  const captionSelect = screen.getByLabelText(/자막 스타일 프리셋/);
  expect(captionSelect).toHaveValue("apple");
  await user.selectOptions(captionSelect, "viral");
  expect(captionSelect).toHaveValue("viral");
});

it("guides the user to upload the original file instead of auto-downloading a channel video", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.startsWith("/api/content/channel-videos")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              channelId: "UCtest0000000000000",
              videos: [
                {
                  videoId: "abcdefghijk",
                  title: "연습실 안무 영상",
                  publishedAt: "2026-09-01T00:00:00Z",
                  thumbnailUrl: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
                },
              ],
            }),
        });
      }
      throw new Error(`unexpected fetch to ${url}`);
    }),
  );

  const user = userEvent.setup();
  render(<ContentWorkflow onCreate={vi.fn()} onTransition={vi.fn()} />);

  await user.type(
    screen.getByPlaceholderText("예: https://www.youtube.com/@아티스트채널"),
    "https://www.youtube.com/@artist",
  );
  await user.click(screen.getByRole("button", { name: "새 영상 확인" }));

  expect(await screen.findByText("연습실 안무 영상")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "이 영상으로 숏폼 만들기" })).not.toBeInTheDocument();
  expect(screen.getByText(/원본 파일을 내려받아/)).toBeInTheDocument();
});
