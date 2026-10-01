import { z } from "zod";

import { starterWorkflows } from "./templates";
import { workflowDefinitionSchema, type WorkflowDefinition } from "./types";

/** Persistence boundary for workflows. Swap for a server-backed store once agency sign-in exists. */
export interface WorkflowStore {
  list(): WorkflowDefinition[];
  save(workflow: WorkflowDefinition): void;
  remove(id: string): void;
}

const STORAGE_KEY = "enter-ax.workflows.v1";

export class LocalWorkflowStore implements WorkflowStore {
  list(): WorkflowDefinition[] {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return starterWorkflows();
      const parsed = z.array(workflowDefinitionSchema).safeParse(JSON.parse(raw));
      return parsed.success && parsed.data.length > 0 ? parsed.data : starterWorkflows();
    } catch {
      return starterWorkflows();
    }
  }

  private write(workflows: WorkflowDefinition[]) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
    } catch {
      // Storage can be unavailable (private mode, quota). The editor keeps working in memory.
    }
  }

  save(workflow: WorkflowDefinition): void {
    const current = this.list();
    const exists = current.some((entry) => entry.id === workflow.id);
    this.write(exists ? current.map((entry) => (entry.id === workflow.id ? workflow : entry)) : [...current, workflow]);
  }

  remove(id: string): void {
    this.write(this.list().filter((entry) => entry.id !== id));
  }
}
