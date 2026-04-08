import fs from 'fs';
import { ParsedTunnelUrl, fetchTunnelUrls } from '../utils/tunnel-substitution';

export class Settings {
    private data: Record<string, any>;

    constructor(data: Record<string, any>) {
        this.data = data;
    }

    /**
     * Load settings from a JSON file
     */
    static load(filePath: string): Settings {
        try {
            const settingsData = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(settingsData);
            const settings = new Settings(parsed);
            settings.applyDefaults();
            return settings;
        } catch (error) {
            throw new Error(`Failed to load settings from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Apply default values for missing or blank settings
     */
    applyDefaults(): void {
    }

    /**
     * Get a setting value by key
     */
    get(key: string): any {
        return this.data[key];
    }

    /**
     * Set a setting value by key
     */
    set(key: string, value: any): void {
        this.data[key] = value;
    }

    /**
     * Get all settings as a record
     */
    toRecord(): Record<string, any> {
        return { ...this.data };
    }

    /**
     * Get all settings as a record with string values
     * Converts all values to strings for API compatibility
     */
    toStringRecord(): Record<string, string> {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(this.data)) {
            result[key] = value === null || value === undefined ? '' : String(value);
        }
        return result;
    }

    /**
     * Get all settings as entries with string values
     * Returns [key, value] pairs where values are strings
     */
    entries(): [string, string][] {
        return Object.entries(this.toStringRecord());
    }

    /**
     * Get a setting value as a string
     */
    getString(key: string): string {
        const value = this.data[key];
        return value === null || value === undefined ? '' : String(value);
    }

    /**
     * Check if a setting exists and is not empty
     */
    has(key: string): boolean {
        const value = this.data[key];
        return value !== undefined && value !== null && value.toString().trim() !== '';
    }

    /**
     * Validate that all required keys exist and are not empty
     * Throws an error if any required key is missing or empty
     */
    validateRequired(requiredKeys: string[]): void {
        for (const key of requiredKeys) {
            if (!this.has(key)) {
                throw new Error(`Setting '${key}' is required`);
            }
        }
    }

    /**
     * Apply tunnel substitution to settings
     * Updates SMTP and IMAP settings with tunnel information
     */
    applyTunnelSubstitution(tunnels: { smtp?: ParsedTunnelUrl; imap?: ParsedTunnelUrl }): void {
        if (tunnels.smtp) {
            if (!tunnels.smtp.host || tunnels.smtp.host.trim() === '') {
                throw new Error('SMTP tunnel host is empty');
            }
            if (!tunnels.smtp.port || tunnels.smtp.port.trim() === '') {
                throw new Error('SMTP tunnel port is empty');
            }
            this.data.EMAIL_CONNECTOR_MAIL_HOST = tunnels.smtp.host;
            this.data.EMAIL_CONNECTOR_MAIL_PORT = tunnels.smtp.port;
        }

        if (tunnels.imap) {
            if (!tunnels.imap.host || tunnels.imap.host.trim() === '') {
                throw new Error('IMAP tunnel host is empty');
            }
            if (!tunnels.imap.port || tunnels.imap.port.trim() === '') {
                throw new Error('IMAP tunnel port is empty');
            }
            this.data.abe_imap_server = tunnels.imap.host;
            this.data.abe_imap_port = tunnels.imap.port;
        }
    }

    /**
     * Fetch tunnel URLs from environment and apply tunnel substitution
     * Validates TCP_TUNNELS environment variable and applies tunnel settings
     */
    async applyTunnelSubstitutionFromEnv(): Promise<void> {
        const tcpTunnels = process.env.TCP_TUNNELS;
        if (!tcpTunnels) {
            throw new Error('TCP_TUNNELS environment variable is required when useTunnel is true');
        }
        try {
            const tunnels = await fetchTunnelUrls(tcpTunnels);
            this.applyTunnelSubstitution(tunnels);
        } catch (error) {
            throw new Error(`Failed to apply tunnel substitution: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

