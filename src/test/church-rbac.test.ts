import { describe, it, expect } from "vitest";
import {
  resolveUserPages,
  canAccessPage,
  canMessageTarget,
  canManageMember,
  canAssignRole,
  canRecordAttendance,
  validateMemberCreate,
  isCellScopedRole,
  canManageEvents,
  canManageDepartments,
  resolveEffectivePages,
  canAccessPageWithAbilities,
  canUploadMedia,
  canEditCellAttendance,
  canApproveMedia,
  isPrivilegedSelfUpdate,
} from "../../server/rbac.js";
import { getPresetAbilitiesForName } from "../../server/department-abilities.js";
import { canEditMemberProfile } from "@/lib/rbac";
import type { Member } from "@/types/church";

const cellLeader = {
  id: "cl1",
  role: "Cell Leader" as const,
  cell_id: "cell-a",
  fellowship_id: "fel-1",
};

const subCellLeader = {
  id: "scl1",
  role: "Sub-cell Leader" as const,
  cell_id: "cell-a",
  fellowship_id: "fel-1",
};

const cellMember = {
  id: "cm1",
  role: "Cell Member" as const,
  cell_id: "cell-a",
  fellowship_id: "fel-1",
};

const otherCellLeader = {
  id: "cl2",
  role: "Cell Leader" as const,
  cell_id: "cell-b",
  fellowship_id: "fel-1",
};

describe("RBAC", () => {
  it("Senior Pastor has all pages", () => {
    const pages = resolveUserPages("Senior Pastor");
    expect(pages).toContain("finances");
    expect(pages).toContain("settings");
  });

  it("Sub-cell Leader can submit reports", () => {
    expect(canAccessPage("Sub-cell Leader", "report-submissions")).toBe(true);
  });

  it("Admin with full access gets extended pages", () => {
    const pages = resolveUserPages("Admin", "full");
    expect(pages).toContain("reports");
    expect(pages).toContain("departments");
  });

  it("Cell Member cannot access finances", () => {
    expect(canAccessPage("Cell Member", "finances")).toBe(false);
  });

  it("Associate Pastor cannot message Senior Pastor", () => {
    expect(
      canMessageTarget(
        { id: "1", role: "Associate Pastor", fellowship_id: null, cell_id: null },
        { id: "2", role: "Senior Pastor", fellowship_id: null, cell_id: null }
      )
    ).toBe(false);
  });

  it("Media preset grants upload_media not role name", () => {
    const preset = getPresetAbilitiesForName("Media & Technical");
    expect(preset).toContain("upload_media");
    expect(preset).toContain("access_media");
  });

  it("department abilities extend nav pages for Church Member", () => {
    const pages = resolveEffectivePages("Church Member", "standard", ["access_media", "upload_media"]);
    expect(pages).toContain("media");
    expect(canAccessPageWithAbilities("Church Member", "media", "standard", ["access_media"])).toBe(true);
    expect(canAccessPageWithAbilities("Church Member", "finances", "standard", ["access_media"])).toBe(false);
  });

  it("only pastors and admin can manage departments", () => {
    expect(canManageDepartments("Senior Pastor")).toBe(true);
    expect(canManageDepartments("Associate Pastor")).toBe(true);
    expect(canManageDepartments("Admin")).toBe(true);
    expect(canManageDepartments("Fellowship Leader")).toBe(false);
    expect(canManageDepartments("Cell Leader")).toBe(false);
  });

  it("Cell Leader can manage cell members below their rank", () => {
    expect(canManageMember(cellLeader, cellMember)).toBe(true);
    expect(canManageMember(cellLeader, subCellLeader)).toBe(true);
  });

  it("Cell Leader cannot manage other cell leaders or themselves", () => {
    expect(canManageMember(cellLeader, otherCellLeader)).toBe(false);
    expect(canManageMember(cellLeader, { ...cellLeader, id: cellLeader.id })).toBe(false);
  });

  it("any member can edit their own profile", () => {
    const self = {
      id: "cm1",
      name: "Member",
      email: "m@test.com",
      phone: "",
      role: "Cell Member" as const,
      cellId: "cell-a",
      fellowshipId: "fel-1",
      departmentIds: [],
      active: true,
      joinedAt: "2024-01-01",
    };
    expect(canEditMemberProfile(self, self)).toBe(true);
    expect(canEditMemberProfile(cellLeader, cellMember)).toBe(true);
    expect(canEditMemberProfile(cellMember, otherCellLeader as unknown as Member)).toBe(false);
  });

  it("self-update rejects privileged fields", () => {
    expect(isPrivilegedSelfUpdate({ role: "Admin" })).toBe(true);
    expect(isPrivilegedSelfUpdate({ cellId: "x" })).toBe(true);
    expect(isPrivilegedSelfUpdate({ name: "Jane" })).toBe(false);
  });

  it("Cell Leader can only assign lower roles", () => {
    expect(canAssignRole("Cell Leader", "Cell Member")).toBe(true);
    expect(canAssignRole("Cell Leader", "Fellowship Leader")).toBe(false);
    expect(canAssignRole("Cell Leader", "Cell Leader")).toBe(false);
  });

  it("Cell Leader can record cell attendance for own cell only", () => {
    expect(canRecordAttendance(cellLeader, { type: "cell", cellId: "cell-a" })).toBe(true);
    expect(canRecordAttendance(cellLeader, { type: "cell", cellId: "cell-b" })).toBe(false);
    expect(canRecordAttendance(cellLeader, { type: "service", cellId: null })).toBe(false);
  });

  it("Cell Leader must add members to own cell", () => {
    const ok = validateMemberCreate(cellLeader, {
      role: "Cell Member",
      cellId: "cell-a",
      fellowshipId: "fel-1",
    });
    expect(ok.ok).toBe(true);
    expect(ok.cellId).toBe("cell-a");

    const bad = validateMemberCreate(cellLeader, {
      role: "Cell Member",
      cellId: "cell-b",
      fellowshipId: "fel-1",
    });
    expect(bad.ok).toBe(false);
  });

  it("Cell Leader can message same-cell members and admins", () => {
    expect(canMessageTarget(cellLeader, cellMember)).toBe(true);
    expect(
      canMessageTarget(cellLeader, { id: "admin", role: "Admin", cell_id: null, fellowship_id: null })
    ).toBe(true);
    expect(canMessageTarget(cellLeader, otherCellLeader)).toBe(false);
  });

  it("identifies cell-scoped roles", () => {
    expect(isCellScopedRole("Cell Leader")).toBe(true);
    expect(isCellScopedRole("Fellowship Leader")).toBe(false);
  });

  it("Cell Leader can view events but not create them", () => {
    expect(canManageEvents("Cell Leader")).toBe(false);
    expect(canManageEvents("Sub-cell Leader")).toBe(false);
    expect(canManageEvents("Fellowship Leader")).toBe(true);
    expect(canAccessPage("Cell Leader", "events")).toBe(true);
  });

  it("Cell Leader can edit own cell attendance", () => {
    expect(
      canEditCellAttendance(
        { role: "Cell Leader", cell_id: "c1", fellowship_id: "f1" },
        { type: "cell", cell_id: "c1", fellowship_id: "f1" }
      )
    ).toBe(true);
    expect(
      canEditCellAttendance(
        { role: "Cell Leader", cell_id: "c1", fellowship_id: "f1" },
        { type: "cell", cell_id: "c2", fellowship_id: "f1" }
      )
    ).toBe(false);
    expect(canAccessPage("Cell Leader", "media")).toBe(true);
    expect(canApproveMedia("Cell Leader")).toBe(false);
  });
});
