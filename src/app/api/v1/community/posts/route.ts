import { getServerContainer } from "@/server/container";

export const runtime = "nodejs";

export function GET(request: Request) {
  return getServerContainer().handlers.getPosts(request);
}

export function POST(request: Request) {
  return getServerContainer().handlers.postPost(request);
}
