import { Page, expect } from '@playwright/test';
import { apiClient } from './api-client';
import sitesData from '@sites.json';
import { Site, Sites } from '../models/Site';
import { AxiosInstance } from 'axios';
import fs from 'fs';

// Convert JSON data to Site instances
const sites: Sites = (sitesData as ConstructorParameters<typeof Site>[0][]).map(
    (data) => new Site(data)
);

/**
 * Get site configuration by name from environment variable or default
 */
export function getSiteConfig(): Site {
    const siteName = process.env.SITE_NAME;
    if (!siteName) {
        throw new Error('SITE_NAME environment variable is required');
    }

    const site = sites.find((s: Site) => s.name === siteName);
    if (!site) {
        throw new Error(`Site ${siteName} not found`);
    }

    return site;
}

export function setSiteConfig(site: Site): void {
    // Reload fresh config from sites.json to avoid overwriting changes from other processes
    const sitesJsonPath = 'sites.json';
    const freshSitesData = JSON.parse(fs.readFileSync(sitesJsonPath, 'utf-8'));
    const freshSites: Sites = (freshSitesData as ConstructorParameters<typeof Site>[0][]).map(
        (data) => new Site(data)
    );

    // Update the in-memory sites array with fresh data
    sites.length = 0;
    sites.push(...freshSites);

    // Find the existing site by name and replace it with the new site
    const index = sites.findIndex((s: Site) => s.name === site.name);
    if (index !== -1) {
        sites[index] = site;
    } else {
        // Throw an error if the site is not found
        throw new Error(`Site ${site.name} not found`);
    }
    // Convert Site instances to plain objects for JSON serialization
    const sitesData = sites.map((s: Site) => ({
        name: s.name,
        url: s.url,
        bearerToken: s.bearerToken,
        username: s.username,
        password: s.password,
        scriptExecutorId: s.scriptExecutorId,
        mailConfig: s.mailConfig,
        useTunnel: s.useTunnel,
        imapAccount: s.imapAccount,
        senderAccount: s.senderAccount,
        receiverAccount: s.receiverAccount,
    }));
    fs.writeFileSync(sitesJsonPath, JSON.stringify(sitesData, null, 2));
}

/**
 * Sign in to the application with admin credentials
 */
export async function signInAsAdmin(page: Page, site: Site): Promise<void> {
    const username = site.getUsername();
    const password = site.getPassword();

    await page.goto(`${site.url}/login`);
    await page.getByRole('textbox', { name: 'Username' }).click();
    await page.getByRole('textbox', { name: 'Username' }).fill(username);
    await page.getByRole('textbox', { name: 'Username' }).press('Tab');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for the page to load
    await page.locator('#userMenu').waitFor({ state: 'visible' });
}

/**
 * Navigate to the user edit page for admin user
 */
export async function navigateToAdminUserEdit(page: Page, baseUrl: string): Promise<void> {
    await page.goto(`${baseUrl}/admin/users/1/edit`);
}

const TEST_SCRIPT_TITLE = 'Automated Test Script';

export async function findTestScript(api: AxiosInstance): Promise<string> {
    const response = await api.get(`/api/1.0/scripts?filter=${TEST_SCRIPT_TITLE}`);
    const scripts = response.data.data;
    const script = scripts.find((script: any) => script.title === TEST_SCRIPT_TITLE);
    return script?.id ?? null;
}

/**
 * Create a new script
 */
export async function createNewScript(api: AxiosInstance, site: Site): Promise<string> {
    const payload = {
        "title": TEST_SCRIPT_TITLE,
        "script_executor_id": site.scriptExecutorId,
        "description": "test",
        "script_category_id": "1",
        "run_as_user_id": 1,
        "projects": [],
        "code": "<?php return ['admin_email' => $api->users()->getUserById(1)['email']];",
        "timeout": 60,
        "retry_attempts": 0,
        "retry_wait_time": 5
    }
    console.log("Creating new script: ", payload);
    const response = await api.post('/api/1.0/scripts', payload);
    console.log("createNewScript response: ", response.data);
    return response.data.id;
}

/**
 * Get the PHP script executor ID
 */
// export async function getPhpScriptExecutorId(api: AxiosInstance): Promise<string> {
//     const response = await api.get('/api/1.0/script-executors');
//     console.log("getPhpScriptExecutorId response: ", response.data);
//     const executors = response.data.data;

//     // Return the first executor where the name is "PHP Executor"
//     const phpExecutor = executors.find((executor: any) => executor.title === 'PHP Executor');
//     if (!phpExecutor) {
//         throw new Error('PHP Executor not found');
//     }
//     console.log("PHP Executor: ", phpExecutor.title);
//     return phpExecutor.id;
// }

/**
 * Get the admin email
 */
export async function getAdminEmail(api: AxiosInstance): Promise<string> {
    const response = await api.get(`/api/1.0/users/1`);
    return response.data?.email;
}

/**
 * Import a process
 * @param page - The Playwright page object
 * @param baseUrl - The base URL of the site
 * @param processFile - The path to the process file to import
 */
export async function importProcess(page: Page, baseUrl: string, filePath: string): Promise<void> {
    await page.goto(`${baseUrl}/processes/import`);

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Select file from computer').click();
    const fileChooser = await fileChooserPromise;
    fileChooser.setFiles(filePath);

    // The import button is disable by default. Wait up to 3 minutes for it to be enabled
    await expect(page.getByRole('button', { name: 'Import' })).toBeEnabled({ timeout: 180_000 });

    await page.getByRole('button', { name: 'Import' }).click();

    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page).toHaveURL(new RegExp(`${baseUrl}/modeler/\\d+`), { timeout: 180_000 });
}

/**
 * Import a collection
 * @param page - The Playwright page object
 * @param baseUrl - The base URL of the site
 * @param filePath - The path to the collection file to import
 */
export async function importCollection(page: Page, baseUrl: string, filePath: string): Promise<void> {
    await page.goto(`${baseUrl}/collections/import`);

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    const fileChooserPromise = page.waitForEvent('filechooser');
    const firstBrowseButton = page.locator('#browse');
    await firstBrowseButton.click();
    const fileChooser = await fileChooserPromise;
    fileChooser.setFiles(filePath);

    await expect(page.getByRole('button', { name: 'Import' })).toBeEnabled();

    await page.getByRole('button', { name: 'Import' }).click();

    await expect(page).toHaveURL(`${baseUrl}/collections`);
}

export async function verifyImapSettings(site: Site): Promise<void> {
    const api = apiClient(site);
    const response = await api.post('/api/1.0/actions-by-email/test-imap-connection');
    expect(response.status).toBe(200);
}

/**
 * Polls an API endpoint to find the latest asset created after a start time
 * @param api - The Axios instance for API calls
 * @param indexUrl - The API endpoint URL to poll
 * @param partialName - Partial name to match in the asset's name field
 * @param startTime - The time after which the asset must have been created
 * @returns The found asset or null if not found after max attempts
 */
export async function findLatestAsset(
    api: AxiosInstance,
    indexUrl: string,
    partialName: string,
    startTime: Date
): Promise<any | null> {
    // Hard coded polling configuration
    const maxTries = 10;
    const waitMs = 5000;

    for (let attempt = 1; attempt <= maxTries; attempt++) {
        console.log(`Polling for new asset (attempt ${attempt}/${maxTries}) ...`);
        const response = await api.get(indexUrl, { params: { order_by: 'id', order_direction: 'desc' } });
        const items = response.data?.data || [];

        console.log(`looking for ${partialName} in ${items.length} items with updated_at after ${startTime.toISOString()}`);
        console.log("Items: ", items.slice(0, 3).map((item: any) => ({ name: item.name, id: item.id, updated_at: item.updated_at })));

        // Find an item whose name includes the partial name
        // and whose createdAt/created_at is after startTime
        const found = items.find((item: any) => {
            // Check both createdAt and created_at field names
            const updatedAt = item.updated_at && new Date(item.updated_at);
            return (
                typeof item.name === 'string' &&
                item.name.includes(partialName) &&
                updatedAt &&
                updatedAt.getTime() >= startTime.getTime()
            );
        });
        console.log("Found: ", found ? found.name : "not found");

        if (found) {
            console.log("Found new asset:", found.name, found.id);
            return found;
        }

        if (attempt < maxTries) {
            await new Promise(res => setTimeout(res, waitMs));
        }
    }

    return null;
}

/**
 * Polls an API endpoint to find the latest item by ID after executing a callback
 * @param api - The Axios instance for API calls
 * @param endpointUrl - The API endpoint URL to poll (e.g., '/api/1.0/collections')
 * @param callback - Async function to execute (e.g., importCollection) before polling
 * @returns The new ID if found, or null if not found after max attempts
 */
export async function findLatestById(
    api: AxiosInstance,
    endpointUrl: string,
    callback: () => Promise<void>
): Promise<number | null> {
    // Get the current latest ID before executing the callback
    const currentResponse = await api.get(endpointUrl, { params: { order_by: 'id', order_direction: 'desc' } });
    let newestId = 0;
    if (currentResponse.data.data.length > 0) {
        newestId = currentResponse.data.data[0].id;
    }
    console.log("Newest ID: ", newestId);

    // Execute the callback (e.g., importCollection)
    await callback();

    // Poll until we have a new id > newestId
    const waitTime = 2000;
    const maxTries = 5;
    for (let attempt = 1; attempt <= maxTries; attempt++) {
        const currentResponse = await api.get(endpointUrl, { params: { order_by: 'id', order_direction: 'desc' } });
        if (currentResponse.data.data.length > 0) {
            const latestId = currentResponse.data.data[0].id;
            console.log("Latest ID: ", latestId);
            if (latestId > newestId) {
                console.log("Found new ID: ", latestId);
                return latestId;
            }
        }
        console.log("No new ID found, waiting for ", waitTime, "ms");
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    return null;
}
