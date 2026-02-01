import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("landing page loads and has sign-in link", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Log/);
    const signInLink = page.getByRole("link", { name: /log in/i });
    await expect(signInLink).toBeVisible();
  });

  test("unauthenticated user is redirected from app routes", async ({ page }) => {
    await page.goto("/timeline");
    // Should redirect to sign-in
    await page.waitForURL(/sign-in/);
    await expect(page.locator("input[type='email']")).toBeVisible();
  });

  test("sign-in page renders correctly", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("sign-up page renders correctly", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });
});
