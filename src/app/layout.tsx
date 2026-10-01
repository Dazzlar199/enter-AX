import type { Metadata, Viewport } from "next";

import { DemoProvider } from "@/features/demo/DemoProvider";

import "./globals.css";
import "@/styles/studio.css";
import "@/styles/app-pages.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://dazzlingstudio-d423acmci-dazzlars-projects.vercel.app"),
  title: {
    default: "Enter-AX | 엔터테인먼트 올인원 AX 플랫폼",
    template: "%s | Enter-AX",
  },
  description: "글로벌 오디션 지원부터 A&R 데모 청음, 숏폼 홍보 자동화까지 — 엔터테인먼트 비즈니스를 위한 차세대 인텔리전스 워크스페이스.",
  applicationName: "Enter-AX",
  keywords: ["엔터테인먼트 AX", "오디션", "K-POP", "A&R", "숏폼 자동화", "캐스팅"],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08090d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
