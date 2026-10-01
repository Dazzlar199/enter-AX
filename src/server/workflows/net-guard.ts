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
  const groups = parseIpv6(address);
  if (!groups) return true; // unparseable: fail closed
  const embedded = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  const leadingZero = groups.slice(0, 5).every((group) => group === 0);
  if (leadingZero && groups[5] === 0xffff) return isPrivateAddress(embedded(groups[6], groups[7])); // ::ffff:a.b.c.d
  if (groups.slice(0, 6).every((group) => group === 0)) return true; // ::, ::1 and deprecated IPv4-compatible
  if (groups[0] === 0x64 && groups[1] === 0xff9b && groups.slice(2, 6).every((group) => group === 0)) {
    return isPrivateAddress(embedded(groups[6], groups[7])); // NAT64
  }
  if (groups[0] === 0x2002) return isPrivateAddress(embedded(groups[1], groups[2])); // 6to4
  return (groups[0] & 0xfe00) === 0xfc00 || (groups[0] & 0xffc0) === 0xfe80 || (groups[0] & 0xff00) === 0xff00;
}

/** Expands an IPv6 literal (incl. `::` and a trailing dotted IPv4) into eight 16-bit groups. */
function parseIpv6(address: string): number[] | null {
  let text = address.split("%")[0].toLowerCase();
  const dotted = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const octets = dotted[1].split(".").map(Number);
    if (octets.some((octet) => octet > 255)) return null;
    text = text.slice(0, -dotted[1].length) + ((octets[0] << 8) | octets[1]).toString(16) + ":" + ((octets[2] << 8) | octets[3]).toString(16);
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const toGroups = (part: string) => (part === "" ? [] : part.split(":").map((group) => (/^[0-9a-f]{1,4}$/.test(group) ? parseInt(group, 16) : NaN)));
  const head = toGroups(halves[0]);
  const tail = halves.length === 2 ? toGroups(halves[1]) : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...new Array<number>(halves.length === 2 ? missing : 0).fill(0), ...tail];
  return groups.some(Number.isNaN) ? null : groups;
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
