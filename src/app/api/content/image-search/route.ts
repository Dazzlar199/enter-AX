import { NextResponse } from "next/server";
import { automationDisabledResponse } from "@/server/http/automation-guard";

export const runtime = "nodejs";

const NAVER_ENDPOINT = "https://naverapihub.apigw.ntruss.com/search/v1/image";

interface NaverImageItem {
  title: string;
  link: string;
  thumbnail: string;
  sizewidth: string;
  sizeheight: string;
}

interface NaverImageResponse {
  items: NaverImageItem[];
}

export interface ImageSearchResult {
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  sourceUrl: string;
  sourceDomain: string;
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

export async function GET(request: Request) {
  const disabled = automationDisabledResponse();
  if (disabled) return disabled;

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "네이버 검색 API 키가 설정되지 않았습니다. .env.local에 NAVER_CLIENT_ID/NAVER_CLIENT_SECRET을 추가해주세요." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });
  }

  const naverUrl = new URL(NAVER_ENDPOINT);
  naverUrl.searchParams.set("query", query);
  naverUrl.searchParams.set("display", "20");
  naverUrl.searchParams.set("sort", "sim");
  naverUrl.searchParams.set("filter", "large");

  const response = await fetch(naverUrl, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `네이버 이미지 검색에 실패했습니다 (status ${response.status}).` },
      { status: 502 },
    );
  }

  const data = (await response.json()) as NaverImageResponse;

  const results: ImageSearchResult[] = data.items
    .filter((item) => item.link.startsWith("http") && item.thumbnail.startsWith("http"))
    .map((item) => {
      let sourceDomain = "";
      try {
        sourceDomain = new URL(item.link).hostname.replace(/^www\./, "");
      } catch {
        sourceDomain = "출처 불명";
      }
      return {
        title: stripHtmlTags(item.title),
        imageUrl: item.link,
        thumbnailUrl: item.thumbnail,
        sourceUrl: item.link,
        sourceDomain,
      };
    });

  return NextResponse.json({ results });
}
