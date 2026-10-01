import { z } from "zod";

import { communityCategories } from "./model";

const trimmedString = () => z.string().trim();

export const createProfileSchema = z.object({
  nickname: trimmedString().min(2).max(20),
}).strict();

export const createPostSchema = z.object({
  category: z.enum(communityCategories),
  title: trimmedString().min(2).max(120),
  body: trimmedString().min(2).max(10_000),
}).strict();

export const createCommentSchema = z.object({
  body: trimmedString().min(1).max(2_000),
}).strict();

export const createReportSchema = z.object({
  targetType: z.enum(["post", "comment"]),
  targetId: z.uuid(),
  reason: trimmedString().min(2).max(500),
}).strict();

export const listPostsQuerySchema = z.object({
  category: z.enum(communityCategories).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).transform((value) => Math.min(value, 50)).default(20),
}).strict();

export const listCommentsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).transform((value) => Math.min(value, 50)).default(20),
}).strict();

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
