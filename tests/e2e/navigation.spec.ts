import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("main page loads and shows Nexus HUD layout", async ({ page }) => {
    await page.goto("/");

    // The page should contain "Nexus" somewhere in the content
    // (either in the heading, title, or HUD layout)
    const content = await page.textContent("body");
    expect(content).toContain("Nexus");
  });

  test('login page loads and shows "Sign in with Zendesk" button', async ({
    page,
  }) => {
    await page.goto("/login");

    const signInButton = page.getByRole("button", {
      name: /sign in with zendesk/i,
    });
    await expect(signInButton).toBeVisible();
  });
});
