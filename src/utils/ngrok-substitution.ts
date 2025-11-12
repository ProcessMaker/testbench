import axios from 'axios';

export interface NgrokTunnel {
    name: string;
    public_url: string;
}

export interface NgrokTunnelsResponse {
    tunnels: NgrokTunnel[];
}

export interface ParsedTunnelUrl {
    host: string;
    port: string;
}

/**
 * Fetches tunnel information from ngrok container and returns parsed tunnel data
 * @param ngrokContainerUrl - The ngrok container URL (e.g., "http://ngrok:4040")
 t @returns Object containing SMTP and IMAP tunnel information
 */
export async function fetchNgrokTunnels(ngrokContainerUrl: string): Promise<{
    smtp?: ParsedTunnelUrl;
    imap?: ParsedTunnelUrl;
}> {
    console.log(`🔗 Fetching tunnel information from ${ngrokContainerUrl}...`);

    try {
        const tunnelsResponse = await axios.get<NgrokTunnelsResponse>(`${ngrokContainerUrl}/api/tunnels`);
        const tunnels = tunnelsResponse.data.tunnels || [];

        // Helper function to parse tcp:// URLs
        const parseTcpUrl = (url: string): ParsedTunnelUrl | null => {
            // Format: tcp://host:port
            const match = url.match(/^tcp:\/\/([^:]+):(\d+)$/);
            if (match) {
                return { host: match[1], port: match[2] };
            }
            return null;
        };

        const result: { smtp?: ParsedTunnelUrl; imap?: ParsedTunnelUrl } = {};

        // Find SMTP tunnel
        const smtpTunnel = tunnels.find((t: NgrokTunnel) => t.name === 'smtp');
        if (smtpTunnel && smtpTunnel.public_url) {
            const parsed = parseTcpUrl(smtpTunnel.public_url);
            if (parsed) {
                result.smtp = parsed;
                console.log(`✅ Found SMTP tunnel: ${parsed.host}:${parsed.port}`);
            } else {
                console.log(`⚠️  Failed to parse SMTP tunnel URL: ${smtpTunnel.public_url}`);
            }
        } else {
            console.log('⚠️  SMTP tunnel not found in ngrok response');
        }

        // Find IMAP tunnel
        const imapTunnel = tunnels.find((t: NgrokTunnel) => t.name === 'imap');
        if (imapTunnel && imapTunnel.public_url) {
            const parsed = parseTcpUrl(imapTunnel.public_url);
            if (parsed) {
                result.imap = parsed;
                console.log(`✅ Found IMAP tunnel: ${parsed.host}:${parsed.port}`);
            } else {
                console.log(`⚠️  Failed to parse IMAP tunnel URL: ${imapTunnel.public_url}`);
            }
        } else {
            console.log('⚠️  IMAP tunnel not found in ngrok response');
        }

        return result;
    } catch (error) {
        throw new Error(`Failed to fetch ngrok tunnel information: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Updates settings object with ngrok tunnel information
 * @param settings - The settings object to update
 * @param tunnels - The parsed tunnel information from ngrok
 */
export function applyNgrokSubstitution(settings: Record<string, string>, tunnels: { smtp?: ParsedTunnelUrl; imap?: ParsedTunnelUrl }): void {
    if (tunnels.smtp) {
        settings.EMAIL_CONNECTOR_MAIL_HOST = tunnels.smtp.host;
        settings.EMAIL_CONNECTOR_MAIL_PORT = tunnels.smtp.port;
    }

    if (tunnels.imap) {
        settings.abe_imap_server = tunnels.imap.host;
        settings.abe_imap_port = tunnels.imap.port;
    }
}
