"use client";

import Link from "next/link";

import { useDemo } from "@/features/demo/DemoProvider";

export function RoleSwitcher() {
  const { setRole } = useDemo();

  return (
    <div className="role-switcher" aria-label="역할 전환">
      <Link href="/talent" onClick={() => setRole("talent")}>지원자 포털</Link>
      <Link href="/agency" onClick={() => setRole("agency")}>엔터사 콘솔</Link>
    </div>
  );
}
