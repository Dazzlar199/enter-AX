import { describe, expect, it } from "vitest";
import { generateWorkflowFromPrompt } from "./generator";

describe("Workflow AI Generator", () => {
  it("matches dance and audition keywords to K-POP dance pipeline", () => {
    const wf = generateWorkflowFromPrompt("구글폼으로 들어온 댄스 지원자 중 80점 넘으면 노션에 넣고 카톡 보내줘");
    expect(wf.nodes.length).toBeGreaterThan(4);
    expect(wf.nodes.some((n) => n.type === "trigger.googleforms")).toBe(true);
    expect(wf.nodes.some((n) => n.type === "ai.dance_pose")).toBe(true);
    expect(wf.nodes.some((n) => n.type === "kakaotalk.alimtalk")).toBe(true);
    expect(wf.nodes.some((n) => n.type === "notion.sync")).toBe(true);
    expect(wf.nodes.some((n) => n.type === "audition.score_filter")).toBe(false);
    expect(wf.edges.length).toBe(wf.nodes.length - 1);
  });

  it("matches shortform and ffmpeg keywords to 9:16 shortform pipeline", () => {
    const wf = generateWorkflowFromPrompt("오디션 영상에서 9:16 숏폼 추출해서 유튜브 쇼츠랑 틱톡에 올려줘");
    expect(wf.nodes.some((n) => n.type === "media.ffmpeg_cut")).toBe(true);
    expect(wf.nodes.some((n) => n.type === "youtube.upload")).toBe(true);
    expect(wf.nodes.some((n) => n.type === "tiktok.upload")).toBe(true);
  });

  it("matches AR demo keywords to copyright pipeline", () => {
    const wf = generateWorkflowFromPrompt("A&R 데모곡 음원 표절 검사하고 통과하면 캘린더 미팅 일정 등록해줘");
    expect(wf.nodes.some((n) => n.type === "ar.duplicate_audio")).toBe(true);
    expect(wf.nodes.some((n) => n.type === "calendar.schedule")).toBe(true);
  });

  it("matches vocal and GPT keywords to deep eval pipeline", () => {
    const wf = generateWorkflowFromPrompt("보컬 지원자 가져와서 GPT-4o로 평가하고 팀장 승인 후 슬랙으로 보고");
    expect(wf.nodes.some((n) => n.type === "openai.analyze")).toBe(true);
    expect(wf.nodes.some((n) => n.type === "slack.message")).toBe(true);
  });

  it("assigns valid chained edges and non-overlapping horizontal positions", () => {
    const wf = generateWorkflowFromPrompt("K-POP 댄스 오디션");
    for (let i = 0; i < wf.nodes.length; i++) {
      expect(wf.nodes[i].position.x).toBe(i * 280);
      expect(wf.nodes[i].position.y).toBe(0);
    }
    expect(wf.edges[0].source).toBe(wf.nodes[0].id);
    expect(wf.edges[0].target).toBe(wf.nodes[1].id);
  });
});
