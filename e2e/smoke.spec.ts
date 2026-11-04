import { test, expect } from "@playwright/test";

test.describe("public pages smoke", () => {
  test("landing page renders hero and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /master coding interviews/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /start for free/i }).first(),
    ).toBeVisible();
  });

  test("login page renders the credentials form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    // exact:true so this matches the password field, not the "Show password" toggle
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    // exact: the page also has a "Sign in with a passkey" button
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  });

  test("register page renders the signup form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create account/i }),
    ).toBeVisible();
  });

  test("protected routes redirect anonymous users to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
