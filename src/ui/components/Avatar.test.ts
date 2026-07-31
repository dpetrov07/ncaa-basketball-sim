import { describe, expect, it } from "vitest";
import { avatarConfig } from "./Avatar";

describe("player avatars", () => {
  it("is stable for a player id and varied across a roster", () => {
    expect(avatarConfig("p-1-1")).toEqual(avatarConfig("p-1-1"));
    const portraits = new Set(["p-1-1", "p-1-2", "p-1-3", "p-1-4", "p-1-5"].map((id) => JSON.stringify(avatarConfig(id))));
    expect(portraits.size).toBeGreaterThan(2);
  });
});
