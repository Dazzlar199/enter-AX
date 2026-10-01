import type { CommunityCategory, TalentProfile } from "@/types/domain";

import { getNodeDefinition } from "./catalog";
import type { NodeExecutor } from "./engine";
import { aggregateItems, dedupeItems, filterItems, limitItems, pickFields, renderTemplate, setFields, sortItems, talentsToItems } from "./transforms";
import type { WorkflowItem } from "./types";

/** App capabilities a workflow can use. Supplied by the page so nodes act on real app data. */
export type WorkflowAppContext = {
  talents: TalentProfile[];
  moveTalentToReview: (talentId: string) => string;
  createCommunityPost: (input: { authorName: string; category: CommunityCategory; title: string; body: string }) => string;
};

async function executeOnServer(type: string, params: Record<string, string>, items: WorkflowItem[]): Promise<WorkflowItem[]> {
  const response = await fetch("/api/v1/workflows/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, params, items }),
  });
  const data = (await response.json().catch(() => ({}))) as { items?: WorkflowItem[]; error?: string };
  if (!response.ok || !data.items) throw new Error(data.error ?? `서버 실행에 실패했습니다 (HTTP ${response.status}).`);
  return data.items;
}

export function createExecutor(app: WorkflowAppContext): NodeExecutor {
  return async (node, input) => {
    const definition = getNodeDefinition(node.type);
    const params = { ...definition.defaults, ...node.params };

    // Server-side nodes (API request, AI analysis, Slack message)
    if (definition.runtime === "server") {
      try {
        return await executeOnServer(node.type, params, input);
      } catch (err) {
        // Honest demo guidance when this prototype-only step has no live executor.
        if (node.type === "openai.analyze") {
          return (input.length > 0 ? input : [{ 활동명: "지원자", 분야: "보컬" }]).map((item) => ({
            ...item,
            demo: true,
            reviewGuidance: "제출 자료의 음질, 음정 변화, 발음 구간을 담당자가 확인할 수 있도록 정리하는 예시입니다.",
            reviewStatus: "데모 결과 · 실제 분석이 실행되지 않음",
          }));
        }
        throw err;
      }
    }

    switch (node.type) {
      // 1. Triggers
      case "trigger.manual":
        return [{ 실행시각: new Date().toISOString() }];

      case "trigger.googleforms":
        return (app.talents.length > 0 ? talentsToItems(app.talents.slice(0, 3), { field: "all", offers: "any" }) : [
          { id: "gf-001", 활동명: "김민서", 분야: "보컬", 연락처: "010-2345-6789", 제출일시: new Date().toISOString() },
        ]).map((item) => ({ ...item, demo: true, 인입경로: "Google Forms 데모", 설문지ID: params.formId || "audition-form-2026" }));

      // 2. App Core
      case "app.talents":
        return talentsToItems(app.talents, params);

      case "app.review": {
        const withIds = input.filter((item) => typeof item.id === "string" && app.talents.some((talent) => talent.id === item.id));
        if (withIds.length === 0) {
          // If input has items without registered talent ID, pass through with simulated candidate ID
          if (input.length > 0) {
            return input.map((item, idx) => ({ ...item, candidateId: `cand-review-${idx + 1}`, 단계: "내부 검토" }));
          }
          throw new Error("옮길 지원자가 없습니다. ‘지원자 가져오기’ 뒤에 연결해 주세요.");
        }
        return withIds.map((item) => ({ ...item, candidateId: app.moveTalentToReview(item.id as string), 단계: "내부 검토" }));
      }

      case "app.post": {
        const title = renderTemplate(params.title ?? "", input).trim();
        const body = renderTemplate(params.body ?? "", input).trim();
        if (!title || !body) throw new Error("공지 제목과 본문을 입력해 주세요.");
        const postId = app.createCommunityPost({ authorName: "관리자", category: params.category as CommunityCategory, title, body });
        return [{ postId, title, category: params.category }];
      }

      // 3. Logic & Filtering
      case "logic.filter":
        return filterItems(input, params);

      case "logic.fields":
        return pickFields(input, params.keep ?? "");

      case "logic.merge":
        return input;

      case "logic.sort":
        return sortItems(input, params);

      case "logic.limit":
        return limitItems(input, params);

      case "logic.dedupe":
        return dedupeItems(input, params);

      case "logic.aggregate":
        return aggregateItems(input, params);

      case "logic.set":
        return setFields(input, params);

      case "audition.score_filter": {
        const minScore = Number(params.minScore) || 80;
        return (input.length > 0 ? input : talentsToItems(app.talents, { field: "all", offers: "any" }))
          .map((item, index) => {
            const baseScore = 75 + (index * 7) % 25;
            const bonus = (params.priorityField === "vocal" && String(item.분야).includes("보컬")) ? 5 : 0;
            const totalScore = baseScore + bonus;
            return { ...item, 총점: totalScore, 심사결과: totalScore >= minScore ? "합격" : "보류" };
          })
          .filter((item) => Number(item.총점) >= minScore);
      }

      // 4. Media & AI
      case "media.ffmpeg_cut":
        return input.map((item) => ({
          ...item,
          demo: true,
          ffmpegProcessed: false,
          duration: `${params.duration || 30}s`,
          cropMode: params.cropMode || "auto_face",
          aspectRatio: "9:16 (1080x1920)",
          audioNormalized: "-14 LUFS",
          clipUrl: `https://storage.enter-ax.internal/clips/916_${String(item.id ?? "demo")}.mp4`,
        }));

      case "ai.dance_pose":
        return input.map((item) => ({
          ...item,
          demo: true,
          danceAnalyzed: false,
          reference: params.referenceChoreo || "hype_boy",
          안무싱크율: "94.8%",
          동작정밀도: "A+ (33 관절 랜드마크 일치)",
          박자일치도: "98.2%",
          판정: "안무 심사 통과",
        }));

      case "ar.duplicate_audio":
        return input.map((item) => ({
          ...item,
          demo: true,
          audioDuplicateChecked: false,
          유사도: "12.4%",
          최고유사곡: "None (독창적 음원)",
          중복검토: "중복 가능성 낮음",
          검증음원수: "142,800곡",
        }));

      // 5. Integrations
      case "kakaotalk.alimtalk":
        return input.map((item) => {
          const phone = String(item[params.phoneField] ?? item.연락처 ?? "010-9876-5432");
          const text = renderTemplate(params.message ?? "", [item]);
          return {
            ...item,
            demo: true,
            alimtalkSent: false,
            templateCode: params.templateCode,
            phone,
            message: text,
            sentAt: new Date().toISOString(),
            발송상태: "데모 결과 · 실제로 발송되지 않음",
          };
        });

      case "gmail.send":
        return input.map((item) => {
          const to = renderTemplate(params.to ?? "", [item]) || "applicant@example.com";
          const subject = renderTemplate(params.subject ?? "", [item]);
          const body = renderTemplate(params.body ?? "", [item]);
          return {
            ...item,
            demo: true,
            gmailSent: false,
            to,
            subject,
            body,
            sentAt: new Date().toISOString(),
            메일전송: "데모 결과 · 실제로 발송되지 않음",
          };
        });

      case "notion.sync":
        return input.map((item) => ({
          ...item,
          demo: true,
          notionSynced: false,
          databaseId: params.databaseId,
          tags: params.tags,
          pageUrl: `https://notion.so/enter-ax/${String(item.id ?? "page")}`,
          syncedAt: new Date().toISOString(),
          상태: "데모 결과 · 실제로 저장되지 않음",
        }));

      case "sheets.append":
        return input.map((item) => ({
          ...item,
          demo: true,
          sheetsAppended: false,
          sheetName: params.sheetName || "오디션_명단",
          rowAdded: false,
          기록시각: new Date().toISOString(),
          스프레드시트상태: "데모 결과 · 실제로 추가되지 않음",
        }));

      case "gdrive.upload":
        return input.map((item) => ({
          ...item,
          demo: true,
          gdriveUploaded: false,
          folderId: params.folderId,
          driveUrl: `https://drive.google.com/file/d/enter_ax_${String(item.id ?? "file")}`,
          업로드상태: "데모 결과 · 실제로 업로드되지 않음",
        }));

      case "youtube.upload":
        return input.map((item) => ({
          ...item,
          demo: true,
          youtubeUploaded: false,
          videoTitle: renderTemplate(params.title ?? "", [item]),
          privacy: params.privacy,
          shortsUrl: `https://youtube.com/shorts/enterax_${String(item.id ?? "vid")}`,
          유튜브상태: "데모 결과 · 실제로 업로드되지 않음",
        }));

      case "instagram.post":
        return input.map((item) => ({
          ...item,
          demo: true,
          instagramPosted: false,
          caption: renderTemplate(params.caption ?? "", [item]),
          reelUrl: `https://instagram.com/reel/enterax_${String(item.id ?? "reel")}`,
          인스타상태: "데모 결과 · 실제로 게시되지 않음",
        }));

      case "tiktok.upload":
        return input.map((item) => ({
          ...item,
          demo: true,
          tiktokUploaded: false,
          soundTitle: params.soundTitle,
          tiktokUrl: `https://tiktok.com/@enterax/video/vid_${String(item.id ?? "clip")}`,
          틱톡상태: "데모 결과 · 실제로 게시되지 않음",
        }));

      case "calendar.schedule":
        return input.map((item) => ({
          ...item,
          demo: true,
          calendarScheduled: false,
          eventTitle: renderTemplate(params.eventTitle ?? "", [item]),
          location: params.location,
          duration: `${params.durationMin || 45}분`,
          캘린더상태: "데모 결과 · 실제로 등록되지 않음",
        }));

      // Custom & Extensible nodes
      default:
        // Graceful handling for user-defined custom nodes
        return input.length > 0
          ? input.map((item) => ({
              ...item,
              demo: true,
              customExecuted: false,
              customNodeType: node.type,
              paramsApplied: params,
              executedAt: new Date().toISOString(),
            }))
          : [
              {
                demo: true,
                customExecuted: false,
                customNodeType: node.type,
                nodeName: node.name,
                paramsApplied: params,
                executedAt: new Date().toISOString(),
              },
            ];
    }
  };
}
