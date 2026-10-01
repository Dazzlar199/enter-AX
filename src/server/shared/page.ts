import { z } from "zod";

import { AppError } from "./errors";

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface FeedCursor {
  createdAt: string;
  id: string;
}

const cursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
}).strict();

export function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(value: string): FeedCursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const result = cursorSchema.safeParse(parsed);
    if (!result.success) throw new Error("invalid cursor");
    return result.data;
  } catch {
    throw new AppError("VALIDATION_FAILED", "페이지 커서가 올바르지 않습니다.");
  }
}
