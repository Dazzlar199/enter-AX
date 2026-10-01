# Remove yt-dlp YouTube Download Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the only code path that downloads YouTube video files (`yt-dlp`), replacing the "채널 영상으로 숏폼 만들기" auto-download flow with a manual-download-then-upload guidance, so the app's behavior matches what the README already claims ("YouTube는 공식 임베드 재생 전용이며 다운로드·캐시·분리 분석하지 않습니다") and closes risk **R1** from `docs/ax-product-plan-2026-09-24.md` (YouTube ToS/API policy violation exposure).

**Architecture:** No architecture change. This is a deletion: one server function (`downloadYoutubeVideo`), one API route (`/api/content/from-youtube`), and the client code path that calls them. The channel-video *listing* (`fetchChannelVideos`/`resolveChannelId`, which only reads the public RSS feed and channel page — no video file is ever fetched) stays, now explicitly "reference only" per the product plan's M9 decision.

**Tech Stack:** Next.js 15 App Router route handlers, React 19 client component (`ContentWorkflow.tsx`), Vitest + Testing Library.

## Global Constraints

- Do not change the existing `/api/content/process` (direct file upload) pipeline — it is the replacement path and must keep working unmodified.
- Do not touch `fetchChannelVideos` / `resolveChannelId` in `src/lib/media/youtube.ts` — they never download video content (RSS feed + HTML page fetch only) and are explicitly kept per the product plan ("'채널 영상 목록'은 참고용으로만 두고, 원본 파일을 업로드하도록 안내한다").
- All copy is Korean, matching the existing UI voice in `ContentWorkflow.tsx`.
- `npm run check` (typecheck + lint + test + build) must pass with zero new errors when this plan is done.

---

### Task 1: Replace the auto-download button with upload guidance, then delete the download code

**Files:**
- Modify: `src/components/agency/ContentWorkflow.tsx:66-68` (delete `VideoProcessingState` type)
- Modify: `src/components/agency/ContentWorkflow.tsx:125` (delete `videoProcessing` state)
- Modify: `src/components/agency/ContentWorkflow.tsx:377-421` (delete `createFromChannelVideo`)
- Modify: `src/components/agency/ContentWorkflow.tsx:427-431` (update header copy)
- Modify: `src/components/agency/ContentWorkflow.tsx:471-500` (replace action button with hint text)
- Modify: `src/app/globals.css:1962-1978` (replace `.channel-video-action-btn` rules with `.channel-video-hint`)
- Delete: `src/app/api/content/from-youtube/route.ts`
- Modify: `src/lib/media/youtube.ts:1-19,95-115` (delete `findYtDlpBinary`, `downloadYoutubeVideo`, and now-unused imports)
- Test: `src/components/agency/ContentWorkflow.test.tsx`

**Interfaces:**
- Consumes: existing `checkChannel()` handler (unchanged) which populates `channelVideos: ChannelVideo[]` from `GET /api/content/channel-videos`.
- Produces: nothing new is exported. This task only removes exports (`downloadYoutubeVideo`) and a route. No other task in this plan depends on it.

- [ ] **Step 1: Write the failing test**

Add this test to `src/components/agency/ContentWorkflow.test.tsx` (after the existing `"allows configuring ambient blur layout mode and subtitle presets"` test, same file, same imports already present):

```tsx
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/agency/ContentWorkflow.test.tsx -t "guides the user to upload"`
Expected: FAIL — the current implementation renders a button named `"이 영상으로 숏폼 만들기"` and no text matching `/원본 파일을 내려받아/`, so both `queryByRole(...).not.toBeInTheDocument()` and `getByText(/원본 파일을 내려받아/)` fail (the latter throws because the text isn't found).

- [ ] **Step 3: Delete the client-side auto-download path**

In `src/components/agency/ContentWorkflow.tsx`, delete the `VideoProcessingState` type (lines 66-68):

```tsx
type VideoProcessingState =
  | { status: "loading" }
  | { status: "error"; message: string };
```

Delete the `videoProcessing` state declaration (line 125):

```tsx
  const [videoProcessing, setVideoProcessing] = useState<Record<string, VideoProcessingState>>({});
```

Delete the whole `createFromChannelVideo` function (lines 377-421):

```tsx
  async function createFromChannelVideo(video: ChannelVideo) {
    setVideoProcessing((current) => ({ ...current, [video.videoId]: { status: "loading" } }));

    try {
      const response = await fetch("/api/content/from-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.videoId,
          videoTitle: video.title,
          duration: String(duration),
          aspectRatio,
          usePlanning,
          artistName,
          trackInfo,
          channelHandle,
          layoutMode,
          captionStyle,
        }),
      });
      const data = (await response.json()) as ProcessApiResponse;
      if (!response.ok) throw new Error(data.error ?? "처리에 실패했습니다.");

      applyPipelineResult(data, video.title);
      setVideoProcessing((current) => {
        const next = { ...current };
        delete next[video.videoId];
        return next;
      });

      const newest = channelVideos[0]?.publishedAt;
      if (newest) {
        localStorage.setItem(CHANNEL_LAST_SEEN_KEY, newest);
        setChannelLastSeen(newest);
      }
    } catch (error) {
      setVideoProcessing((current) => ({
        ...current,
        [video.videoId]: {
          status: "error",
          message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        },
      }));
    }
  }
```

Update the page header copy (lines 427-431) from:

```tsx
        <p>
          원본 영상이나 공식 YouTube 채널 영상에서 하이라이트 구간을 찾아 세로형 숏폼 초안을 만듭니다. 게시는 담당자가 승인한 뒤에만 진행돼요.
        </p>
```

to:

```tsx
        <p>
          원본 영상을 올리면 하이라이트 구간을 찾아 세로형 숏폼 초안을 만듭니다. YouTube 채널 영상은 참고용으로만 확인할 수 있어요. 게시는 담당자가 승인한 뒤에만 진행돼요.
        </p>
```

Replace the per-card action button block (lines ~486-499, inside the `channelVideos.map(...)` render):

```tsx
                    <button
                      className="channel-video-action-btn"
                      disabled={processing?.status === "loading"}
                      onClick={() => createFromChannelVideo(video)}
                      type="button"
                    >
                      {processing?.status === "loading" ? "처리 중..." : "이 영상으로 숏폼 만들기"}
                    </button>
                    {processing?.status === "error" ? (
                      <p className="field-error" role="alert" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                        {processing.message}
                      </p>
                    ) : null}
```

with:

```tsx
                    <p className="channel-video-hint">원본 파일을 내려받아 아래 업로드 영역에 올려주세요.</p>
```

Remove the now-unused `processing` lookup line just above it in the same map callback:

```tsx
              const processing = videoProcessing[video.videoId];
```

(delete this line entirely — nothing else in the callback references `processing` after the button block is replaced).

- [ ] **Step 4: Update the stylesheet**

In `src/app/globals.css`, replace lines 1962-1978:

```css
.channel-video-action-btn {
  margin-top: auto;
  width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  background: #111118;
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.channel-video-action-btn:hover:not(:disabled) {
  background: #252530;
}
```

with:

```css
.channel-video-hint {
  margin-top: auto;
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/agency/ContentWorkflow.test.tsx`
Expected: all tests in the file PASS, including the new one.

- [ ] **Step 6: Delete the server-side download route**

Delete the file: `src/app/api/content/from-youtube/route.ts` (entire file — nothing else imports from it; confirmed via `grep -rn "from-youtube" src` returning only this route and the client fetch call removed in Step 3).

- [ ] **Step 7: Delete the yt-dlp download function from the media library**

In `src/lib/media/youtube.ts`, delete the `findYtDlpBinary` function (lines 10-19):

```ts
async function findYtDlpBinary(): Promise<string> {
  const venvBin =
    process.env.YTDLP_BIN ?? path.resolve(process.cwd(), [".venv", "capcut"].join("-"), "bin", "yt-dlp");
  try {
    await access(venvBin);
    return venvBin;
  } catch {
    return "yt-dlp";
  }
}
```

Delete the `downloadYoutubeVideo` function (lines 95-115, the rest of the file):

```ts
/** Downloads a single YouTube video (<=1080p mp4) to outputPath via yt-dlp. */
export async function downloadYoutubeVideo(videoId: string, outputPath: string): Promise<void> {
  const ytDlp = await findYtDlpBinary();
  const args = [
    "-f",
    "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best",
    "--merge-output-format",
    "mp4",
  ];
  if (ffmpegPath) {
    args.push("--ffmpeg-location", ffmpegPath);
  }
  args.push("-o", outputPath, `https://www.youtube.com/watch?v=${videoId}`);

  try {
    await execFileAsync(ytDlp, args, { maxBuffer: 1024 * 1024 * 64, timeout: 240000 });
  } catch (error) {
    throw new Error(`영상 다운로드에 실패했습니다. (${error instanceof Error ? error.message : "알 수 없는 오류"})`);
  }
}
```

Remove the imports that only existed for those two functions, at the top of the same file:

```ts
import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);
```

The file should now start directly with:

```ts
export interface ChannelVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
}
```

(`resolveChannelId`, `extractTagValue`, `decodeXmlEntities`, and `fetchChannelVideos` all stay unchanged below it.)

- [ ] **Step 8: Run the full quality gate**

Run: `npm run typecheck && npm run lint && npm test`
Expected: typecheck clean (confirms nothing else imports `downloadYoutubeVideo`, `findYtDlpBinary`, or the deleted route — `grep -rn "downloadYoutubeVideo\|findYtDlpBinary\|from-youtube" src` should return zero results before this step; re-run that grep if typecheck fails and it names a leftover reference), lint 0 errors, full test suite green (110+ tests, same skip count as before for the 3 Postgres integration files).

- [ ] **Step 9: Commit**

```bash
git add src/components/agency/ContentWorkflow.tsx src/components/agency/ContentWorkflow.test.tsx src/app/globals.css src/lib/media/youtube.ts
git rm src/app/api/content/from-youtube/route.ts
git commit -m "fix: remove yt-dlp YouTube download path (R1 compliance)"
```

---

## Self-Review Notes

- **Spec coverage:** This plan implements exactly risk R1 from `docs/ax-product-plan-2026-09-24.md` §9 ("바로 결정할 것 #1") and the M9 decision ("'채널 영상 목록'은 참고용으로만 두고, 원본 파일을 업로드하도록 안내한다"). It does not touch M9's other items (YouTube publish quota copy, Instagram/TikTok) — those are out of scope for this plan and belong to the content-publishing phase in the master roadmap.
- **No other callers:** confirmed via `grep -rln "yt-dlp\|ytdlp\|downloadYoutubeVideo\|createFromChannelVideo\|from-youtube"` across the repo (excluding `.agents/` vendor skill and this plan/product-plan doc) — only the three files this plan touches reference it.
- **Test placement:** the new test follows the exact `vi.stubGlobal("fetch", ...)` + Testing Library pattern already used by the three other tests in `ContentWorkflow.test.tsx`, so no new test infrastructure is introduced.
