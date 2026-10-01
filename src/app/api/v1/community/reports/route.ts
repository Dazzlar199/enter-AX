import { getServerContainer } from "@/server/container";

export const runtime = "nodejs";

export function POST(request: Request) {
  return getServerContainer().handlers.postReport(request);
}
