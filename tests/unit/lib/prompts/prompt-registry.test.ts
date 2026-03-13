import { describe, it, expect, beforeEach } from "vitest";
import {
  registerPrompt,
  getPrompt,
  updatePrompt,
  resetPrompt,
  saveVersion,
  activateVersion,
  deleteVersion,
  getAllPrompts,
} from "@/lib/prompts/prompt-registry";

// Use unique keys per suite to avoid singleton state collisions
const KEY_A = "test_versioning_suite_a";
const KEY_B = "test_versioning_suite_b";
const DEFAULT_A = "Default content A";
const DEFAULT_B = "Default content B";

beforeEach(() => {
  // Re-register is a no-op if key already exists — reset content manually
  registerPrompt({
    key: KEY_A,
    name: "Test Prompt A",
    description: "Used by versioning tests",
    category: "Test",
    defaultContent: DEFAULT_A,
  });
  registerPrompt({
    key: KEY_B,
    name: "Test Prompt B",
    description: "Used by versioning tests",
    category: "Test",
    defaultContent: DEFAULT_B,
  });

  // Clean state between tests: reset content and wipe all versions
  resetPrompt(KEY_A);
  resetPrompt(KEY_B);
  // Delete any versions that may have been saved by a prior test
  const all = getAllPrompts();
  for (const p of all) {
    if (p.key === KEY_A || p.key === KEY_B) {
      for (const v of [...p.versions]) {
        deleteVersion(p.key, v.id);
      }
    }
  }
});

// ─── saveVersion ──────────────────────────────────────────────────────────────

describe("saveVersion", () => {
  it("creates a version, updates content, and sets activeVersionId", () => {
    const version = saveVersion(KEY_A, "v1.0", "New content v1");
    expect(version).not.toBeNull();
    expect(version?.label).toBe("v1.0");
    expect(version?.content).toBe("New content v1");
    expect(version?.id).toBeTruthy();
    expect(version?.createdAt).toBeTruthy();

    expect(getPrompt(KEY_A)).toBe("New content v1");

    const entry = getAllPrompts().find((p) => p.key === KEY_A)!;
    expect(entry.versions).toHaveLength(1);
    expect(entry.activeVersionId).toBe(version?.id);
  });

  it("returns null for an unknown key", () => {
    const result = saveVersion("nonexistent_key_xyz", "v1", "content");
    expect(result).toBeNull();
  });

  it("accumulates multiple versions in order", () => {
    saveVersion(KEY_A, "v1.0", "content v1");
    saveVersion(KEY_A, "v2.0", "content v2");
    const entry = getAllPrompts().find((p) => p.key === KEY_A)!;
    expect(entry.versions).toHaveLength(2);
    expect(entry.versions[0].label).toBe("v1.0");
    expect(entry.versions[1].label).toBe("v2.0");
    expect(entry.activeVersionId).toBe(entry.versions[1].id);
  });
});

// ─── activateVersion ──────────────────────────────────────────────────────────

describe("activateVersion", () => {
  it("switches content and activeVersionId to the chosen version", () => {
    const v1 = saveVersion(KEY_A, "v1.0", "content v1")!;
    saveVersion(KEY_A, "v2.0", "content v2"); // v2 becomes active

    const ok = activateVersion(KEY_A, v1.id);
    expect(ok).toBe(true);
    expect(getPrompt(KEY_A)).toBe("content v1");

    const entry = getAllPrompts().find((p) => p.key === KEY_A)!;
    expect(entry.activeVersionId).toBe(v1.id);
  });

  it("returns false for an unknown key", () => {
    expect(activateVersion("nonexistent_key_xyz", "any-id")).toBe(false);
  });

  it("returns false for an unknown versionId", () => {
    saveVersion(KEY_A, "v1.0", "content");
    expect(activateVersion(KEY_A, "bogus-version-id")).toBe(false);
  });
});

// ─── deleteVersion ────────────────────────────────────────────────────────────

describe("deleteVersion", () => {
  it("removes the version from the array", () => {
    const v1 = saveVersion(KEY_A, "v1.0", "content v1")!;
    saveVersion(KEY_A, "v2.0", "content v2");

    const ok = deleteVersion(KEY_A, v1.id);
    expect(ok).toBe(true);

    const entry = getAllPrompts().find((p) => p.key === KEY_A)!;
    expect(entry.versions).toHaveLength(1);
    expect(entry.versions[0].label).toBe("v2.0");
  });

  it("clears activeVersionId when deleting the active version", () => {
    const v1 = saveVersion(KEY_A, "v1.0", "content v1")!;
    activateVersion(KEY_A, v1.id);

    deleteVersion(KEY_A, v1.id);

    const entry = getAllPrompts().find((p) => p.key === KEY_A)!;
    expect(entry.activeVersionId).toBeNull();
    // Content is preserved — no disruption to the running prompt
    expect(entry.content).toBe("content v1");
  });

  it("preserves activeVersionId when deleting a non-active version", () => {
    const v1 = saveVersion(KEY_A, "v1.0", "content v1")!;
    const v2 = saveVersion(KEY_A, "v2.0", "content v2")!;
    activateVersion(KEY_A, v2.id);

    deleteVersion(KEY_A, v1.id);

    const entry = getAllPrompts().find((p) => p.key === KEY_A)!;
    expect(entry.activeVersionId).toBe(v2.id);
    expect(entry.content).toBe("content v2");
  });

  it("returns false for an unknown key", () => {
    expect(deleteVersion("nonexistent_key_xyz", "any-id")).toBe(false);
  });

  it("returns false for an unknown versionId", () => {
    saveVersion(KEY_A, "v1.0", "content");
    expect(deleteVersion(KEY_A, "bogus-version-id")).toBe(false);
  });
});

// ─── updatePrompt sets activeVersionId to null ───────────────────────────────

describe("updatePrompt", () => {
  it("clears activeVersionId when live-saving content", () => {
    const v1 = saveVersion(KEY_A, "v1.0", "content v1")!;
    expect(
      getAllPrompts().find((p) => p.key === KEY_A)!.activeVersionId,
    ).toBe(v1.id);

    updatePrompt(KEY_A, "live edited content");

    const entry = getAllPrompts().find((p) => p.key === KEY_A)!;
    expect(entry.activeVersionId).toBeNull();
    expect(entry.content).toBe("live edited content");
  });
});

// ─── resetPrompt sets activeVersionId to null ─────────────────────────────────

describe("resetPrompt", () => {
  it("clears activeVersionId and restores defaultContent", () => {
    saveVersion(KEY_A, "v1.0", "some override");

    resetPrompt(KEY_A);

    const entry = getAllPrompts().find((p) => p.key === KEY_A)!;
    expect(entry.activeVersionId).toBeNull();
    expect(entry.content).toBe(DEFAULT_A);
  });
});
