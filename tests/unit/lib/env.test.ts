import { describe, it, expect } from "vitest";

describe("env validation", () => {
  it("should accept valid NODE_ENV values", () => {
    expect(["development", "production", "test"]).toContain(
      process.env.NODE_ENV ?? "test",
    );
  });
});
