"use client";

import "@xyflow/react/dist/style.css";
import { useMemo, useState } from "react";

import "@/components/agency/workflow-editor/workflow-editor.css";
import { DocumentAnalysisPanel } from "@/components/agency/DocumentAnalysisPanel";
import { WorkflowEditor } from "@/components/agency/workflow-editor/WorkflowEditor";
import { useAgencySession } from "@/features/agency/AgencySessionProvider";
import { useDemo } from "@/features/demo/DemoProvider";
import type { WorkflowAppContext } from "@/features/workflows/executor";
import { workflowPermissionsFor } from "@/features/workflows/permissions";

type Tab = "workflows" | "documents";
const isApiMode = process.env.NEXT_PUBLIC_BACKEND_MODE === "api";

export default function AxPage() {
  const { state, moveTalentToReview, createCommunityPost } = useDemo();
  const { profile } = useAgencySession();
  const [tab, setTab] = useState<Tab>("workflows");
  const app: WorkflowAppContext = useMemo(
    () => ({ talents: state.talents, moveTalentToReview, createCommunityPost }),
    [state.talents, moveTalentToReview, createCommunityPost],
  );
  const permissions = workflowPermissionsFor(profile?.role ?? (isApiMode ? "viewer" : "demo"));

  return (
    <div className="ax-page-v2">
      <header className="ax-head">
        <div>
          <p className="ax-head__crumb">자동화</p>
          <h1>업무 자동화</h1>
        </div>
        <div aria-label="워크스페이스 보기" className="ax-tabs" role="tablist">
          <button aria-selected={tab === "workflows"} className="ax-tabs__tab" role="tab" type="button" onClick={() => setTab("workflows")}>
            자동화
          </button>
          <button aria-selected={tab === "documents"} className="ax-tabs__tab" role="tab" type="button" onClick={() => setTab("documents")}>
            문서 분석
          </button>
        </div>
      </header>

      {tab === "workflows" ? <WorkflowEditor app={app} permissions={permissions} /> : <DocumentAnalysisPanel />}
    </div>
  );
}
