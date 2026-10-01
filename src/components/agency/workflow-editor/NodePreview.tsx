import { getNodeDefinition } from "@/features/workflows/catalog";
import { renderTemplate } from "@/features/workflows/transforms";
import type { NodeRunState, WorkflowItem, WorkflowNode } from "@/features/workflows/types";

function scalarEntries(item: WorkflowItem, limit: number): Array<[string, string]> {
  return Object.entries(item)
    .filter(([, value]) => value !== null && typeof value !== "object")
    .slice(0, limit)
    .map(([key, value]) => [key, String(value)]);
}

function MiniTable({ items }: { items: WorkflowItem[] }) {
  const columns = [...new Set(items.slice(0, 3).flatMap((item) => scalarEntries(item, 2).map(([key]) => key)))].slice(0, 2);
  if (columns.length === 0) return <pre className="wfp-json">{JSON.stringify(items[0] ?? {}, null, 1).slice(0, 160)}</pre>;
  return (
    <table className="wfp-table">
      <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
      <tbody>
        {items.slice(0, 3).map((item, index) => (
          <tr key={index}>{columns.map((column) => <td key={column}>{String(item[column] ?? "")}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function People({ items }: { items: WorkflowItem[] }) {
  const names = items.map((item) => String(item.활동명 ?? item.name ?? item.id ?? "?"));
  return (
    <div className="wfp-people">
      <div className="wfp-avatars">
        {names.slice(0, 4).map((name, index) => <span key={`${name}-${index}`}>{name.slice(0, 1)}</span>)}
        {names.length > 4 ? <span className="wfp-more">+{names.length - 4}</span> : null}
      </div>
      <p>{names.slice(0, 3).join(", ")}{names.length > 3 ? ` 외 ${names.length - 3}명` : ""}</p>
    </div>
  );
}

function Hint({ children, tone }: { children: React.ReactNode; tone?: "warn" | "muted" }) {
  return <p className="wfp-hint" data-tone={tone}>{children}</p>;
}

const fieldLabel: Record<string, string> = { idol: "아이돌", vocal: "보컬", dance: "댄스", actor: "배우", model: "모델" };
const operatorLabel: Record<string, string> = { contains: "포함", equals: "같음", not_empty: "값 있음", gt: "보다 큼" };

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** What the node looks like inside: its latest output after a run, or a preview of its settings before one. */
export function NodePreview({ node, run }: { node: WorkflowNode; run: NodeRunState }) {
  const definition = getNodeDefinition(node.type);
  const params = { ...definition.defaults, ...node.params };
  const output = run.status === "success" ? run.output ?? [] : null;
  const input = run.input ?? [];

  if (run.status === "error") return <Hint tone="warn">{run.error ?? "오류가 발생했습니다."}</Hint>;
  if (run.status === "running") return <div className="wfp-loading"><i /><i /><i /></div>;
  if (run.status === "skipped") return <Hint tone="muted">앞 단계가 끝나지 않아 건너뜀</Hint>;

  switch (node.type) {
    case "trigger.manual":
      return output ? <Hint>{new Date(String(output[0]?.실행시각 ?? Date.now())).toLocaleTimeString("ko-KR")} 실행</Hint> : <Hint tone="muted">‘업무 흐름 시작’으로 실행</Hint>;

    case "trigger.googleforms":
      return (
        <div className="wfp-trigger-info">
          <span className="wfp-badge-sub">구글 폼 접수</span>
          <p>{output ? `${output.length}건 지원서 실시간 인입` : `설문지 ID: ${params.formId || "설정 필요"}`}</p>
        </div>
      );

    case "app.talents":
    case "app.review":
      if (output) return output.length ? <People items={output} /> : <Hint tone="muted">조건에 맞는 지원자 없음</Hint>;
      return node.type === "app.talents" ? (
        <Hint tone="muted">{params.field === "all" ? "전체 분야" : `분야: ${fieldLabel[params.field] ?? params.field}`} · {params.offers === "open" ? "제안 받는 지원자" : "모든 지원자"}</Hint>
      ) : (
        <Hint tone="muted">받은 지원자를 ‘내부 검토’로 이동</Hint>
      );

    case "http.request":
      if (output) return output.length ? <MiniTable items={output} /> : <Hint tone="muted">받은 데이터 없음</Hint>;
      return params.url ? (
        <p className="wfp-request"><b>{params.method}</b>{hostOf(params.url)}</p>
      ) : (
        <Hint tone="warn">URL을 입력해 주세요</Hint>
      );

    case "logic.filter":
      if (output) return <><p className="wfp-count">{input.length}개 중 <b>{output.length}개</b> 통과</p>{output.length ? <MiniTable items={output} /> : null}</>;
      return params.field ? <p className="wfp-rule"><span>{params.field}</span>{operatorLabel[params.operator] ?? params.operator}<span>{params.value || "…"}</span></p> : <Hint tone="warn">조건을 설정해 주세요</Hint>;

    case "audition.score_filter":
      if (output) return <><p className="wfp-count">이전 데모 결과 <b>{output.length}건</b></p>{output.length ? <People items={output} /> : null}</>;
      return <p className="wfp-rule">최소 점수 <span>{params.minScore || 80}점</span> 통과</p>;

    case "logic.fields": {
      const keys = (params.keep ?? "").split(",").map((key) => key.trim()).filter(Boolean);
      return keys.length ? <div className="wfp-chips">{keys.map((key) => <span key={key}>{key}</span>)}</div> : <Hint tone="muted">모든 필드 유지</Hint>;
    }

    case "ai.summary": {
      const summary = output?.[0]?.summary;
      return typeof summary === "string" ? <p className="wfp-text">{summary}</p> : <Hint tone="muted">{params.topic ? `주제: ${params.topic}` : "들어온 데이터를 요약"}</Hint>;
    }

    case "openai.analyze":
      if (output?.[0]?.aiEvaluation) return <p className="wfp-text">{String(output[0].aiEvaluation)}</p>;
      return <Hint tone="muted">{params.model} · 심층 평가 프롬프트 대기</Hint>;

    case "ai.dance_pose":
      if (output?.[0]) return <div className="wfp-gauge"><strong>싱크로율 {String(output[0].안무싱크율 ?? "94.8%")}</strong><span>{String(output[0].동작정밀도 ?? "A+ 관절 일치")}</span></div>;
      return <Hint tone="muted">{params.referenceChoreo || "기준 안무"} 33개 관절 매칭</Hint>;

    case "ar.duplicate_audio":
      if (output?.[0]) return <div className="wfp-audio-check"><strong>음원 유사도 {String(output[0].유사도 ?? "12.4%")}</strong><span>{String(output[0].중복검토 ?? "검토 필요")}</span></div>;
      return <Hint tone="muted">데모 오디오 지문 대조 (임계치 {params.similarityThreshold}%)</Hint>;

    case "media.ffmpeg_cut":
      if (output?.[0]) return <div className="wfp-media-cut"><span>9:16 인물 트래킹 완료</span><small>{output.length}개 숏폼 클립 생성</small></div>;
      return <Hint tone="muted">스마트 9:16 얼굴 크롭 ({params.duration || 30}초)</Hint>;

    case "human.approval":
      if (run.status === "waiting") return <p className="wfp-wait"><b>승인 대기</b>{params.approver || "담당자"} · {input.length}건</p>;
      if (run.status === "rejected") return <Hint tone="warn">반려됨 · 이후 단계 중단</Hint>;
      if (output) return <p className="wfp-ok">승인됨 · {output.length}건 전달</p>;
      return <Hint tone="muted">{params.approver ? `${params.approver} 승인 후 진행` : "담당자 승인 후 진행"}</Hint>;

    case "app.post": {
      const title = renderTemplate(params.title ?? "", input);
      const body = renderTemplate(params.body ?? "", input);
      return (
        <div className="wfp-post">
          <span>{params.category}</span>
          <strong>{title || "제목을 입력해 주세요"}</strong>
          <p>{body || "본문을 입력해 주세요"}</p>
        </div>
      );
    }

    case "slack.message": {
      const text = renderTemplate(params.text ?? "", input);
      return (
        <div className="wfp-slack">
          <span className="wfp-slack__avatar">EA</span>
          <div>
            <strong>ENTER—AX <small>앱</small></strong>
            <p>{text || "메시지를 입력해 주세요"}</p>
          </div>
        </div>
      );
    }

    case "kakaotalk.alimtalk":
      return (
        <div className="wfp-kakao">
          <span className="wfp-kakao__badge">카카오톡 알림톡</span>
          <p>{output ? `${output.length}명에게 발송 완료` : (renderTemplate(params.message ?? "", input) || "알림톡 템플릿 설정됨")}</p>
        </div>
      );

    case "gmail.send":
      return (
        <div className="wfp-gmail">
          <span className="wfp-gmail__badge">Gmail</span>
          <strong>{renderTemplate(params.subject ?? "", input) || "오디션 안내 메일"}</strong>
          <small>{output ? `${output.length}건 발송 성공` : `수신: ${params.to || "지원자"}`}</small>
        </div>
      );

    case "notion.sync":
      return (
        <div className="wfp-notion">
          <span className="wfp-notion__badge">Notion DB</span>
          <p>{output ? `${output.length}명 프로필 동기화 완료` : `태그: ${params.tags || "2026오디션"}`}</p>
        </div>
      );

    case "sheets.append":
      return (
        <div className="wfp-sheets">
          <span className="wfp-sheets__badge">Sheets 시트 행 추가</span>
          <p>{output ? `${output.length}행 추가 완료` : `시트: ${params.sheetName || "오디션_명단"}`}</p>
        </div>
      );

    case "gdrive.upload":
      return (
        <div className="wfp-drive">
          <span className="wfp-drive__badge">Drive 저장</span>
          <p>{output ? `${output.length}개 미디어 백업 완료` : `폴더: ${params.folderId || "폴더 지정"}`}</p>
        </div>
      );

    case "youtube.upload":
      return (
        <div className="wfp-youtube">
          <span className="wfp-yt__badge">Shorts 발행</span>
          <p>{output ? `${output.length}개 업로드 완료` : (params.title || "유튜브 Shorts")}</p>
        </div>
      );

    case "instagram.post":
      return (
        <div className="wfp-insta">
          <span className="wfp-insta__badge">Reels 포스팅</span>
          <p>{output ? "릴스 게시 완료" : (params.caption?.slice(0, 30) || "인스타그램 릴스")}</p>
        </div>
      );

    case "tiktok.upload":
      return (
        <div className="wfp-tiktok">
          <span className="wfp-tiktok__badge">TikTok 챌린지</span>
          <p>{output ? "숏폼 업로드 완료" : (params.title || "틱톡 숏폼")}</p>
        </div>
      );

    case "calendar.schedule":
      return (
        <div className="wfp-cal">
          <span className="wfp-cal__badge">Google Calendar</span>
          <p>{output ? `${output.length}건 미팅 등록됨` : (params.eventTitle || "2차 대면 일정")}</p>
        </div>
      );

    default:
      if (output) return <Hint>실행 완료 ({output.length}건 생성)</Hint>;
      return <Hint tone="muted">{definition.label} 실행 대기</Hint>;
  }
}

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => (entry && typeof entry === "object" ? Object.values(entry as Record<string, unknown>).join(" — ") : String(entry)));
}

/** Full-size version of the preview for the side panel. */
export function NodePreviewLarge({ node, run }: { node: WorkflowNode; run: NodeRunState }) {
  const definition = getNodeDefinition(node.type);
  const params = { ...definition.defaults, ...node.params };
  const output = run.status === "success" ? run.output ?? [] : null;
  const input = run.input ?? [];

  if (run.status === "error") return <p className="wfl-error">{run.error}</p>;

  if ((node.type === "app.talents" || node.type === "app.review" || node.type === "audition.score_filter") && output) {
    return (
      <ul className="wfl-people">
        {output.map((item, index) => (
          <li key={String(item.id ?? index)}>
            <span className="wfl-avatar">{String(item.활동명 ?? "?").slice(0, 1)}</span>
            <div>
              <strong>{String(item.활동명 ?? item.id)}</strong>
              <span>{[item.분야, item.지역, item.연령대].filter(Boolean).join(" · ")}</span>
              {item.총점 ? <p>종합 평가 점수: <strong>{String(item.총점)}점</strong> ({String(item.심사결과 ?? "합격")})</p> : null}
              {item.소개 ? <p>{String(item.소개)}</p> : null}
            </div>
            {item.단계 ? <em>{String(item.단계)}</em> : item.총점 ? <em>합격</em> : null}
          </li>
        ))}
      </ul>
    );
  }

  if (node.type === "ai.summary" && output?.[0]) {
    const result = output[0];
    const sections: Array<[string, string[]]> = [
      ["목표", asList(result.goals)],
      ["강점", asList(result.strengths)],
      ["리스크", asList(result.risks)],
      ["보완할 정보", asList(result.missingInfo)],
      ["다음 할 일", asList(result.actionPlan)],
    ];
    return (
      <div className="wfl-summary">
        <p className="wfl-summary__lead">{String(result.summary ?? "")}</p>
        {sections.filter(([, items]) => items.length).map(([title, items]) => (
          <section key={title}>
            <h4>{title}</h4>
            <ul>{items.map((entry) => <li key={entry}>{entry}</li>)}</ul>
          </section>
        ))}
      </div>
    );
  }

  if (node.type === "openai.analyze" && output?.[0]) {
    return (
      <div className="wfl-summary">
        <p className="wfl-summary__lead">{String(output[0].aiEvaluation ?? "심층 평가 완료")}</p>
        <section>
          <h4>검토 참고 내용</h4>
          <p>{String(output[0].aiRecommendation ?? "합격")}</p>
        </section>
      </div>
    );
  }

  if (node.type === "kakaotalk.alimtalk") {
    return (
      <div className="wfl-kakao-preview">
        <div className="wfl-kakao-bubble">
          <div className="wfl-kakao-head">
            <span className="wfl-kakao-badge">알림톡 도착</span>
            <small>ENTER—AX 오디션 센터</small>
          </div>
          <p>{renderTemplate(params.message ?? "", input) || "알림톡 메시지 본문"}</p>
          <div className="wfl-kakao-btn">[2차 실기 오디션 안내 바로가기]</div>
        </div>
        <small className="wfl-sub">{output ? `${output.length}명에게 정상 발송 완료됨` : "발송 전 미리보기"}</small>
      </div>
    );
  }

  if (node.type === "gmail.send") {
    return (
      <div className="wfl-mail-preview">
        <div className="wfl-mail-header">
          <strong>보내는 사람:</strong> casting@enter-ax.com<br />
          <strong>받는 사람:</strong> {renderTemplate(params.to ?? "", input) || "applicant@example.com"}<br />
          <strong>제목:</strong> {renderTemplate(params.subject ?? "", input) || "오디션 합격 안내"}
        </div>
        <div className="wfl-mail-body">
          {renderTemplate(params.body ?? "", input) || "메일 본문이 입력되지 않았습니다."}
        </div>
      </div>
    );
  }

  if (node.type === "app.post") {
    return (
      <article className="wfl-post">
        <span>{params.category}</span>
        <h4>{renderTemplate(params.title ?? "", input) || "제목을 입력해 주세요"}</h4>
        <p>{renderTemplate(params.body ?? "", input) || "본문을 입력해 주세요"}</p>
        <small>관리자 · {output ? "게시됨" : "게시 전 미리보기"}</small>
      </article>
    );
  }

  if (node.type === "slack.message") {
    return (
      <div className="wfl-slack">
        <span className="wfp-slack__avatar">EA</span>
        <div>
          <strong>ENTER—AX <small>앱</small></strong>
          <p>{renderTemplate(params.text ?? "", input) || "메시지를 입력해 주세요"}</p>
          <small>{output ? "전송됨" : "전송 전 미리보기"}</small>
        </div>
      </div>
    );
  }

  return (
    <div className="wfl-generic">
      <NodePreview node={node} run={run} />
    </div>
  );
}
