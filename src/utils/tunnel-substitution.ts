import axios from 'axios';

export interface TunnelUrlsResponse {
    urls: string[];
}

export interface ParsedTunnelUrl {
    host: string;
    port: string;
}

/**
 * Fetches tunnel information from tunnel service and returns parsed tunnel data
 * @param tcpTunnels - The TCP_TUNNELS environment variable value (e.g., "mailserver:587 mailserver:993")
 * @param tunnelServiceUrl - The tunnel service base URL (default: "http://tunnel")
 * @returns Object containing SMTP and IMAP tunnel information
 */
export async function fetchTunnelUrls(
    tcpTunnels: string,
    tunnelServiceUrl: string | null = null
): Promise<{
    smtp?: ParsedTunnelUrl;
    imap?: ParsedTunnelUrl;
}> {
    if (!tcpTunnels || tcpTunnels.trim() === '') {
        throw new Error('TCP_TUNNELS environment variable is not set or empty');
    }

    // If tunnelServiceUrl is empty or null, try to get it from environment variable
    if (!tunnelServiceUrl) {
        tunnelServiceUrl = process.env.TUNNEL_SERVICE_URL || null;
        if (!tunnelServiceUrl) {
            throw new Error('TUNNEL_SERVICE_URL is not set. Please provide tunnelServiceUrl parameter or set TUNNEL_SERVICE_URL environment variable');
        }
    }

    console.log(`🔗 Fetching tunnel information from ${tunnelServiceUrl}...`);
    console.log(`📋 TCP_TUNNELS: ${tcpTunnels}`);

    try {
        // Parse TCP_TUNNELS to get the list of tunnels
        const tunnels = tcpTunnels.trim().split(/\s+/);
        const result: { smtp?: ParsedTunnelUrl; imap?: ParsedTunnelUrl } = {};

        // Helper function to parse tcp:// URLs
        const parseTcpUrl = (url: string): ParsedTunnelUrl | null => {
            // Format: tcp://host:port
            const match = url.match(/^tcp:\/\/([^:]+):(\d+)$/);
            if (match) {
                return { host: match[1], port: match[2] };
            }
            return null;
        };

        // Query each tunnel endpoint starting at port 4300
        let debuggerPort = 4300;
        for (const tunnel of tunnels) {
            const [host, port] = tunnel.split(':');
            const tunnelPort = parseInt(port, 10);

            if (!host || !port || isNaN(tunnelPort)) {
                console.log(`⚠️  Invalid tunnel format: ${tunnel}, skipping`);
            } else {
                // Query the tunnel service endpoint
                const endpoint = `${tunnelServiceUrl}:${debuggerPort}/urls`;
                console.log(`🔍 Querying tunnel endpoint: ${endpoint} for ${tunnel}`);

                try {
                    const response = await axios.get<TunnelUrlsResponse>(endpoint);
                    const urls = response.data.urls || [];

                    if (urls.length === 0) {
                        console.log(`⚠️  No URLs found in tunnel response for ${tunnel}`);
                    } else {
                        // There should always be only one URL
                        const publicUrl = urls[0];
                        const parsed = parseTcpUrl(publicUrl);

                        if (!parsed) {
                            console.log(`⚠️  Failed to parse tunnel URL: ${publicUrl}`);
                        } else {
                            // Map based on the port number
                            if (tunnelPort === 587) {
                                // SMTP port
                                result.smtp = parsed;
                                console.log(`✅ Found SMTP tunnel (${tunnel}): ${parsed.host}:${parsed.port}`);
                            } else if (tunnelPort === 993) {
                                // IMAP port
                                result.imap = parsed;
                                console.log(`✅ Found IMAP tunnel (${tunnel}): ${parsed.host}:${parsed.port}`);
                            } else {
                                console.log(`⚠️  Unknown tunnel port ${tunnelPort} for ${tunnel}, skipping`);
                            }
                        }
                    }
                } catch (error) {
                    console.log(`⚠️  Failed to fetch tunnel information from ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            // Always increment debugger port for next tunnel
            debuggerPort++;
        }

        return result;
    } catch (error) {
        throw new Error(`Failed to fetch tunnel information: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Updates settings object with tunnel information
 * @param settings - The settings object to update
 * @param tunnels - The parsed tunnel information from tunnel service
 */
export function applyTunnelSubstitution(
    settings: Record<string, string>,
    tunnels: { smtp?: ParsedTunnelUrl; imap?: ParsedTunnelUrl }
): void {
    if (tunnels.smtp) {
        if (!tunnels.smtp.host || tunnels.smtp.host.trim() === '') {
            throw new Error('SMTP tunnel host is empty');
        }
        if (!tunnels.smtp.port || tunnels.smtp.port.trim() === '') {
            throw new Error('SMTP tunnel port is empty');
        }
        settings.EMAIL_CONNECTOR_MAIL_HOST = tunnels.smtp.host;
        settings.EMAIL_CONNECTOR_MAIL_PORT = tunnels.smtp.port;
    }

    if (tunnels.imap) {
        if (!tunnels.imap.host || tunnels.imap.host.trim() === '') {
            throw new Error('IMAP tunnel host is empty');
        }
        if (!tunnels.imap.port || tunnels.imap.port.trim() === '') {
            throw new Error('IMAP tunnel port is empty');
        }
        settings.abe_imap_server = tunnels.imap.host;
        settings.abe_imap_port = tunnels.imap.port;
    }
}

