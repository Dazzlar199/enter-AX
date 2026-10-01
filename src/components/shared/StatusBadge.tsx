import type { ReactNode } from "react";

/** Small state pill. Plain Korean text, soft tone color; no uppercase or monospace. */
export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "info" | "warning" | "negative";
}) {
  return <span className="ap-pill" data-tone={tone}>{children}</span>;
}
