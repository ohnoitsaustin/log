import { test, expect } from "@playwright/test";

/**
 * E2E: full create → list → detail → export flow.
 *
 * Requires env vars: TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_USER_PASSPHRASE
 * These can be set in .env.local (Playwright reads from process.env).
 */

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;
const passphrase = process.env.TEST_USER_PASSPHRASE;

test.describe("entry flow", () => {
  test.skip(!email || !password || !passphrase, "Test credentials not configured");

  test.beforeEach(async ({ page }) => {
    // Sign in
    await page.goto("/sign-in");
    await page.locator("input[type='email']").fill(email!);
    await page.locator("input[type='password']").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for redirect to app (unlock modal should appear)
    await page.waitForURL(/\/(timeline|new-entry|tags|settings)/, { timeout: 10_000 }).catch(() => {
      // May land on unlock modal at root app layout
    });

    // Handle passphrase unlock (or setup on first run)
    const unlockInput = page.locator("input[type='password']");
    if (await unlockInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await unlockInput.fill(passphrase!);
      // Click the unlock/set passphrase button
      const submitBtn = page.getByRole("button", { name: /unlock|set passphrase/i });
      await submitBtn.click();
      // Wait for app content to appear
      await page.waitForSelector("nav, aside", { timeout: 15_000 });
    }
  });

  test("create entry, see it on timeline, view detail", async ({ page }) => {
    const uniqueBody = `E2E test entry ${Date.now()}`;

    // Navigate to new entry
    await page.goto("/new-entry");
    await expect(page.getByText("New Entry")).toBeVisible();

    // Fill in body
    const textarea = page.locator("textarea");
    await textarea.fill(uniqueBody);

    // Select a mood (click the 4th emoji — Happy)
    await page.getByRole("button", { name: "Happy" }).click();

    // Add a tag
    const tagInput = page.locator("input[placeholder*='tag']");
    await tagInput.fill("e2e-test");
    await tagInput.press("Enter");

    // Save
    await page.getByRole("button", { name: /save entry/i }).click();

    // Should redirect to timeline
    await page.waitForURL(/\/timeline/, { timeout: 10_000 });

    // Find our entry on the timeline
    const entryCard = page.locator("a", { hasText: uniqueBody.slice(0, 30) });
    await expect(entryCard).toBeVisible({ timeout: 10_000 });

    // Click into detail
    await entryCard.click();
    await page.waitForURL(/\/timeline\/.+/);

    // Verify detail content
    await expect(page.getByText(uniqueBody)).toBeVisible();
    await expect(page.getByText("e2e-test")).toBeVisible();
  });

  test("export JSON downloads a file", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Export")).toBeVisible();

    // Click export JSON and expect a download
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /export json/i }).click(),
    ]);

    expect(download.suggestedFilename()).toBe("log-export.json");
  });
});
