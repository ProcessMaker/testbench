import { Page, expect } from '@playwright/test';
import { apiClient } from './api-client';
import sitesData from '@sites.json';
import { Site, Sites } from '../types/site';
import { AxiosInstance } from 'axios';
import fs from 'fs';

// Type assertion to ensure sites matches Site[] interface
const sites = sitesData as Sites;

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
    // Find the existing site by name and replace it with the new site
    const index = sites.findIndex((s: Site) => s.name === site.name);
    if (index !== -1) {
        sites[index] = site;
    } else {
        // Throw an error if the site is not found
        throw new Error(`Site ${site.name} not found`);
    }
    fs.writeFileSync('sites.json', JSON.stringify(sites, null, 2));
}

/**
 * Sign in to the application with admin credentials
 */
export async function signInAsAdmin(page: Page, site: Site): Promise<void> {
    // Get username from site or fallback to environment variable
    const username = site.username || process.env.INSTANCE_USERNAME;
    if (!username) {
        throw new Error('Username is required. Provide it in the site object or set INSTANCE_USERNAME environment variable.');
    }

    // Get password from site or fallback to environment variable
    const password = site.password || process.env.INSTANCE_PASSWORD;
    if (!password) {
        throw new Error('Password is required. Provide it in the site object or set INSTANCE_PASSWORD environment variable.');
    }

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

export async function verifyImapSettings(site: Site): Promise<void> {
    const api = apiClient(site);
    const response = await api.post('/api/1.0/actions-by-email/test-imap-connection');
    expect(response.status).toBe(200);
}
