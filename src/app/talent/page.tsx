"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import "@/components/talent/community.css";
import { CommunityBoard } from "@/components/talent/CommunityBoard";
import { HeroCarousel, type HeroSlide } from "@/components/talent/HeroCarousel";
import { Icon } from "@/components/shared/Icon";
import { CommunityApiBoard } from "@/features/community/CommunityApiBoard";
import { useDemo } from "@/features/demo/DemoProvider";
import { fieldLabel, talentCover } from "@/features/talent/cover";
import type { TalentField } from "@/types/domain";

const fieldFilters: Array<{ value: TalentField | "all"; label: string }> = [
  { value: "all", label: "전체" },
  { value: "vocal", label: "보컬" },
  { value: "dance", label: "댄스" },
  { value: "idol", label: "아이돌" },
  { value: "actor", label: "배우" },
  { value: "model", label: "모델" },
];

export default function TalentStartPage() {
  const { state, createCommunityPost, replyToCommunityPost } = useDemo();
  const useApiCommunity = process.env.NEXT_PUBLIC_BACKEND_MODE === "api";
  const [query, setQuery] = useState("");
  const [field, setField] = useState<TalentField | "all">("all");

  const stages = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return state.talents
      .filter((talent) => talent.visibility === "public")
      .filter((talent) => field === "all" || talent.fields.includes(field))
      .filter((talent) => !keyword || [talent.stageName, talent.region, ...talent.fields.map((item) => fieldLabel[item])].some((text) => text.toLowerCase().includes(keyword)));
  }, [state.talents, field, query]);

  const verifiedAgencies = state.agencies.filter((agency) => agency.verification === "verified");

  // Banner slides come from real community content; nothing here is invented copy about results or partners.
  const slides = useMemo<HeroSlide[]>(() => {
    const byNewest = [...state.communityPosts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const notice = byNewest.find((post) => post.category === "정보공유" && post.authorName === "관리자");
    const story = [...state.communityPosts].filter((post) => post.category === "합격후기").sort((a, b) => b.replies.length - a.replies.length)[0];
    const list: HeroSlide[] = [
      {
        id: "profile",
        eyebrow: "지원자 프로필",
        title: "프로필 하나로 인증 기획사에 지원하세요",
        body: "정면·좌·우 사진 3장과 보컬·댄스 영상이면 충분해요. 누구에게 보일지는 직접 정합니다.",
        cta: { label: "프로필 등록하기", href: "/talent/onboarding" },
        image: "/images/demo/dance-stage.jpg",
        tone: "dark",
      },
    ];
    if (notice) list.push({ id: notice.id, eyebrow: "공지", title: notice.title, body: notice.body, cta: { label: "공지 보기", href: "#community" }, image: "/images/demo/agency-banner.jpg", tone: "blue" });
    if (story) list.push({ id: story.id, eyebrow: "합격 후기", title: story.title, body: story.body, cta: { label: "후기 읽기", href: "#community" }, image: "/images/demo/vocal-studio.jpg", tone: "warm" });
    return list;
  }, [state.communityPosts]);

  return (
    <main className="cm-page">
      <HeroCarousel slides={slides} />

      <div className="cm-toolbar">
        <div aria-label="분야" className="cm-pills" role="group">
          {fieldFilters.map((item) => (
            <button aria-pressed={field === item.value} className="cm-pill" key={item.value} type="button" onClick={() => setField(item.value)}>
              {item.label}
            </button>
          ))}
        </div>
        <form className="cm-toolbar__search" role="search" onSubmit={(event) => event.preventDefault()}>
          <svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5" /><path d="m13 13 4 4" /></svg>
          <input aria-label="무대와 게시글 검색" placeholder="활동명, 지역, 게시글 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
          {query ? <button aria-label="검색어 지우기" className="cm-toolbar__clear" type="button" onClick={() => setQuery("")}><Icon name="close" size={14} /></button> : null}
        </form>
      </div>

      <section aria-labelledby="cm-stages-title" className="cm-section">
        <header className="cm-section__head">
          <div>
            <h2 id="cm-stages-title">공개 무대</h2>
            <p>지원자가 전체 공개로 올린 프로필입니다. 사진은 샘플 이미지예요.</p>
          </div>
          <Link className="s-btn s-btn--sm" href="/talent/onboarding">내 무대 올리기</Link>
        </header>
        {stages.length ? (
          <ul className="cm-stages">
            {stages.map((talent, index) => (
              <li key={talent.id}>
                <article className="s-media cm-stage">
                  <Image alt={`${talent.stageName} 샘플 이미지`} fill priority={index < 4} sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 25vw" src={talentCover(talent)} style={{ objectFit: "cover" }} />
                  <span className="s-media__shade" />
                  <span className="s-media__tag">
                    <span className="s-chip" data-field={talent.fields[0]}>{fieldLabel[talent.fields[0]]}</span>
                  </span>
                  <span className="s-media__info">
                    <strong>{talent.stageName}</strong>
                    <span>{talent.region} · {talent.fields.map((item) => fieldLabel[item]).join(", ")}</span>
                  </span>
                </article>
              </li>
            ))}
            <li>
              <Link className="cm-stage cm-stage--upload" href="/talent/onboarding">
                <span aria-hidden="true"><Icon name="plus" size={20} /></span>
                <strong>내 무대 올리기</strong>
                <small>프로필을 전체 공개로 등록하면 여기에 보여요</small>
              </Link>
            </li>
          </ul>
        ) : (
          <p className="cm-empty-line">조건에 맞는 공개 무대가 없어요.</p>
        )}
      </section>

      <section aria-labelledby="cm-community-title" className="cm-section" id="community">
        <header className="cm-section__head">
          <div>
            <h2 id="cm-community-title">커뮤니티</h2>
            <p>지원 방법, 촬영 팁, 합격 경험을 나눠요.</p>
          </div>
        </header>
        {useApiCommunity ? (
          <CommunityApiBoard query={query} />
        ) : (
          <CommunityBoard posts={state.communityPosts} query={query} onCreatePost={createCommunityPost} onReply={replyToCommunityPost} />
        )}
      </section>

      <section aria-labelledby="cm-agencies-title" className="cm-section cm-agencies">
        <header className="cm-section__head">
          <div>
            <h2 id="cm-agencies-title">인증 기획사</h2>
            <p>인증을 마친 기획사만 ‘기획사 전용’ 프로필을 볼 수 있어요.</p>
          </div>
        </header>
        <ul>
          {state.agencies.map((agency) => (
            <li key={agency.id}>
              <span className="cm-agencies__mark" aria-hidden="true">{agency.name.slice(0, 1)}</span>
              <span className="cm-agencies__name"><strong>{agency.name}</strong><small>{agency.department}</small></span>
              <span className="cm-verify" data-verified={agency.verification === "verified"}>{agency.verification === "verified" ? "인증" : "심사 중"}</span>
            </li>
          ))}
        </ul>
        <p className="cm-note">현재 인증 기획사 {verifiedAgencies.length}곳 · 기획사 사칭 제안은 신고해 주세요.</p>
      </section>
    </main>
  );
}
