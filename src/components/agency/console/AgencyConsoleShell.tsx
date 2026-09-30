"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AccountBadge } from "@/components/agency/AccountBadge";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { RoleSwitcher } from "@/components/shared/RoleSwitcher";
import { useAgencySession } from "@/features/agency/AgencySessionProvider";
import { useDemo } from "@/features/demo/DemoProvider";

type NavigationItem = { href: string; label: string; icon: string };

const icons = {
  home: "M4 11l8-7 8 7v9h-5v-6H9v6H4z",
  search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M16 16l4 4",
  board: "M4 4h5v16H4z M10 4h5v10h-5z M16 4h4v7h-4z",
  flow: "M5 6a2 2 0 1 0 0 .1z M19 18a2 2 0 1 0 0 .1z M7 6h5a3 3 0 0 1 3 3v6a3 3 0 0 0 3 3 M5 8v10",
  film: "M4 5h16v14H4z M8 5v14 M16 5v14 M4 9h4 M4 15h4 M16 9h4 M16 15h4",
};

const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "캐스팅",
    items: [
      { href: "/agency", label: "홈", icon: icons.home },
      { href: "/agency/discover", label: "지원자 찾기", icon: icons.search },
      { href: "/agency/pipeline", label: "지원자 관리", icon: icons.board },
    ],
  },
  {
    label: "자동화",
    items: [
      { href: "/agency/ax", label: "업무 자동화", icon: icons.flow },
      { href: "/agency/content", label: "콘텐츠 제작", icon: icons.film },
    ],
  },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg aria-hidden="true" className="agency-console-nav__icon" viewBox="0 0 24 24">
      <path d={d} />
    </svg>
  );
}

const isApiMode = process.env.NEXT_PUBLIC_BACKEND_MODE === "api";

export function AgencyConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useDemo();
  const { profile, status } = useAgencySession();
  const agency = state.agencies.find((item) => item.id === state.activeAgencyId);
  const isLoginRoute = pathname === "/agency/login";

  useEffect(() => {
    if (isApiMode && !isLoginRoute && status === "ready" && !profile) {
      router.replace("/agency/login");
    }
  }, [isLoginRoute, status, profile, router]);

  if (isLoginRoute) return <>{children}</>;

  return (
    <div className="agency-console-shell">
      <a className="skip-link" href="#agency-console-main">본문으로 건너뛰기</a>
      <aside className="agency-console-sidebar" aria-label="기획사 메뉴">
        <Link href="/" className="agency-console-brand" aria-label="ENTER—AX 홈">ENTER—AX</Link>
        <div className="agency-console-workspace">
          <span aria-hidden="true">{(agency?.name ?? "W").slice(0, 1)}</span>
          <div>
            <strong>{agency?.name ?? "워크스페이스"}</strong>
            <small>{agency?.department ?? ""}</small>
          </div>
        </div>
        <nav className="agency-console-nav" aria-label="기획사 워크스페이스">
          {navigationGroups.map((group) => (
            <section className="agency-console-nav__group" key={group.label} aria-labelledby={`agency-nav-${group.label}`}>
              <h2 className="agency-console-nav__label" id={`agency-nav-${group.label}`}>{group.label}</h2>
              <div className="agency-console-nav__items">
                {group.items.map((item) => (
                  <Link
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="agency-console-nav__link"
                    href={item.href}
                    key={item.href}
                  >
                    <NavIcon d={item.icon} />
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
          <section className="agency-console-nav__group" aria-labelledby="agency-nav-soon">
            <h2 className="agency-console-nav__label" id="agency-nav-soon">분석</h2>
            <div className="agency-console-nav__items">
              <div className="agency-console-nav__planned" aria-label="캠페인, 준비 중">
                <span>캠페인</span>
                <span className="agency-console-nav__status">준비 중</span>
              </div>
              <div className="agency-console-nav__planned" aria-label="리포트, 준비 중">
                <span>리포트</span>
                <span className="agency-console-nav__status">준비 중</span>
              </div>
            </div>
          </section>
        </nav>
        <Link className="agency-console-home-link" href="/talent">지원자 커뮤니티 보기 →</Link>
      </aside>
      <div className="agency-console-frame">
        <header className="agency-console-topbar">
          <span className="agency-console-topbar__title">{agency?.name ?? "워크스페이스"}</span>
          <div className="agency-console-topbar__actions">
            <AccountBadge />
            <DemoBadge />
            <RoleSwitcher />
          </div>
        </header>
        <main id="agency-console-main" className="agency-console-main" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
