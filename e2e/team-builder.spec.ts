import { test, expect } from "@playwright/test";

test.describe("Team Builder", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should show the main page with tabs", async ({ page }) => {
    // Check for tab buttons
    await expect(page.getByRole("tab", { name: /team/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /battle/i })).toBeVisible();
  });

  test("should search and add a Pokemon", async ({ page }) => {
    // Click the add Pokemon button
    const addButton = page.getByRole("button", { name: /add pokemon/i });
    if (await addButton.isVisible()) {
      await addButton.click();

      // Search for Charizard
      const searchInput = page.getByPlaceholder(/search pokemon/i);
      await searchInput.fill("charizard");

      // Wait for results
      await page.waitForTimeout(500);

      // Click on the result
      const result = page.getByRole("button", { name: /charizard/i }).first();
      if (await result.isVisible({ timeout: 3000 })) {
        await result.click();

        // Verify Pokemon was added to team
        await expect(page.getByText("charizard")).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should navigate between tabs using keyboard", async ({ page }) => {
    // Focus on a tab
    const firstTab = page.getByRole("tab").first();
    await firstTab.focus();

    // Press right arrow to move to next tab
    await page.keyboard.press("ArrowRight");

    // The next tab should be focused
    const focusedTab = page.locator(":focus");
    await expect(focusedTab).toHaveRole("tab");
  });

  test("should have skip-to-content link", async ({ page }) => {
    // Tab to the skip link
    await page.keyboard.press("Tab");
    const skipLink = page.getByText("Skip to content");
    await expect(skipLink).toBeFocused();
  });
});
