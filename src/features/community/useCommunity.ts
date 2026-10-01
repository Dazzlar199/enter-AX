import { useCallback, useEffect, useState } from "react";

import type { CommunityCategory, CommunityPost } from "@/types/domain";

import type { CommunityClient, CommunityViewer } from "./client";

export function useCommunity(client: CommunityClient) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<CommunityViewer | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  const reload = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const [session, nextPosts] = await Promise.all([client.getSession(), client.listPosts()]);
      setViewer(session);
      setPosts(nextPosts);
      setStatus("ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "커뮤니티를 불러오지 못했습니다.");
      setStatus("error");
    }
  }, [client]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    status,
    error,
    viewer,
    posts,
    reload,
    createSession: async (nickname: string) => {
      const profile = await client.createSession(nickname);
      setViewer(profile);
      return profile;
    },
    createPost: async (input: { category: CommunityCategory; title: string; body: string }) => {
      const post = await client.createPost(input);
      setPosts((current) => [post, ...current]);
      return post;
    },
    createComment: async (postId: string, body: string) => {
      const reply = await client.createComment(postId, body);
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, replies: [...post.replies, reply] } : post));
      return reply;
    },
  };
}
