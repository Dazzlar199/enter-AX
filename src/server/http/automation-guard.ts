/**
 * The content/talent/AX automation routes run ffmpeg, local models and paid LLM calls without a user session.
 * They stay open in local development and are refused in production unless explicitly enabled.
 */
export function automationDisabledResponse(
  environment: Record<string, string | undefined> = process.env,
): Response | null {
  if (environment.NODE_ENV !== "production" || environment.ENABLE_CONTENT_AUTOMATION === "true") return null;
  return Response.json(
    { error: "이 기능은 배포 환경에서 비활성화되어 있습니다. 로컬 환경에서 사용해주세요." },
    { status: 403 },
  );
}
