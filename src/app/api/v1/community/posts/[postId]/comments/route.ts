import { getServerContainer } from "@/server/container";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ postId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { postId } = await context.params;
  return getServerContainer().handlers.getComments(request, postId);
}

export async function POST(request: Request, context: RouteContext) {
  const { postId } = await context.params;
  return getServerContainer().handlers.postComment(request, postId);
}
