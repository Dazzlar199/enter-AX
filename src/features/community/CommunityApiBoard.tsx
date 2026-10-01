"use client";

import { useMemo } from "react";

import { CommunityBoard } from "@/components/talent/CommunityBoard";

import { ApiCommunityClient } from "./api-client";
import { useCommunity } from "./useCommunity";

export function CommunityApiBoard({ query }: { query?: string } = {}) {
  const client = useMemo(() => new ApiCommunityClient(), []);
  const community = useCommunity(client);

  if (community.status === "loading") {
    return <p aria-live="polite" className="board-row-empty">커뮤니티를 불러오는 중입니다.</p>;
  }
  if (community.status === "error") {
    return (
      <div className="board-row-empty" role="alert">
        <p>{community.error}</p>
        <button type="button" onClick={() => void community.reload()}>다시 시도</button>
      </div>
    );
  }

  return (
    <CommunityBoard
      posts={community.posts}
      query={query}
      viewerName={community.viewer?.nickname}
      onCreateSession={community.createSession}
      onCreatePost={({ category, title, body }) => community.createPost({ category, title, body })}
      onReply={(postId, { body }) => community.createComment(postId, body)}
    />
  );
}
