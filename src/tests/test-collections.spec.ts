import { test, expect } from '@playwright/test';
import { getSiteConfig, signInAsAdmin, importCollection, findLatestAsset, findLatestById } from '@utils/test-helpers';
import { apiClient } from '@utils/api-client';
import path from 'path';

test('testCollections', async ({ page }) => {
  const site = getSiteConfig();
  const baseUrl = site.url;
  await signInAsAdmin(page, site);
  console.log('Importing process');
  const api = apiClient(site);
  const startTime = new Date();

  const newCollectionId = await findLatestById(
    api,
    '/api/1.0/collections',
    async () => {
      await importCollection(page, baseUrl, path.join(__dirname, '..', 'processes', 'automated_test_collection.json'));
    }
  );

  expect(newCollectionId).not.toBeNull();

  const dataSource = await findLatestAsset(
    api,
    '/api/1.0/data_sources',
    'Automated Test Collection',
    startTime
  );
  expect(dataSource).not.toBeNull();

  await page.goto(`${baseUrl}/designer/data-sources/${dataSource.id}/resources/ListAll`);

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Escape regex special characters for both the template variable and baseUrl
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Allow for both {{__api_base_url__}} and the actual baseUrl since this changed recently in the collections package
  const escapedTemplate = escapeRegex('{{__api_base_url__}}');
  const escapedBaseUrl = escapeRegex(baseUrl);
  const escapedPath = escapeRegex(`/api/1.0/collections/${newCollectionId}/records`);
  const regexMatch = new RegExp(`(${escapedTemplate}|${escapedBaseUrl})${escapedPath}`);
  await expect(page.locator(`#formResource input`).first()).toHaveValue(regexMatch);

  const listAllEndpoint = dataSource.endpoints.ListAll;
  console.log('List all endpoint: ', listAllEndpoint);
  const listAllUrl = listAllEndpoint.url.replace('{{__api_base_url__}}', baseUrl);
  console.log('List all url: ', listAllUrl);
  const listAllResponse = await api.get(listAllUrl);

  // For each listAllResponse.data.data, get data.form_input_i as an array of strings
  const formInputs = listAllResponse.data.data.map((item: any) => item.data.form_input_1);
  console.log('Form inputs ', formInputs);

  // Assert  the formInputs array has 'abc' and '123'
  expect(formInputs).toContain('abc');
  expect(formInputs).toContain('123');
});
