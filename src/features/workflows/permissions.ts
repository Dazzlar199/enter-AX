import type { AgencyProfile } from "@/features/agency/session-client";

export type WorkflowRole = AgencyProfile["role"] | "demo";

export type WorkflowPermissions = {
  canEdit: boolean;
  canExecute: boolean;
  canApprove: boolean;
  canManageCustomSteps: boolean;
};

export function workflowPermissionsFor(role: WorkflowRole): WorkflowPermissions {
  if (role === "viewer") {
    return { canEdit: false, canExecute: false, canApprove: false, canManageCustomSteps: false };
  }
  if (role === "member") {
    return { canEdit: false, canExecute: true, canApprove: false, canManageCustomSteps: false };
  }
  return { canEdit: true, canExecute: true, canApprove: true, canManageCustomSteps: true };
}
