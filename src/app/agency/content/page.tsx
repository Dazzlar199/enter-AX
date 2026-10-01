"use client";

import { ContentWorkflow } from "@/components/agency/ContentWorkflow";
import { useDemo } from "@/features/demo/DemoProvider";

export default function ContentPage() {
  const { createContentJob, transitionContentJob } = useDemo();
  return <div className="workspace-page"><ContentWorkflow onCreate={createContentJob} onTransition={transitionContentJob} /></div>;
}
