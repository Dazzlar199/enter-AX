"""
Generates a CapCut draft project from an already-rendered shortform clip plus
its caption timeline, using the open-source pyCapCut library
(https://github.com/GuanYixuan/pyCapCut).

This does NOT call any CapCut/ByteDance service. It only writes a local
draft folder that the CapCut desktop app can open, so the user can apply
CapCut's own caption animations/transitions/effects and export from there.

Input: a single JSON object on stdin, shaped like:
{
  "draftsFolder": "/Users/you/Movies/CapCut/User Data/Projects/com.lveditor.draft",
  "draftName": "enter-ax-clip-1",
  "videoPath": "/absolute/path/to/clip-1.mp4",
  "durationSec": 15.0,
  "width": 1080,
  "height": 1920,
  "captions": [{"start": 0.0, "end": 2.1, "text": "..."}]
}

Output: a single JSON object on stdout: {"success": true, "draftName": ...}
or {"success": false, "error": "..."}
"""

import json
import sys


def main() -> None:
    payload = json.load(sys.stdin)

    try:
        import pycapcut as cc
    except ImportError as exc:
        print(json.dumps({"success": False, "error": f"pycapcut import failed: {exc}"}))
        return

    drafts_folder = payload["draftsFolder"]
    draft_name = payload["draftName"]
    video_path = payload["videoPath"]
    duration_sec = float(payload["durationSec"])
    width = int(payload.get("width", 1080))
    height = int(payload.get("height", 1920))
    captions = payload.get("captions", [])

    try:
        folder = cc.DraftFolder(drafts_folder)
        script = folder.create_draft(draft_name, width, height, allow_replace=True)

        script.add_track(cc.TrackType.video)
        video_segment = cc.VideoSegment(video_path, cc.trange(0, duration_sec))
        script.add_segment(video_segment, "video")

        if captions:
            script.add_track(cc.TrackType.text)
            for caption in captions:
                start = max(0.0, float(caption["start"]))
                end = max(start, float(caption["end"]))
                text = str(caption["text"]).strip()
                if not text or end - start <= 0:
                    continue
                text_segment = cc.TextSegment(
                    text,
                    cc.trange(start, end - start),
                    style=cc.TextStyle(size=6.0, bold=True, color=(1.0, 1.0, 1.0), align=1),
                    border=cc.TextBorder(color=(0.0, 0.0, 0.0), width=30.0),
                )
                script.add_segment(text_segment, "text")

        script.save()
        print(json.dumps({"success": True, "draftName": draft_name, "draftsFolder": drafts_folder}))
    except Exception as exc:  # noqa: BLE001 - surface any failure back to Node as JSON
        print(json.dumps({"success": False, "error": str(exc)}))


if __name__ == "__main__":
    main()
