import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { Site } from '../types/site';

export const ciSitesCommand = new Command('ci-sites')
    .description('Generate CI sites configuration from environment variables')
    .action(async () => {
        const instance = process.env.INSTANCE;
        if (!instance) {
            throw new Error('INSTANCE environment variable is required');
        }

        const sites: Site[] = [];

        for (let i = 0; i < 3; i++) {
            const siteNumber = i + 1;
            const site: Site = {
                name: `CI${siteNumber}`,
                url: `https://tenant-${siteNumber}.ci-${instance}.engk8s.processmaker.net`,
                bearerToken: '',
                scriptExecutorId: 1,
                mailConfig: 'dms.json',
                ngrokContainer: 'http://ngrok:4040',
            };
            sites.push(site);
        }

        const sitesPath = join(process.cwd(), 'sites.json');
        writeFileSync(sitesPath, JSON.stringify(sites, null, 2), 'utf-8');

        console.log(`✅ Generated ${sites.length} CI sites in sites.json`);
        console.log(`   Instance: ${instance}`);
        sites.forEach((site, index) => {
            console.log(`   ${index + 1}. ${site.name} - ${site.url}`);
        });
    });

