import type { DemoState } from "@/types/domain";

import { createDemoState } from "./fixtures";

export const STORAGE_KEY = "enter-ax-demo:v1";

function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoState>;
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.talents) &&
    Array.isArray(candidate.agencies) &&
    Array.isArray(candidate.offers) &&
    Array.isArray(candidate.candidates) &&
    Array.isArray(candidate.agentJobs) &&
    Array.isArray(candidate.contentJobs) &&
    Array.isArray(candidate.communityPosts)
  );
}

export function loadDemoState(): DemoState {
  if (typeof window === "undefined") return createDemoState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDemoState();
    const parsed: unknown = JSON.parse(raw);
    return isDemoState(parsed) ? parsed : createDemoState();
  } catch {
    return createDemoState();
  }
}

export function saveDemoState(state: DemoState): void {
  if (typeof window === "undefined") return;

  const serializable = JSON.stringify(state, (_key, value: unknown) => {
    if (typeof File !== "undefined" && value instanceof File) return undefined;
    if (typeof Blob !== "undefined" && value instanceof Blob) return undefined;
    if (typeof value === "string" && value.startsWith("blob:")) return "";
    return value;
  });
  window.localStorage.setItem(STORAGE_KEY, serializable);
}
