import { getServerContainer } from "@/server/container";

export const runtime = "nodejs";

export function GET(request: Request) {
  return getServerContainer().handlers.getSession(request);
}

export function POST(request: Request) {
  return getServerContainer().handlers.postSession(request);
}

export function DELETE(request: Request) {
  return getServerContainer().handlers.deleteSession(request);
}
