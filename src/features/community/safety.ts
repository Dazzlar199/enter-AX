export type RiskKind = "contact" | "payment" | "offsite";

export interface RiskFinding {
  kind: RiskKind;
  label: string;
  advice: string;
}

/** Fee wording typical of fake-agency audition scams (profile shoot, training, album recording fees). */
const PAYMENT = /(촬영비|프로필\s*촬영|트레이닝비|레슨비|음반\s*취입|취입비|입금|계좌\s*번호|선결제|보증금|등록비|수강료)/;
const PHONE = /(?<!\d)01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/;
const OFFSITE = /(open\.kakao\.com|t\.me\/|line\.me\/|카톡\s*(주세요|아이디|ID)|텔레그램|오픈\s*채팅)/i;

/** Heuristic, client-side scan for content that exposes personal data or looks like a pay-to-audition scam. */
export function scanRisks(text: string): RiskFinding[] {
  const findings: RiskFinding[] = [];
  if (PHONE.test(text)) {
    findings.push({ kind: "contact", label: "전화번호", advice: "전화번호는 공개 게시글에 올리지 마세요. 특히 미성년자는 개인 연락처가 악용될 수 있어요." });
  }
  if (PAYMENT.test(text)) {
    findings.push({ kind: "payment", label: "금전 요구 표현", advice: "촬영비·트레이닝비·음반 취입비 등을 먼저 내라고 하는 곳은 정식 기획사가 아닐 가능성이 높아요." });
  }
  if (OFFSITE.test(text)) {
    findings.push({ kind: "offsite", label: "외부 메신저 유도", advice: "낯선 사람의 오픈채팅·메신저 초대는 피하고, 기획사 공식 채널인지 먼저 확인하세요." });
  }
  return findings;
}

export const scamChecklist = [
  "프로필 촬영비·보컬 트레이닝비·음반 취입비 등 명목으로 돈을 먼저 요구한다",
  "공식 홈페이지·사업자 정보 없이 개인 SNS나 메신저로만 연락한다",
  "‘무조건 합격’, ‘데뷔 보장’ 같은 확정적인 표현을 쓴다",
  "미성년자에게 보호자 없이 혼자 만나자고 하거나 야간·외부 장소를 요구한다",
] as const;
