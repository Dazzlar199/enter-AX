import type { CommunityCategory, CommunityPost, CommunityReply } from "@/types/domain";

import type { CommunityClient, CommunityViewer } from "./client";

const toApiCategory: Record<CommunityCategory, string> = {
  자유: "free",
  질문: "question",
  합격후기: "success-story",
  정보공유: "information",
};

const fromApiCategory: Record<string, CommunityCategory> = {
  free: "자유",
  question: "질문",
  "success-story": "합격후기",
  information: "정보공유",
};

interface ApiPost {
  id: string;
  category: string;
  title: string;
  body: string;
  authorNickname: string;
  replyCount: number;
  createdAt: string;
}

interface ApiComment {
  id: string;
  postId: string;
  body: string;
  authorNickname: string;
  createdAt: string;
}

export class CommunityClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "CommunityClientError";
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: "include" });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const error = body?.error;
    throw new CommunityClientError(
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? "요청을 처리하지 못했습니다.",
      error?.requestId,
      error?.fields,
    );
  }
  return body as T;
}

function mapComment(comment: ApiComment): CommunityReply {
  return { id: comment.id, authorName: comment.authorNickname, body: comment.body, createdAt: comment.createdAt };
}

async function mapPost(post: ApiPost): Promise<CommunityPost> {
  const replies = post.replyCount > 0
    ? (await apiRequest<{ items: ApiComment[] }>(`/api/v1/community/posts/${post.id}/comments`)).items.map(mapComment)
    : [];
  return {
    id: post.id,
    authorName: post.authorNickname,
    category: fromApiCategory[post.category] ?? "자유",
    title: post.title,
    body: post.body,
    createdAt: post.createdAt,
    replies,
  };
}

export class ApiCommunityClient implements CommunityClient {
  async getSession(): Promise<CommunityViewer | null> {
    try {
      const response = await apiRequest<{ profile: CommunityViewer }>("/api/v1/community/session");
      return response.profile;
    } catch (error) {
      if (error instanceof CommunityClientError && error.code === "UNAUTHENTICATED") return null;
      throw error;
    }
  }

  async createSession(nickname: string): Promise<CommunityViewer> {
    const response = await apiRequest<{ profile: CommunityViewer }>("/api/v1/community/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    return response.profile;
  }

  async listPosts(): Promise<CommunityPost[]> {
    const response = await apiRequest<{ items: ApiPost[] }>("/api/v1/community/posts");
    return Promise.all(response.items.map(mapPost));
  }

  async createPost(input: { category: CommunityCategory; title: string; body: string }): Promise<CommunityPost> {
    const response = await apiRequest<{ post: ApiPost }>("/api/v1/community/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category: toApiCategory[input.category], title: input.title, body: input.body }),
    });
    return mapPost(response.post);
  }

  async createComment(postId: string, body: string): Promise<CommunityReply> {
    const response = await apiRequest<{ comment: ApiComment }>(`/api/v1/community/posts/${postId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    return mapComment(response.comment);
  }

  async report(input: { targetType: "post" | "comment"; targetId: string; reason: string }): Promise<void> {
    await apiRequest("/api/v1/community/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  }
}
