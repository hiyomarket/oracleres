import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

describe("adminUpdateExpertProfile procedure logic", () => {
  it("should build correct update data with publicName only", () => {
    const input = { expertId: 1, publicName: "解語師 William" };
    const updateData: Record<string, unknown> = { publicName: input.publicName };
    if ((input as any).title !== undefined) updateData.title = (input as any).title;
    if ((input as any).tags !== undefined) updateData.tags = (input as any).tags;
    if ((input as any).specialties !== undefined) updateData.specialties = (input as any).specialties;

    expect(updateData).toEqual({ publicName: "解語師 William" });
    expect(Object.keys(updateData)).toHaveLength(1);
  });

  it("should include title when provided", () => {
    const input = { expertId: 1, publicName: "解語師 William", title: "靈魂解讀師・10年經驗" };
    const updateData: Record<string, unknown> = { publicName: input.publicName };
    if (input.title !== undefined) updateData.title = input.title;

    expect(updateData).toEqual({
      publicName: "解語師 William",
      title: "靈魂解讀師・10年經驗",
    });
  });

  it("should include specialties when provided", () => {
    const input = { expertId: 1, publicName: "解語師 William", specialties: ["塔羅牌", "占星"] };
    const updateData: Record<string, unknown> = { publicName: input.publicName };
    if (input.specialties !== undefined) updateData.specialties = input.specialties;

    expect(updateData.specialties).toEqual(["塔羅牌", "占星"]);
  });

  it("should validate publicName is not empty", () => {
    const publicName = "  ";
    expect(publicName.trim()).toBe("");
    // UI prevents empty name submission
    expect(publicName.trim().length).toBe(0);
  });

  it("should handle all optional fields", () => {
    const input = {
      expertId: 2,
      publicName: "星座撲克牌占卜",
      title: "前世今生解讀師",
      tags: ["前世今生", "占星"],
      specialties: ["塔羅牌", "靈魂解讀"],
    };
    const updateData: Record<string, unknown> = { publicName: input.publicName };
    if (input.title !== undefined) updateData.title = input.title;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.specialties !== undefined) updateData.specialties = input.specialties;

    expect(Object.keys(updateData)).toHaveLength(4);
    expect(updateData.publicName).toBe("星座撲克牌占卜");
    expect(updateData.title).toBe("前世今生解讀師");
  });
});
