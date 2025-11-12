import fs from 'fs';
import path from 'path';
import { apiClient } from '../utils/api-client';
import { ActionOptions } from '../types/action';
import { fetchTunnelUrls, applyTunnelSubstitution } from '../utils/tunnel-substitution';

export async function configureEmail(options: ActionOptions = {}): Promise<void> {

    const getAllSettingsEndpoint = '/api/1.0/settings?per_page=1000';
    const putSettingEndpoint = '/api/1.0/settings/:id';

    const { site } = options;

    if (!site) {
        throw new Error('Site configuration is required for email configuration');
    }

    // Load settings from the mailConfig file specified in the site configuration
    const mailConfigFile = site.mailConfig || 'gmail.json';
    const settingsPath = path.join(__dirname, '..', 'settings', mailConfigFile);

    let settings: Record<string, string>;
    try {
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(settingsData);
    } catch (error) {
        throw new Error(`Failed to load email settings from ${settingsPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // If useTunnel is true, fetch tunnel information and update SMTP/IMAP settings
    if (site.useTunnel) {
        const tcpTunnels = process.env.TCP_TUNNELS;
        if (!tcpTunnels) {
            throw new Error('TCP_TUNNELS environment variable is required when useTunnel is true');
        }
        try {
            const tunnels = await fetchTunnelUrls(tcpTunnels);
            applyTunnelSubstitution(settings, tunnels);
        } catch (error) {
            throw new Error(`Failed to apply tunnel substitution: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    console.log('📧 Configuring email settings...');

    try {
        // Create axios instance with common configuration
        const api = apiClient(site);

        // Get all settings from the API
        const response = await api.get(getAllSettingsEndpoint);
        const allSettings = response.data.data;

        // Update each setting from our configuration
        for (const [key, value] of Object.entries(settings)) {
            // Find the setting by key
            const setting = allSettings.find((s: any) => s.key === key);

            if (!setting) {
                console.log(`⚠️  Setting '${key}' not found on server`);
                continue;
            }

            // Compare current value with desired value
            const currentValue = setting.config;
            const needsUpdate = currentValue !== value;

            if (!needsUpdate) {
                console.log(`✅ Setting '${key}' is already correct (${currentValue})`);
                continue;
            }

            console.log(`🔄 Updating setting '${key}' (ID: ${setting.id}) from '${currentValue}' to '${value}'`);

            // Update the setting using PUT endpoint
            console.log(`Updating setting '${key}' (ID: ${setting.id}) from '${currentValue}' to '${value}'`);
            const updateResponse = await api.put(
                putSettingEndpoint.replace(':id', setting.id.toString()),
                {
                    id: setting.id,
                    key: key,
                    config: value
                }
            );

            console.log(`✅ Updated setting '${key}':`, updateResponse.data);
        }

        console.log('✅ Email configuration completed successfully');
    } catch (error) {
        throw new Error(`Email configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
