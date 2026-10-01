import Image from "next/image";
import Link from "next/link";

import { fieldLabel, talentCover } from "@/features/talent/cover";

import type { AgencyOverviewModel } from "./types";

export function AgencyOverview({ model, agencyName }: { model: AgencyOverviewModel; agencyName: string }) {
  return (
    <div className="ag-page">
      <header className="ag-head">
        <div>
          <h1>{agencyName}</h1>
          <p>오늘 확인할 지원자와 새로 등록된 지원자입니다.</p>
        </div>
        <div className="ag-head__actions">
          <Link className="s-btn" href="/agency/discover">지원자 찾기</Link>
          <Link className="s-btn s-btn--dark" href="/agency/ax">업무 자동화</Link>
        </div>
      </header>

      <section aria-label="현황" className="ag-metrics">
        {model.metrics.map((metric) => (
          <Link className="ag-metric" href={metric.href} key={metric.id}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.hint}</small>
          </Link>
        ))}
      </section>

      <section aria-labelledby="ag-new-title" className="ag-block">
        <header className="ag-block__head">
          <h2 id="ag-new-title">새로 등록된 지원자</h2>
          <Link href="/agency/discover">전체 보기 →</Link>
        </header>
        <ul className="ag-strip">
          {model.newTalents.map((talent) => (
            <li key={talent.id}>
              <Link className="s-media ag-strip__card" href={`/agency/talent/${talent.id}`}>
                <Image alt={`${talent.stageName} 샘플 이미지`} fill sizes="(max-width: 700px) 50vw, 25vw" src={talentCover(talent)} style={{ objectFit: "cover" }} />
                <span className="s-media__shade" />
                <span className="s-media__info">
                  <strong>{talent.stageName}</strong>
                  <span>{talent.fields.map((field) => fieldLabel[field]).join(", ")} · {talent.region}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="ag-split">
        <section aria-labelledby="ag-attention-title" className="ag-block ag-block--boxed">
          <header className="ag-block__head">
            <h2 id="ag-attention-title">확인할 지원자</h2>
            <Link href="/agency/pipeline">지원자 관리 →</Link>
          </header>
          {model.attention.length ? (
            <ul className="ag-list">
              {model.attention.map(({ candidate, talent, stageLabel }) => (
                <li key={candidate.id}>
                  <span className="ag-list__photo">{talent ? <Image alt="" fill sizes="36px" src={talentCover(talent)} style={{ objectFit: "cover" }} /> : null}</span>
                  <span className="ag-list__text">
                    <strong>{talent?.stageName ?? candidate.talentId}</strong>
                    <small>{candidate.nextAction} · 담당 {candidate.owner}</small>
                  </span>
                  <span className="ag-stage">{stageLabel}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ag-empty">지금 확인할 지원자가 없습니다.</p>
          )}
        </section>

        <section aria-labelledby="ag-flow-title" className="ag-block ag-block--boxed ag-promo">
          <h2 id="ag-flow-title">반복 업무는 자동화로</h2>
          <p>지원자 정리, 외부 데이터, AI 요약, Slack 알림을 단계로 이어 붙이고, 중간에 승인 단계를 넣어 실행하세요.</p>
          <Link className="s-btn s-btn--dark" href="/agency/ax">자동화 만들기</Link>
          <div className="ag-promo__shot">
            <Image alt="업무 자동화 화면" fill sizes="480px" src="/images/landing/workflow-editor.png" style={{ objectFit: "cover", objectPosition: "left top" }} />
          </div>
        </section>
      </div>
    </div>
  );
}
