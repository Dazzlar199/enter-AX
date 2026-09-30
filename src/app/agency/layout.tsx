import type { ReactNode } from "react";

import { AgencyConsoleShell } from "@/components/agency/console/AgencyConsoleShell";
import { AgencySessionProvider } from "@/features/agency/AgencySessionProvider";

import "./agency-console.css";

export default function AgencyLayout({ children }: { children: ReactNode }) {
  return (
    <AgencySessionProvider>
      <AgencyConsoleShell>{children}</AgencyConsoleShell>
    </AgencySessionProvider>
  );
}
