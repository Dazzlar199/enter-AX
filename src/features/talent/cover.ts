import type { TalentField, TalentProfile } from "@/types/domain";

/** Sample cover photos (generated, not real applicants) until applicants upload their own. */
const coversByField: Record<TalentField, string[]> = {
  vocal: ["/images/demo/vocal-studio.jpg", "/images/demo/audition-room.jpg"],
  dance: ["/images/demo/dance-stage.jpg"],
  idol: ["/images/demo/dance-stage.jpg", "/images/demo/vocal-studio.jpg"],
  actor: ["/images/demo/profile-headshot.jpg"],
  model: ["/images/demo/profile-headshot.jpg"],
};

export const fieldLabel: Record<TalentField, string> = { idol: "아이돌", vocal: "보컬", dance: "댄스", actor: "배우", model: "모델" };

export function talentCover(talent: Pick<TalentProfile, "id" | "fields">): string {
  const options = coversByField[talent.fields[0] ?? "vocal"];
  let hash = 0;
  for (const char of talent.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return options[hash % options.length];
}
