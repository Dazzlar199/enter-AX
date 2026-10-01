"use client";

import { useState } from "react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { fieldLabel } from "@/features/talent/cover";
import type { Agency, Offer, OfferStatus } from "@/types/domain";

type ResponseStatus = Exclude<OfferStatus, "sent">;
type Filter = "all" | "waiting" | "done";

const actions: Array<{ label: string; status: ResponseStatus }> = [
  { label: "제안 수락", status: "accepted" },
  { label: "추가 정보 요청", status: "needs-info" },
  { label: "제안 거절", status: "declined" },
];

const statusView: Record<OfferStatus, { label: string; tone: "warning" | "positive" | "info" | "negative" }> = {
  sent: { label: "답변 대기", tone: "warning" },
  accepted: { label: "수락함", tone: "positive" },
  "needs-info": { label: "추가 정보 요청함", tone: "info" },
  declined: { label: "거절함", tone: "negative" },
};

function formatDue(iso: string): string {
  return iso.slice(0, 10).replaceAll("-", ".");
}

export function OfferInbox({
  offers,
  agencies = [],
  onRespond,
}: {
  offers: Offer[];
  agencies?: Agency[];
  onRespond: (input: { offerId: string; status: ResponseStatus }) => void;
}) {
  const [pending, setPending] = useState<{ offerId: string; status: ResponseStatus } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const waiting = offers.filter((offer) => offer.status === "sent");
  const visible = filter === "all" ? offers : filter === "waiting" ? waiting : offers.filter((offer) => offer.status !== "sent");
  const pendingAction = pending ? actions.find((action) => action.status === pending.status) : null;

  return (
    <div>
      <div aria-label="제안 분류" className="ap-tabs" role="tablist">
        {([["all", "전체", offers.length], ["waiting", "답변 대기", waiting.length], ["done", "답변 완료", offers.length - waiting.length]] as const).map(([value, label, count]) => (
          <button aria-selected={filter === value} className="ap-tab" key={value} role="tab" type="button" onClick={() => setFilter(value)}>
            {label}<span>{count}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? <p className="ap-card ap-empty">해당하는 제안이 없어요.</p> : null}

      <div className="ap-offers">
        {visible.map((offer) => {
          const agency = agencies.find((item) => item.id === offer.agencyId);
          const status = statusView[offer.status];
          return (
            <article className="ap-card ap-offer" data-offer-status={offer.status} key={offer.id}>
              <div className="ap-offer__top">
                <span className="ap-mark" aria-hidden="true">{(agency?.name ?? offer.department).slice(0, 1)}</span>
                <span className="ap-offer__from">
                  <strong>{agency?.name ?? "기획사"}</strong>
                  <small>{offer.department}</small>
                </span>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
              <h2>{offer.title}</h2>
              <p>{offer.message}</p>
              <dl className="ap-facts">
                <div><dt>제안 목적</dt><dd>{offer.purpose}</dd></div>
                <div><dt>분야</dt><dd>{fieldLabel[offer.field]}</dd></div>
                <div><dt>답변 기한</dt><dd className="ap-due">{formatDue(offer.dueAt)}</dd></div>
              </dl>
              {offer.status === "sent" ? (
                <div className="ap-actions">
                  {actions.map((action) => (
                    <button
                      className={action.status === "accepted" ? "s-btn s-btn--dark" : "s-btn"}
                      key={action.status}
                      type="button"
                      onClick={() => setPending({ offerId: offer.id, status: action.status })}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {pending && pendingAction ? (
        <div className="ap-dialog-backdrop" role="presentation">
          <div aria-label="제안 응답 확인" aria-modal="true" className="ap-dialog" role="dialog">
            <h2>{pendingAction.label}로 답변할까요?</h2>
            <p>답변은 기획사 담당자에게 전달되고, 보낸 뒤에는 바꿀 수 없어요.</p>
            <div className="ap-actions">
              <button className="s-btn" type="button" onClick={() => setPending(null)}>취소</button>
              <button
                className="s-btn s-btn--dark"
                type="button"
                onClick={() => {
                  onRespond(pending);
                  setPending(null);
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
