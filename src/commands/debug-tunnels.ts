import { Command } from 'commander';
import { fetchTunnelUrls } from '../utils/tunnel-substitution';
import {
    tcpTunnelsWantsMailPorts,
    verifyTcpReachable,
} from '../utils/tcp-reachability';

export const debugTunnelsCommand = new Command('debug-tunnels')
    .description('Output tunnel information from the tunnel service')
    .action(async (options) => {
        const tcpTunnels = process.env.TCP_TUNNELS;

        if (!tcpTunnels || tcpTunnels.trim() === '') {
            console.error('❌ TCP_TUNNELS environment variable is not set or empty');
            process.exit(1);
        }

        try {
            console.log('🔍 Fetching tunnel information...\n');
            const tunnels = await fetchTunnelUrls(tcpTunnels, options.tunnelUrl);

            console.log('\n📊 Tunnel Information:');
            console.log('━'.repeat(50));

            if (tunnels.smtp) {
                console.log(`📧 SMTP Tunnel:`);
                console.log(`   Host: ${tunnels.smtp.host}`);
                console.log(`   Port: ${tunnels.smtp.port}`);
                console.log(`   Full URL: tcp://${tunnels.smtp.host}:${tunnels.smtp.port}`);
            } else {
                console.log(`📧 SMTP Tunnel: Not found`);
            }

            console.log('');

            if (tunnels.imap) {
                console.log(`📬 IMAP Tunnel:`);
                console.log(`   Host: ${tunnels.imap.host}`);
                console.log(`   Port: ${tunnels.imap.port}`);
                console.log(`   Full URL: tcp://${tunnels.imap.host}:${tunnels.imap.port}`);
            } else {
                console.log(`📬 IMAP Tunnel: Not found`);
            }

            console.log('━'.repeat(50));

            const wants = tcpTunnelsWantsMailPorts(tcpTunnels);

            if (wants.smtp && !tunnels.smtp) {
                console.error(
                    '❌ SMTP (port 587) was listed in TCP_TUNNELS but no tunnel was found'
                );
                process.exit(1);
            }
            if (wants.imap && !tunnels.imap) {
                console.error(
                    '❌ IMAP (port 993) was listed in TCP_TUNNELS but no tunnel was found'
                );
                process.exit(1);
            }

            if (tunnels.smtp || tunnels.imap) {
                console.log('\n🔌 TCP reachability:');
            }

            if (tunnels.smtp) {
                const port = parseInt(tunnels.smtp.port, 10);
                if (Number.isNaN(port)) {
                    console.error(
                        `❌ Invalid SMTP port: ${tunnels.smtp.port}`
                    );
                    process.exit(1);
                }
                try {
                    await verifyTcpReachable(tunnels.smtp.host, port);
                    console.log(
                        `   ✅ SMTP ${tunnels.smtp.host}:${port} — connection OK`
                    );
                } catch (err) {
                    const msg =
                        err instanceof Error ? err.message : String(err);
                    console.error(
                        `   ❌ SMTP ${tunnels.smtp.host}:${port} — ${msg}`
                    );
                    process.exit(1);
                }
            }

            if (tunnels.imap) {
                const port = parseInt(tunnels.imap.port, 10);
                if (Number.isNaN(port)) {
                    console.error(
                        `❌ Invalid IMAP port: ${tunnels.imap.port}`
                    );
                    process.exit(1);
                }
                try {
                    await verifyTcpReachable(tunnels.imap.host, port);
                    console.log(
                        `   ✅ IMAP ${tunnels.imap.host}:${port} — connection OK`
                    );
                } catch (err) {
                    const msg =
                        err instanceof Error ? err.message : String(err);
                    console.error(
                        `   ❌ IMAP ${tunnels.imap.host}:${port} — ${msg}`
                    );
                    process.exit(1);
                }
            }

            // Output as JSON for programmatic use
            console.log('\n📋 JSON Output:');
            console.log(JSON.stringify(tunnels, null, 2));

        } catch (error) {
            console.error('❌ Failed to fetch tunnel information:', error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });

