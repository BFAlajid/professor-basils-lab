import { test, expect } from "@playwright/test";

test.describe("Battle System", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should show battle tab", async ({ page }) => {
    // Navigate to battle tab
    const battleTab = page.getByRole("tab", { name: /battle/i });
    await battleTab.click();

    // Should show a message about adding Pokemon (empty team)
    await expect(page.getByText(/add pokemon/i)).toBeVisible({ timeout: 5000 });
  });

  test("should show battle mode options", async ({ page }) => {
    // First add a Pokemon to the team so battle setup shows
    const addButton = page.getByRole("button", { name: /add pokemon/i });
    if (await addButton.isVisible({ timeout: 3000 })) {
      await addButton.click();
      const searchInput = page.getByPlaceholder(/search pokemon/i);
      await searchInput.fill("pikachu");
      await page.waitForTimeout(500);
      const result = page.getByRole("button", { name: /pikachu/i }).first();
      if (await result.isVisible({ timeout: 3000 })) {
        await result.click();
        await page.waitForTimeout(1000);
      }
    }

    // Navigate to battle tab
    const battleTab = page.getByRole("tab", { name: /battle/i });
    await battleTab.click();

    // Should show battle mode selection
    await expect(page.getByText(/battle mode/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/vs ai/i)).toBeVisible();
    await expect(page.getByText(/local pvp/i)).toBeVisible();
    await expect(page.getByText(/tournament/i)).toBeVisible();
    await expect(page.getByText(/online/i)).toBeVisible();
  });
});
