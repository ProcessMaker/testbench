import { test, expect } from '@playwright/test';
import { getSiteConfig, setSiteConfig, signInAsAdmin, navigateToAdminUserEdit } from '@utils/test-helpers';

test('Get bearer token for site', async ({ page }) => {
  const site = getSiteConfig();
  const baseUrl = site.url;

  await signInAsAdmin(page, site);
  await navigateToAdminUserEdit(page, baseUrl);
  await page.getByRole('tab', { name: 'API Tokens' }).click();
  await page.getByRole('button', { name: 'New Token' }).click();
  await page.getByRole('textbox', { name: 'Generated Token' }).click();

  // Extract the text from the generated token input
  const generatedToken = await page.getByRole('textbox', { name: 'Generated Token' }).inputValue();
  console.log('Generated Token: ', generatedToken);

  // Assert it is a string longer than 100 characters
  expect(generatedToken.length).toBeGreaterThan(100);

  // Save the generated token to the site object
  site.bearerToken = generatedToken;

  // Save the sites object to the file
  setSiteConfig(site);
});