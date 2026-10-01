import Link from "next/link";
import type { ReactNode } from "react";

import { DemoBadge } from "./DemoBadge";
import { RoleSwitcher } from "./RoleSwitcher";

export type ShellMode = "public" | "talent" | "agency";

const navigation: Record<ShellMode, Array<{ href: string; label: string }>> = {
  public: [
    { href: "/#talent", label: "지원자" },
    { href: "/#agency", label: "기획사" },
    { href: "/#workflow", label: "업무 자동화" },
    { href: "/talent", label: "커뮤니티" },
  ],
  talent: [
    { href: "/talent/onboarding", label: "프로필 등록" },
    { href: "/talent/profile", label: "내 프로필" },
    { href: "/talent/offers", label: "받은 제안" },
  ],
  agency: [
    { href: "/agency/discover", label: "지원자 찾기" },
    { href: "/agency/pipeline", label: "지원자 관리" },
    { href: "/agency/ax", label: "AX Command" },
    { href: "/agency/content", label: "콘텐츠 자동화" },
  ],
};

export function AppShell({ mode, children }: { mode: ShellMode; children: ReactNode }) {
  return (
    <div className="app-shell" data-mode={mode}>
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <header className="site-header">
        <Link href="/" className="brand-mark" aria-label="Enter-AX 홈">ENTER—AX</Link>
        <nav className="primary-nav" aria-label="주요 메뉴">
          {navigation[mode].map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>
        <div className="header-actions">
          <DemoBadge />
          <RoleSwitcher />
        </div>
      </header>
      <div className="app-content" id="main-content" tabIndex={-1}>{children}</div>
    </div>
  );
}
