import { test, expect } from '@playwright/test';
import { getSiteConfig, signInAsAdmin, createNewScript, findTestScript, getAdminEmail } from '@utils/test-helpers';
import { apiClient } from '@utils/api-client';

test('testScript', async ({ page }) => {
  const site = getSiteConfig();
  const baseUrl = site.url;

  await signInAsAdmin(page, site);

  const api = apiClient(site);
  const adminEmail = await getAdminEmail(api);

  let scriptId = await findTestScript(api);
  if (!scriptId) {
    scriptId = await createNewScript(api, site);
    console.log("Created new script: " + scriptId);
  }

  console.log('Script ID: ', scriptId);

  // Go to script edit page
  await page.goto(`${baseUrl}/designer/scripts/${scriptId}/builder`);

  await page.getByRole('button', { name: ' Run' }).click();

  await expect(page.locator('.output')).toContainText(adminEmail);

});