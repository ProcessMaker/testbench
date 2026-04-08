import path from 'path';
import { apiClient } from '../utils/api-client';
import { ActionOptions } from '../types/action';
import { Settings } from '../models/Settings';

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

    // Load settings using the Settings model (applyDefaults is called automatically)
    const settingsModel = Settings.load(settingsPath);

    // If useTunnel is true, fetch tunnel information and update SMTP/IMAP settings
    if (site.useTunnel) {
        await settingsModel.applyTunnelSubstitutionFromEnv();
    }

    console.log('📧 Configuring email settings...');


    // Set the accounts: sender@example.test for SMTP and abe-imap@example.test for IMAP
    settingsModel.set('EMAIL_CONNECTOR_MAIL_USERNAME', site.senderAccount);
    settingsModel.set('EMAIL_CONNECTOR_MAIL_FROM_ADDRESS', site.senderAccount);
    settingsModel.set('abe_imap_username', site.imapAccount);

    // Validate required settings
    const required = ['EMAIL_CONNECTOR_MAIL_HOST', 'EMAIL_CONNECTOR_MAIL_PORT', 'abe_imap_server', 'abe_imap_port', 'abe_imap_username', 'abe_imap_password'];
    settingsModel.validateRequired(required);

    try {
        // Create axios instance with common configuration
        const api = apiClient(site);

        // Get all settings from the API
        const response = await api.get(getAllSettingsEndpoint);
        const allSettings = response.data.data;

        // Update each setting from our configuration
        for (const [key, value] of settingsModel.entries()) {
            // Find the setting by key
            const setting = allSettings.find((s: any) => s.key === key);

            if (!setting) {
                console.log(`⚠️  Setting '${key}' not found on server`);
                continue;
            }

            // Compare current value with desired value
            const currentValue = setting.config;
            let needsUpdate = true;
            if (currentValue !== value) {
                if ((currentValue === 'false' || currentValue === false) && value === '0') {
                    needsUpdate = false;
                }
                if ((currentValue === 'true' || currentValue === true) && value === '1') {
                    needsUpdate = false;
                }
                if ((currentValue === 'null' || currentValue === null) && value === '') {
                    needsUpdate = false;
                }
                if (currentValue === '' && value === '[]') {
                    needsUpdate = false;
                }
                if (JSON.stringify(currentValue) === value) {
                    needsUpdate = false;
                }
            } else {
                needsUpdate = false;
            }

            if (!needsUpdate) {
                console.log(`✅ Setting '${key}' is already correct (${currentValue} -> ${value})`);
                continue;
            }

            console.log(`🔄 Updating setting '${key}' (ID: ${setting.id}) from '${currentValue}' to '${value}'`);

            // Update the setting using PUT endpoint
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
