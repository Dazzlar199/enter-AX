import { getServerContainer } from "@/server/container";

type Env = Record<string, string | undefined>;
type SessionCheck = (request: Request) => Promise<Response>;

const defaultSessionCheck: SessionCheck = (request) => getServerContainer().handlers.getAgencySession(request);

/**
 * The content/talent/AX automation routes run ffmpeg, local models and paid LLM calls.
 * Local development stays open. In production they require a signed-in agency session (API mode),
 * or an explicit ENABLE_CONTENT_AUTOMATION=true opt-in for single-tenant deployments.
 * Returns null when access is allowed, otherwise the response to send back.
 */
export async function automationAccessResponse(
  request: Request,
  environment: Env = process.env,
  checkSession: SessionCheck = defaultSessionCheck,
): Promise<Response | null> {
  if (environment.NODE_ENV !== "production" || environment.ENABLE_CONTENT_AUTOMATION === "true") return null;
  if (environment.NEXT_PUBLIC_BACKEND_MODE === "api") {
    const session = await checkSession(request);
    return session.ok ? null : session;
  }
  return Response.json(
    { error: "이 기능은 배포 환경에서 비활성화되어 있습니다. 로컬 환경에서 사용해주세요." },
    { status: 403 },
  );
}
