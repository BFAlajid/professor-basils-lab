import { test, expect } from "@playwright/test";

test.describe("Wild Encounters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should show wild tab with region map", async ({ page }) => {
    // First add a Pokemon to the team
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

    // Navigate to wild tab
    const wildTab = page.getByRole("tab", { name: /wild/i });
    await wildTab.click();

    // Should show wild encounters heading
    await expect(page.getByText(/wild encounters/i)).toBeVisible({ timeout: 5000 });
  });

  test("should show PC Box toggle", async ({ page }) => {
    // Add a Pokemon first
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

    // Navigate to wild tab
    const wildTab = page.getByRole("tab", { name: /wild/i });
    await wildTab.click();

    // PC Box button should be visible
    await expect(page.getByRole("button", { name: /pc box/i })).toBeVisible({ timeout: 5000 });

    // Day Care button should be visible
    await expect(page.getByRole("button", { name: /day care/i })).toBeVisible({ timeout: 5000 });
  });
});
