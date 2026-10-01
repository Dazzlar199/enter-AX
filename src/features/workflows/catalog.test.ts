import { afterEach, describe, expect, it, vi } from "vitest";

import {
  deleteCustomNode,
  getAllNodeDefinitions,
  getCustomNodes,
  getNodeDefinition,
  missingParams,
  nodeCatalog,
  saveCustomNode,
  type NodeDefinition,
} from "./catalog";
import { createExecutor, type WorkflowAppContext } from "./executor";
import type { WorkflowNode } from "./types";

describe("Workflow Node Catalog", () => {
  it("includes all essential entertainment and brand integration nodes", () => {
    const types = nodeCatalog.map((node) => node.type);
    expect(types).toContain("trigger.manual");
    expect(types).toContain("trigger.googleforms");
    expect(types).toContain("kakaotalk.alimtalk");
    expect(types).toContain("gmail.send");
    expect(types).toContain("notion.sync");
    expect(types).toContain("sheets.append");
    expect(types).toContain("gdrive.upload");
    expect(types).toContain("youtube.upload");
    expect(types).toContain("instagram.post");
    expect(types).toContain("tiktok.upload");
    expect(types).toContain("openai.analyze");
    expect(types).toContain("ai.dance_pose");
    expect(types).toContain("media.ffmpeg_cut");
    expect(types).toContain("ar.duplicate_audio");
    expect(types).toContain("audition.score_filter");
    expect(types).toContain("calendar.schedule");
  });

  it("assigns genuine logo icons to integration nodes", () => {
    const kakao = getNodeDefinition("kakaotalk.alimtalk");
    expect(kakao.icon).toHaveProperty("logo", "/logos/kakaotalk-color.svg");

    const notion = getNodeDefinition("notion.sync");
    expect(notion.icon).toHaveProperty("logo", "/logos/notion-color.svg");

    const sheets = getNodeDefinition("sheets.append");
    expect(sheets.icon).toHaveProperty("logo", "/logos/sheets-color.svg");

    const mediapipe = getNodeDefinition("ai.dance_pose");
    expect(mediapipe.icon).toHaveProperty("logo", "/logos/mediapipe.svg");

    const ffmpeg = getNodeDefinition("media.ffmpeg_cut");
    expect(ffmpeg.icon).toHaveProperty("logo", "/logos/ffmpeg.svg");
  });

  it("checks missing required parameters accurately", () => {
    const missing = missingParams("kakaotalk.alimtalk", { phoneField: "", message: "" });
    expect(missing).toContain("수신자 전화번호 항목");
    expect(missing).toContain("메시지 내용");

    const filled = missingParams("kakaotalk.alimtalk", { phoneField: "연락처", message: "합격 안내" });
    expect(filled).toHaveLength(0);
  });

  it("shows plain-language step names and keeps automatic selection out of the palette", () => {
    expect(getNodeDefinition("media.ffmpeg_cut").label).toBe("세로 영상 만들기");
    expect(getNodeDefinition("ai.dance_pose").label).toBe("안무 동작 비교");
    expect(getNodeDefinition("human.approval").label).toBe("담당자 확인");
    expect(getAllNodeDefinitions().map((node) => node.type)).not.toContain("audition.score_filter");
  });

  it("identifies simulated integrations so the interface cannot present them as live", () => {
    expect(getNodeDefinition("kakaotalk.alimtalk").execution).toBe("demo");
    expect(getNodeDefinition("youtube.upload").execution).toBe("demo");
    expect(getNodeDefinition("http.request").execution).toBe("live");
  });

  it("supports creating, retrieving, and deleting custom nodes (Custom Node Builder)", () => {
    const customType = `custom.chzzk_live_${Date.now()}`;
    const customDef: NodeDefinition = {
      type: customType,
      label: "치지직 생방송 알림",
      description: "치지직 라이브 온에어 웹훅 발송",
      category: "integration",
      icon: { logo: "/logos/python.svg" },
      runtime: "client",
      params: [
        { key: "channelId", label: "채널 ID", kind: "text", required: true },
        { key: "title", label: "방송 제목", kind: "text" },
      ],
      defaults: { channelId: "chzzk-1234", title: "신곡 쇼케이스" },
      isCustom: true,
    };

    saveCustomNode(customDef);
    const customList = getCustomNodes();
    expect(customList.some((n) => n.type === customType)).toBe(true);

    const fetched = getNodeDefinition(customType);
    expect(fetched.label).toBe("치지직 생방송 알림");
    expect(fetched.isCustom).toBe(true);

    const all = getAllNodeDefinitions();
    expect(all.some((n) => n.type === customType)).toBe(true);

    deleteCustomNode(customType);
    const afterDelete = getCustomNodes();
    expect(afterDelete.some((n) => n.type === customType)).toBe(false);
  });
});

describe("Workflow Executor with Domain Nodes", () => {
  afterEach(() => vi.unstubAllGlobals());
  const mockApp: WorkflowAppContext = {
    talents: [
      {
        id: "tal-1",
        stageName: "민지",
        fields: ["vocal", "dance"],
        region: "서울",
        ageBand: "teen",
        bio: "메인보컬 지망생",
        openToOffers: true,
        createdAt: "2026-03-01T00:00:00Z",
      },
    ],
    moveTalentToReview: () => "cand-123",
    createCommunityPost: () => "post-123",
  };

  const executor = createExecutor(mockApp);

  it("executes MediaPipe dance analysis node", async () => {
    const node: WorkflowNode = {
      id: "dance-1",
      type: "ai.dance_pose",
      name: "안무 분석",
      position: { x: 0, y: 0 },
      params: { referenceChoreo: "hype_boy", passThreshold: "85" },
    };
    const result = await executor(node, [{ id: "tal-1", 활동명: "민지" }]);
    expect(result[0]).toHaveProperty("demo", true);
    expect(result[0]).toHaveProperty("danceAnalyzed", false);
    expect(result[0]).toHaveProperty("안무싱크율");
  });

  it("executes KakaoTalk Alimtalk node", async () => {
    const node: WorkflowNode = {
      id: "kakao-1",
      type: "kakaotalk.alimtalk",
      name: "알림톡 발송",
      position: { x: 0, y: 0 },
      params: { templateCode: "AUDITION_PASS", phoneField: "연락처", message: "{{활동명}}님 합격" },
    };
    const result = await executor(node, [{ id: "tal-1", 활동명: "민지", 연락처: "010-1234-5678" }]);
    expect(result[0]).toHaveProperty("demo", true);
    expect(result[0]).toHaveProperty("발송상태", "데모 결과 · 실제로 발송되지 않음");
  });

  it("never presents a simulated channel post as a completed upload", async () => {
    const node: WorkflowNode = {
      id: "youtube-1",
      type: "youtube.upload",
      name: "YouTube 게시 준비",
      position: { x: 0, y: 0 },
      params: { title: "검토 영상", privacy: "unlisted" },
    };

    const result = await executor(node, [{ id: "tal-1", 활동명: "민지" }]);

    expect(result[0]).toHaveProperty("demo", true);
    expect(result[0]).toHaveProperty("youtubeUploaded", false);
    expect(result[0]).toHaveProperty("유튜브상태", "데모 결과 · 실제로 업로드되지 않음");
  });

  it("labels the unavailable document-review fallback as demo guidance, not a pass decision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const node: WorkflowNode = {
      id: "review-1",
      type: "openai.analyze",
      name: "지원 자료 정리",
      position: { x: 0, y: 0 },
      params: { model: "gpt-4o", evaluationCriteria: "보컬 자료 정리" },
    };

    const result = await executor(node, [{ id: "tal-1", 활동명: "민지" }]);

    expect(result[0]).toHaveProperty("demo", true);
    expect(result[0]).not.toHaveProperty("aiRecommendation");
    expect(JSON.stringify(result[0])).not.toMatch(/합격|불합격/);
  });

  it("executes custom user-defined node seamlessly", async () => {
    const node: WorkflowNode = {
      id: "custom-1",
      type: "custom.my_partner_api",
      name: "사내 ERP 전송",
      position: { x: 0, y: 0 },
      params: { partnerId: "agency_001" },
    };
    const result = await executor(node, [{ id: "tal-1", 활동명: "민지" }]);
    expect(result[0]).toHaveProperty("demo", true);
    expect(result[0]).toHaveProperty("customExecuted", false);
    expect(result[0]).toHaveProperty("customNodeType", "custom.my_partner_api");
  });
});
