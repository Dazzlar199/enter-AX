export interface ChannelVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
}

/** Resolves a channel URL/handle (e.g. https://www.youtube.com/@name) to its stable UC... channel ID
 * by fetching the channel page and reading its externalId, which is far faster than shelling out to yt-dlp. */
export async function resolveChannelId(channelUrl: string): Promise<string> {
  const directMatch = channelUrl.match(/\/channel\/(UC[\w-]+)/);
  if (directMatch) return directMatch[1];

  let response: Response;
  try {
    response = await fetch(channelUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    });
  } catch {
    throw new Error("채널 페이지에 접속하지 못했습니다. URL을 확인해주세요.");
  }
  if (!response.ok) {
    throw new Error(`채널 페이지를 가져오지 못했습니다 (status ${response.status}).`);
  }

  const html = await response.text();
  const match = html.match(/"externalId":"(UC[\w-]+)"/);
  if (!match) throw new Error("채널 ID를 확인하지 못했습니다. 채널 URL이 올바른지 확인해주세요.");
  return match[1];
}

function extractTagValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
  return match ? match[1] : null;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Fetches a YouTube channel's public RSS feed (no API key required) and returns recent uploads, newest first. */
export async function fetchChannelVideos(channelId: string): Promise<ChannelVideo[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const response = await fetch(feedUrl);
  if (!response.ok) {
    throw new Error(`채널 RSS 피드를 가져오지 못했습니다 (status ${response.status}).`);
  }
  const xml = await response.text();

  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  const videos: ChannelVideo[] = entries
    .map((entry) => {
      const videoId = extractTagValue(entry, "yt:videoId");
      const title = extractTagValue(entry, "media:title") ?? extractTagValue(entry, "title");
      const published = extractTagValue(entry, "published");
      const thumbnailMatch = entry.match(/<media:thumbnail url="([^"]+)"/);
      if (!videoId || !title || !published) return null;
      return {
        videoId,
        title: decodeXmlEntities(title),
        publishedAt: published,
        thumbnailUrl: thumbnailMatch ? thumbnailMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      };
    })
    .filter((video): video is ChannelVideo => video !== null);

  return videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}
