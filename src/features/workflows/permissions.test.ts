import { describe, expect, it } from "vitest";

import { workflowPermissionsFor } from "./permissions";

describe("workflow permissions", () => {
  it("keeps view-only staff from changing, running, or approving work", () => {
    expect(workflowPermissionsFor("viewer")).toEqual({
      canEdit: false,
      canExecute: false,
      canApprove: false,
      canManageCustomSteps: false,
    });
  });

  it("lets members run published work without changing or approving it", () => {
    expect(workflowPermissionsFor("member")).toEqual({
      canEdit: false,
      canExecute: true,
      canApprove: false,
      canManageCustomSteps: false,
    });
  });

  it.each(["owner", "admin"] as const)("gives %s full workflow controls", (role) => {
    expect(workflowPermissionsFor(role)).toEqual({
      canEdit: true,
      canExecute: true,
      canApprove: true,
      canManageCustomSteps: true,
    });
  });

  it("keeps the explicit demo workspace editable", () => {
    expect(workflowPermissionsFor("demo").canEdit).toBe(true);
  });
});
