import type { CommunityCategory, CommunityPost, CommunityReply } from "@/types/domain";

export interface CommunityViewer {
  nickname: string;
}

export interface CommunityClient {
  getSession(): Promise<CommunityViewer | null>;
  createSession(nickname: string): Promise<CommunityViewer>;
  listPosts(): Promise<CommunityPost[]>;
  createPost(input: { category: CommunityCategory; title: string; body: string }): Promise<CommunityPost>;
  createComment(postId: string, body: string): Promise<CommunityReply>;
  report(input: { targetType: "post" | "comment"; targetId: string; reason: string }): Promise<void>;
}
