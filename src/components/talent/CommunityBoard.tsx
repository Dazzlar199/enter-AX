"use client";

import { useEffect, useMemo, useState } from "react";

import { scamChecklist, scanRisks } from "@/features/community/safety";
import type { CommunityCategory, CommunityPost } from "@/types/domain";

type BoardFilter = "전체" | CommunityCategory;
type SortMode = "latest" | "popular" | "unanswered";

const LIKED_KEY = "enter-ax.community.liked";

function popularity(post: CommunityPost): number {
  return (post.likes ?? 0) * 2 + post.replies.length;
}

// Reactions are remembered per browser so a viewer cannot like the same post twice.
function useLikedIds(): [Set<string>, (id: string, liked: boolean) => void] {
  const [liked, setLiked] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      setLiked(new Set(JSON.parse(window.localStorage.getItem(LIKED_KEY) ?? "[]") as string[]));
    } catch {
      /* storage unavailable: start empty */
    }
  }, []);
  const update = (id: string, isLiked: boolean) =>
    setLiked((current) => {
      const next = new Set(current);
      if (isLiked) next.add(id);
      else next.delete(id);
      try {
        window.localStorage.setItem(LIKED_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  return [liked, update];
}

const categories: CommunityCategory[] = ["자유", "질문", "합격후기", "정보공유", "주의제보"];

const boardMeta: Record<BoardFilter, { label: string; description: string }> = {
  전체: { label: "전체 글", description: "모든 게시판의 새 글" },
  자유: { label: "자유", description: "연습·촬영·일상 이야기" },
  질문: { label: "질문", description: "지원 방법과 준비 Q&A" },
  합격후기: { label: "합격 후기", description: "서류·미팅 통과 경험" },
  정보공유: { label: "정보 공유", description: "오픈 캐스팅·일정 안내" },
  주의제보: { label: "주의 제보", description: "사칭·선결제 요구 등 사기 의심 제보" },
};

const sortLabels: Record<SortMode, string> = {
  latest: "최신",
  popular: "인기순",
  unanswered: "답변 필요",
};

const avatarTones = ["#ef5b3f", "#e28a2e", "#2f8f6b", "#3b6fd8", "#8a4fd1", "#c2417a"];

function avatarTone(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return avatarTones[hash % avatarTones.length];
}

function isNotice(post: CommunityPost): boolean {
  return post.authorName === "관리자" && post.category === "정보공유";
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function formatRelative(iso: string, now: number | null): string {
  if (now === null) return formatDate(iso);
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return formatDate(iso);
}

// Relative times depend on the clock, so they are computed after mount to keep hydration stable.
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span aria-hidden="true" className={`cm-avatar cm-avatar--${size}`} style={{ background: avatarTone(name) }}>
      {name.slice(0, 1)}
    </span>
  );
}

function PostCard({
  post,
  isOpen,
  onToggle,
  replyDraft,
  onReplyDraftChange,
  onSubmitReply,
  viewerName,
  now,
  liked,
  onToggleLike,
}: {
  liked: boolean;
  onToggleLike?: () => void;
  post: CommunityPost;
  isOpen: boolean;
  onToggle: () => void;
  replyDraft: { authorName: string; body: string };
  onReplyDraftChange: (draft: { authorName: string; body: string }) => void;
  onSubmitReply: (event: React.FormEvent) => void;
  viewerName?: string | null;
  now: number | null;
}) {
  const isNew = now !== null && now - new Date(post.createdAt).getTime() < 1000 * 60 * 60 * 20;
  const detailId = `post-detail-${post.id}`;

  return (
    <li className="cm-post" data-notice={isNotice(post) || undefined} data-open={isOpen}>
      <button aria-controls={detailId} aria-expanded={isOpen} className="cm-post__summary" type="button" onClick={onToggle}>
        <span className="cm-post__meta">
          <Avatar name={post.authorName} />
          <span className="cm-post__author">{post.authorName}</span>
          <span className="cm-dot" aria-hidden="true" />
          <time dateTime={post.createdAt}>{formatRelative(post.createdAt, now)}</time>
          {post.verifiedAgency ? <span className="cm-verified" title="인증된 기획사 계정이 작성한 글">인증 기획사</span> : null}
          {isNotice(post) ? <span className="cm-tag" data-category="공지">공지</span> : <span className="cm-tag" data-category={post.category}>{boardMeta[post.category].label}</span>}
          {isNew ? <span className="cm-new">NEW</span> : null}
          {scanRisks(`${post.title} ${post.body}`).length > 0 && post.category !== "주의제보" ? <span className="cm-risk">주의 표현 포함</span> : null}
        </span>
        <span className="cm-post__title">{post.title}</span>
        {!isOpen ? <span className="cm-post__excerpt">{post.body}</span> : null}
        <span className="cm-post__stats">
          <span className="cm-stat" aria-label={`댓글 ${post.replies.length}개`}>
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 4h12v9H9l-4 3v-3H4z" /></svg>
            {post.replies.length}
          </span>
          {(post.likes ?? 0) > 0 ? <span className="cm-stat" aria-label={`공감 ${post.likes}개`}>♥ {post.likes}</span> : null}
          {post.category === "질문" && post.replies.length === 0 ? <span className="cm-needs">답변을 기다려요</span> : null}
        </span>
      </button>

      {isOpen ? (
        <div className="cm-post__detail" id={detailId}>
          <p className="cm-post__body">{post.body}</p>
          {onToggleLike ? (
            <button aria-pressed={liked} className="cm-like" type="button" onClick={onToggleLike}>
              {liked ? "♥ 공감 취소" : "♡ 공감"} {post.likes ? post.likes : ""}
            </button>
          ) : null}

          <div className="cm-thread">
            <p className="cm-thread__count">댓글 {post.replies.length}</p>
            {post.replies.length > 0 ? (
              <ul className="cm-thread__list">
                {post.replies.map((reply) => (
                  <li className="cm-reply" key={reply.id}>
                    <Avatar name={reply.authorName} size="sm" />
                    <div>
                      <p className="cm-reply__head">
                        <strong>{reply.authorName}</strong>
                        <time dateTime={reply.createdAt}>{formatRelative(reply.createdAt, now)}</time>
                      </p>
                      <p className="cm-reply__body">{reply.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cm-thread__empty">첫 댓글을 남겨 주세요.</p>
            )}

            <form className="cm-reply-form" onSubmit={onSubmitReply}>
              {!viewerName ? (
                <input
                  aria-label="댓글 닉네임"
                  className="cm-input cm-input--nick"
                  placeholder="닉네임"
                  value={replyDraft.authorName}
                  onChange={(e) => onReplyDraftChange({ ...replyDraft, authorName: e.target.value })}
                />
              ) : null}
              <input
                aria-label="댓글 내용"
                className="cm-input"
                placeholder="댓글을 남겨보세요"
                value={replyDraft.body}
                onChange={(e) => onReplyDraftChange({ ...replyDraft, body: e.target.value })}
              />
              <button className="cm-button" disabled={!replyDraft.body.trim()} type="submit">등록</button>
            </form>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function CommunityBoard({
  posts,
  onCreatePost,
  onReply,
  onToggleLike,
  viewerName,
  onCreateSession,
  query: externalQuery,
}: {
  /** Present only where reactions are supported (demo mode). */
  onToggleLike?: (postId: string, liked: boolean) => unknown;
  /** When the page owns the search box, pass its value here and the board hides its own. */
  query?: string;
  posts: CommunityPost[];
  onCreatePost: (input: { authorName: string; category: CommunityCategory; title: string; body: string }) => unknown;
  onReply: (postId: string, input: { authorName: string; body: string }) => unknown;
  viewerName?: string | null;
  onCreateSession?: (nickname: string) => Promise<unknown>;
}) {
  const now = useNow();
  const [likedIds, setLikedId] = useLikedIds();
  const [board, setBoard] = useState<BoardFilter>("전체");
  const [sort, setSort] = useState<SortMode>("latest");
  const [localQuery, setQuery] = useState("");
  const query = externalQuery ?? localQuery;
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<{ authorName: string; category: CommunityCategory; title: string; body: string }>({
    authorName: "",
    category: "자유",
    title: "",
    body: "",
  });
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState({ authorName: "", body: "" });

  const counts = useMemo(() => {
    const result: Record<BoardFilter, number> = { 전체: posts.length, 자유: 0, 질문: 0, 합격후기: 0, 정보공유: 0, 주의제보: 0 };
    for (const post of posts) result[post.category] += 1;
    return result;
  }, [posts]);

  const visiblePosts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = posts.filter((post) => {
      if (board !== "전체" && post.category !== board) return false;
      if (sort === "unanswered" && post.replies.length > 0) return false;
      if (!keyword) return true;
      return [post.title, post.body, post.authorName].some((text) => text.toLowerCase().includes(keyword));
    });
    return filtered.sort((a, b) => {
      // Admin notices stay pinned on top of the latest view, like a regular community board.
      if (sort === "latest" && isNotice(a) !== isNotice(b)) return isNotice(a) ? -1 : 1;
      if (sort === "popular" && popularity(b) !== popularity(a)) return popularity(b) - popularity(a);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts, board, sort, query]);

  const composerRisks = useMemo(() => scanRisks(`${draft.title} ${draft.body}`), [draft.title, draft.body]);

  function openComposer() {
    setDraft({ authorName: "", category: board === "전체" ? "자유" : board, title: "", body: "" });
    setComposerOpen(true);
  }

  async function submitPost(event: React.FormEvent) {
    event.preventDefault();
    const authorName = viewerName?.trim() || draft.authorName.trim();
    if (!authorName || !draft.title.trim() || !draft.body.trim()) return;
    if (!viewerName && onCreateSession) await onCreateSession(authorName);
    await onCreatePost({ authorName, category: draft.category, title: draft.title, body: draft.body });
    setComposerOpen(false);
    setSort("latest");
  }

  function togglePost(postId: string) {
    setReplyDraft({ authorName: "", body: "" });
    setOpenPostId((current) => (current === postId ? null : postId));
  }

  async function submitReply(event: React.FormEvent, postId: string) {
    event.preventDefault();
    const authorName = viewerName?.trim() || replyDraft.authorName.trim();
    if (!authorName || !replyDraft.body.trim()) return;
    if (!viewerName && onCreateSession) await onCreateSession(authorName);
    await onReply(postId, { ...replyDraft, authorName });
    setReplyDraft({ authorName: "", body: "" });
  }

  const boards: BoardFilter[] = ["전체", ...categories];

  return (
    <div className="cm-board">
      <nav aria-label="게시판" className="cm-boards">
        <ul>
          {boards.map((item) => (
            <li key={item}>
              <button aria-current={board === item ? "page" : undefined} className="cm-boards__item" title={boardMeta[item].description} type="button" onClick={() => setBoard(item)}>
                <strong>{boardMeta[item].label}</strong>
                <span className="cm-count">{counts[item]}</span>
              </button>
            </li>
          ))}
        </ul>
        {externalQuery === undefined ? (
          <label className="cm-search">
            <svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5" /><path d="m13 13 4 4" /></svg>
            <input aria-label="게시글 검색" placeholder="제목, 내용, 닉네임 검색" value={localQuery} onChange={(e) => setQuery(e.target.value)} />
          </label>
        ) : null}
      </nav>

      <section aria-label={`${boardMeta[board].label} 게시글`} className="cm-feed">

        {composerOpen ? (
          <form aria-label="새 글 작성" className="cm-composer" onSubmit={submitPost}>
            <div className="cm-composer__cats" role="radiogroup" aria-label="게시판 선택">
              {categories.map((category) => (
                <button
                  aria-checked={draft.category === category}
                  className="cm-chip"
                  key={category}
                  role="radio"
                  type="button"
                  onClick={() => setDraft({ ...draft, category })}
                >
                  {boardMeta[category].label}
                </button>
              ))}
            </div>
            {draft.category === "주의제보" ? (
              <div className="cm-safety" role="note">
                <strong>이런 경우 사기를 의심하세요</strong>
                <ul>{scamChecklist.map((rule) => <li key={rule}>{rule}</li>)}</ul>
                <p>제보할 때는 상대방의 실명·전화번호 대신 상호명, 연락 방식, 요구 내용을 적어 주세요.</p>
              </div>
            ) : null}
            {composerRisks.map((risk) => (
              <p className="cm-risk-note" key={risk.kind} role="alert"><strong>{risk.label}</strong> · {risk.advice}</p>
            ))}
            {!viewerName ? (
              <input className="cm-input" placeholder="닉네임" value={draft.authorName} onChange={(e) => setDraft({ ...draft, authorName: e.target.value })} />
            ) : null}
            <input className="cm-input cm-input--title" placeholder="제목" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <textarea className="cm-input cm-textarea" placeholder="내용을 입력해주세요." value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            <div className="cm-composer__actions">
              <span>{viewerName ? `${viewerName}(으)로 게시` : "닉네임으로 게시됩니다"}</span>
              <div>
                <button className="cm-button cm-button--ghost" type="button" onClick={() => setComposerOpen(false)}>취소</button>
                <button className="cm-button" type="submit">등록</button>
              </div>
            </div>
          </form>
        ) : (
          <button className="cm-composer-trigger" type="button" onClick={openComposer}>
            <Avatar name={viewerName || "나"} />
            <span>오디션 준비 이야기를 나눠보세요</span>
            <span className="cm-button">글쓰기</span>
          </button>
        )}

        {board === "주의제보" ? (
          <aside className="cm-safety" role="note">
            <strong>오디션 사기, 이렇게 구분하세요</strong>
            <ul>{scamChecklist.map((rule) => <li key={rule}>{rule}</li>)}</ul>
          </aside>
        ) : null}

        <div className="cm-sort" role="tablist" aria-label="정렬">
          {(Object.keys(sortLabels) as SortMode[]).map((mode) => (
            <button aria-selected={sort === mode} className="cm-sort__tab" key={mode} role="tab" type="button" onClick={() => setSort(mode)}>
              {sortLabels[mode]}
            </button>
          ))}
          <span className="cm-sort__count">{visiblePosts.length}개의 글</span>
        </div>

        {visiblePosts.length === 0 ? (
          <div className="cm-empty">
            <strong>{query ? "검색 결과가 없어요" : "아직 글이 없어요"}</strong>
            <p>{query ? "다른 검색어로 찾아보세요." : "첫 글을 남겨 대화를 시작해 보세요."}</p>
          </div>
        ) : (
          <ul className="cm-list">
            {visiblePosts.map((post) => (
              <PostCard
                key={post.id}
                isOpen={openPostId === post.id}
                now={now}
                post={post}
                liked={likedIds.has(post.id)}
                onToggleLike={onToggleLike ? () => { const next = !likedIds.has(post.id); setLikedId(post.id, next); onToggleLike(post.id, next); } : undefined}
                replyDraft={replyDraft}
                viewerName={viewerName}
                onReplyDraftChange={setReplyDraft}
                onSubmitReply={(event) => submitReply(event, post.id)}
                onToggle={() => togglePost(post.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
