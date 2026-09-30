"use client";

import { useAgencySession } from "@/features/agency/AgencySessionProvider";

const roleLabel: Record<string, string> = {
  owner: "관리자",
  admin: "관리자",
  member: "캐스팅 담당",
  viewer: "열람 전용",
};

export function AccountBadge() {
  const { profile, logout } = useAgencySession();
  if (!profile) return null;

  return (
    <div aria-label="로그인 계정" className="account-badge">
      <span className="account-badge__name">{profile.displayName}</span>
      <span className="account-badge__role">{roleLabel[profile.role] ?? profile.role}</span>
      <button className="account-badge__logout" type="button" onClick={() => logout()}>로그아웃</button>
    </div>
  );
}
