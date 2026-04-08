import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { Site } from '../models/Site';

export const ciSitesCommand = new Command('ci-sites')
    .description('Generate CI sites configuration from environment variables')
    .action(async () => {
        console.log('Generating CI sites configuration from environment variables');
        const instance = process.env.INSTANCE;
        if (!instance) {
            throw new Error('INSTANCE environment variable is required');
        }

        const isMultitenancy = process.env.MULTITENANCY === 'true';
        const sites: ConstructorParameters<typeof Site>[0][] = [];

        // Base site configuration (common properties)
        const baseSite: Omit<ConstructorParameters<typeof Site>[0], 'name' | 'url'> = {
            bearerToken: '',
            scriptExecutorId: 1,
            mailConfig: 'dms.json',
            useTunnel: true,
        };

        if (isMultitenancy) {
            // Multitenancy mode: create 3 sites with tenant-X prefix
            for (let i = 0; i < 3; i++) {
                const siteNumber = i + 1;
                const site: ConstructorParameters<typeof Site>[0] = {
                    ...baseSite,
                    name: `CI${siteNumber}`,
                    url: `https://tenant-${siteNumber}.ci-${instance}.engk8s.processmaker.net`,
                    imapAccount: `abe-imap-${siteNumber}@example.test`,
                    senderAccount: `sender-${siteNumber}@example.test`,
                    receiverAccount: `receiver-${siteNumber}@example.test`,
                };
                sites.push(site);
            }
        } else {
            // Single site mode: create 1 site without tenant prefix
            const site: ConstructorParameters<typeof Site>[0] = {
                ...baseSite,
                name: 'CI1',
                url: `https://ci-${instance}.engk8s.processmaker.net`,
                imapAccount: 'abe-imap@example.test',
                senderAccount: 'sender@example.test',
                receiverAccount: 'receiver@example.test',
            };
            sites.push(site);
        }

        const sitesPath = join(process.cwd(), 'sites.json');
        writeFileSync(sitesPath, JSON.stringify(sites, null, 2), 'utf-8');

        console.log(`✅ Generated ${sites.length} CI sites in sites.json`);
        console.log(`   Instance: ${instance}`);
        console.log(`   Multitenancy: ${isMultitenancy}`);
        sites.forEach((site, index) => {
            console.log(`   ${index + 1}. ${site.name} - ${site.url}`);
        });
    });

