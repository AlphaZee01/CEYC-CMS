import { describe, it, expect } from "vitest";
import { resolveUserPages, canAccessPage, canMessageTarget } from "../../server/rbac.js";

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
});
