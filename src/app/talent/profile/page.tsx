"use client";

import { TalentProfileCard } from "@/components/talent/TalentProfileCard";
import { useDemo } from "@/features/demo/DemoProvider";

function Setting({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="ap-setting">
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="ap-switch">
        <input aria-label={title} checked={checked} role="switch" type="checkbox" onChange={(event) => onChange(event.target.checked)} />
        <span aria-hidden="true" />
      </span>
    </label>
  );
}

export default function TalentProfilePage() {
  const { state, updateTalentPreferences } = useDemo();
  const talent = state.talents[0];
  const views = state.profileViews.filter((view) => view.talentId === talent.id);
  const update = (preferences: Partial<Pick<typeof talent, "visibility" | "openToOffers" | "marketingConsent">>) =>
    updateTalentPreferences(talent.id, { visibility: talent.visibility, openToOffers: talent.openToOffers, marketingConsent: talent.marketingConsent, ...preferences });

  return (
    <main className="ap-page">
      <header className="ap-head">
        <div>
          <h1>내 프로필</h1>
          <p>누가 내 프로필을 볼 수 있는지, 제안을 받을지 직접 정할 수 있어요.</p>
        </div>
      </header>

      <TalentProfileCard talent={talent} />

      <section className="ap-section" aria-labelledby="ap-settings-title">
        <h2 id="ap-settings-title">공개 설정</h2>
        <div className="ap-card ap-settings">
          <Setting
            checked={talent.visibility === "public"}
            description="끄면 인증된 기획사만 프로필을 볼 수 있어요."
            title="커뮤니티에 전체 공개"
            onChange={(checked) => update({ visibility: checked ? "public" : "verified-agencies" })}
          />
          <Setting
            checked={talent.openToOffers}
            description="끄면 새 오디션 제안을 받지 않아요. 이미 받은 제안은 그대로 남아요."
            title="기획사 제안 받기"
            onChange={(checked) => update({ openToOffers: checked })}
          />
          <Setting
            checked={talent.marketingConsent}
            description="커뮤니티 추천 영역에 내 무대를 소개하는 데 동의해요."
            title="추천 소개 동의"
            onChange={(checked) => update({ marketingConsent: checked })}
          />
        </div>
      </section>

      <section className="ap-section" aria-labelledby="ap-views-title">
        <h2 id="ap-views-title">내 프로필을 본 기획사</h2>
        <div className="ap-card ap-rows">
          {views.length ? (
            views.map((view) => {
              const agency = state.agencies.find((item) => item.id === view.agencyId);
              return (
                <div className="ap-row" key={view.id}>
                  <span className="ap-mark" aria-hidden="true">{agency?.name.slice(0, 1) ?? "?"}</span>
                  <span>
                    <strong>{agency?.name ?? "알 수 없는 기획사"}</strong>
                    <small>{agency?.department}</small>
                  </span>
                  <time className="ap-muted" dateTime={view.viewedAt}>{view.viewedAt.slice(0, 10).replaceAll("-", ".")}</time>
                </div>
              );
            })
          ) : (
            <p className="ap-empty">아직 프로필을 본 기획사가 없어요.</p>
          )}
        </div>
      </section>
    </main>
  );
}
