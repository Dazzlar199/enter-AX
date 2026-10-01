import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 3;

function ipv4ToNumber(ip: string): number {
  return ip.split(".").reduce((total, part) => total * 256 + Number(part), 0);
}

function inRange(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(base) & mask);
}

/** True for loopback, private, link-local, CGNAT and other non-public addresses. */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    return [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["224.0.0.0", 4],
    ].some(([base, bits]) => inRange(address, base as string, bits as number));
  }
  const lower = address.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
  return lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb");
}

/** Rejects non-http(s) URLs and hosts that resolve to non-public addresses (SSRF guard). */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("올바른 URL을 입력해 주세요.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("http 또는 https 주소만 호출할 수 있습니다.");
  if (url.username || url.password) throw new Error("URL에 계정 정보를 넣을 수 없습니다. 헤더를 사용해 주세요.");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((entry) => entry.address);
  if (addresses.length === 0) throw new Error("주소를 찾을 수 없습니다.");
  if (addresses.some(isPrivateAddress)) throw new Error("내부망 주소는 호출할 수 없습니다.");
  return url;
}

/** fetch that re-validates every redirect hop against the SSRF guard. */
export async function guardedFetch(raw: string, init: RequestInit): Promise<Response> {
  let target = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const url = await assertPublicUrl(target);
    const response = await fetch(url, { ...init, redirect: "manual" });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    target = new URL(location, url).toString();
    if (response.status === 303) init = { ...init, method: "GET", body: undefined };
  }
  throw new Error("리다이렉트가 너무 많습니다.");
}

/** Reads a response body up to `limit` bytes. */
export async function readLimited(response: Response, limit: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error(`응답이 너무 큽니다 (${Math.round(limit / 1024)}KB 초과).`);
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
