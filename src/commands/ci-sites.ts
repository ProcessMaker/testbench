import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { Site } from '../models/Site';

export const ciSitesCommand = new Command('ci-sites')
    .description('Generate CI sites configuration from environment variables')
    .action(async () => {
        console.log('Generating CI sites configuration from environment variables');
        const url = process.env.URL;
        if (!url) {
            throw new Error('URL environment variable is required');
        }

        // Base site configuration (common properties)
        const baseSite: Omit<ConstructorParameters<typeof Site>[0], 'name' | 'url'> = {
            bearerToken: '',
            scriptExecutorId: 1,
            mailConfig: 'dms.json',
            useTunnel: true,
        };

        // Single site mode: create 1 site without tenant prefix
        const site: ConstructorParameters<typeof Site>[0] = {
            ...baseSite,
            name: 'CI',
            url,
            imapAccount: 'abe-imap@example.test',
            senderAccount: 'sender@example.test',
            receiverAccount: 'receiver@example.test',
        };

        const sitesPath = join(process.cwd(), 'sites.json');
        writeFileSync(sitesPath, JSON.stringify([site], null, 2), 'utf-8');

        console.log(`✅ Generated CI site in sites.json`);
        console.log(site);
    });

