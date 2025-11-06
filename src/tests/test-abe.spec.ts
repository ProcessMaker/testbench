import { test, expect } from '@playwright/test';
import { getSiteConfig, signInAsAdmin, importProcess } from '@utils/test-helpers';
import path from 'path';
import { replyToMail } from '../actions/reply-to-mail';

test('testActionsByEmail', async ({ page }) => {

  // Sign in as admin
  const site = getSiteConfig();
  const baseUrl = site.url;
  await signInAsAdmin(page, site);
  console.log('Importing process');
  await importProcess(page, baseUrl, path.join(__dirname, '..', 'processes', 'abe.json'));

  const processId = page.url().split('/').pop();

  console.log('Process ID: ', processId);

  // go to /logout and wait for Sign In button to 
  await page.goto(`${baseUrl}/logout`);
  await page.getByRole('button', { name: 'Sign In' }).waitFor({ state: 'visible' });

  const webEntryUrl = `${baseUrl}/webentry/${processId}/node_1`;
  await page.goto(webEntryUrl);

  // Click on the  Send Action By Email  button
  console.log('Clicking on Send Action By Email button');
  await page.getByRole('button', { name: 'Send Action By Email' }).click();

  // Wait 8 seconds before replying to mail
  console.log('Waiting 8 seconds before replying to mail');
  await page.waitForTimeout(8000);

  // Call replyToMail up to 3 times with 8 second waits between tries
  let repliedCount = 0;
  const maxTries = 3;
  const waitTime = 8000; // 8 seconds

  for (let attempt = 1; attempt <= maxTries; attempt++) {
    console.log(`Calling replyToMail (attempt ${attempt}/${maxTries}) to process email`);
    repliedCount = await replyToMail({ site });

    if (repliedCount > 0) {
      console.log(`✅ Successfully replied to ${repliedCount} email(s) on attempt ${attempt}`);
      break;
    }

    if (attempt < maxTries) {
      console.log(`No replies found. Waiting ${waitTime}ms before next attempt...`);
      await page.waitForTimeout(waitTime);
    }
  }

  // Fail the test if no replies after 3 tries
  expect(repliedCount).toBeGreaterThan(0);

  // Expect the page to have the text "Answer: yes". Wait 5 minutes for this.
  console.log('Waiting for "Answer: yes" to be visible');
  await page.getByText('Answer: yes').waitFor({
    state: 'visible',
    timeout: 300000 // 5 minutes
  });
});
