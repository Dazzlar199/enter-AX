import { getServerContainer } from "@/server/container";

export const runtime = "nodejs";

export function GET(request: Request) {
  return getServerContainer().handlers.getAgencySession(request);
}

export function POST(request: Request) {
  return getServerContainer().handlers.postAgencySession(request);
}

export function DELETE(request: Request) {
  return getServerContainer().handlers.deleteAgencySession(request);
}
