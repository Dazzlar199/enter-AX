import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { google } from "googleapis";

const TOKEN_PATH = path.join(process.cwd(), ".youtube-tokens.json");
const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];

function getRedirectUri(): string {
  return process.env.YOUTUBE_OAUTH_REDIRECT_URI ?? "http://localhost:3001/api/auth/youtube/callback";
}

export function createOAuthClient() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("YOUTUBE_CLIENT_ID/YOUTUBE_CLIENT_SECRET이 .env.local에 설정되어 있지 않습니다.");
  }
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

export function getAuthUrl(): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function saveTokensFromCode(code: string): Promise<void> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  await writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf-8");
}

export async function getAuthorizedClient() {
  let raw: string;
  try {
    raw = await readFile(TOKEN_PATH, "utf-8");
  } catch {
    throw new Error("유튜브 계정이 연결되어 있지 않습니다. 먼저 유튜브 연동을 완료해주세요.");
  }

  const tokens = JSON.parse(raw) as { refresh_token?: string };
  if (!tokens.refresh_token) {
    throw new Error("유튜브 인증 정보가 유효하지 않습니다. 다시 연동해주세요.");
  }

  const client = createOAuthClient();
  client.setCredentials(tokens);
  return client;
}

export async function isYoutubeConnected(): Promise<boolean> {
  try {
    await readFile(TOKEN_PATH, "utf-8");
    return true;
  } catch {
    return false;
  }
}
