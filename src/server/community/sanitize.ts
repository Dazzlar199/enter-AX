/** Server-side privacy guard for public community text (the audience includes minors). */
const PHONE = /(?<!\d)(01[016789])[-.\s]?(\d{3,4})[-.\s]?(\d{4})(?!\d)/g;
const OFFSITE_INVITE = /(?:https?:\/\/)?(?:open\.kakao\.com|t\.me|line\.me|discord\.gg)\/\S*/gi;

export interface SanitizedText {
  text: string;
  /** True when something was masked or removed. */
  changed: boolean;
}

export function sanitizePublicText(input: string): SanitizedText {
  const text = input
    .replace(PHONE, (_match, head: string) => `${head}-****-****`)
    .replace(OFFSITE_INVITE, "[외부 채팅 링크 삭제됨]");
  return { text, changed: text !== input };
}
