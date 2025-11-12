import { Command } from 'commander';
import { fetchTunnelUrls } from '../utils/tunnel-substitution';

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

            // Output as JSON for programmatic use
            console.log('\n📋 JSON Output:');
            console.log(JSON.stringify(tunnels, null, 2));

        } catch (error) {
            console.error('❌ Failed to fetch tunnel information:', error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });

