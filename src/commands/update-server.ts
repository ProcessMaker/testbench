import { Command } from 'commander';
import { getAvailableActions, loadAction } from '../utils/action-loader';
import { loadSitesFromPath } from '../utils/sites-loader';
import { Site } from '../types/site';

export const updateServerCommand = new Command('update-server')
    .description('Update the remote server environment using API calls')
    .option('-s, --script <script>', 'Optional script name to run (e.g., configure-email)')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (options) => {
        const siteName = process.env.SITE_NAME;
        if (!siteName) {
            throw new Error('SITE_NAME environment variable is required')
        }

        // Load and validate sites data
        const sites = loadSitesFromPath();
        const site = sites.find(s => s.name === siteName);
        if (!site) {
            throw new Error(`Site ${siteName} not found`);
        }

        try {
            // If script is provided, run it directly
            if (options.script) {
                const actionName = options.script.replace(/\.ts$/, '');

                try {
                    console.log(`🚀 Running ${actionName}...`);

                    // Dynamically load and execute the action
                    const actionFunction = await loadAction(actionName);
                    if (typeof actionFunction === 'function') {
                        await actionFunction({ verbose: options.verbose, site });
                        console.log(`✅ ${actionName} completed successfully`);
                    } else {
                        console.log(`❌ Action '${actionName}' does not export a valid function`);
                        process.exit(1);
                    }
                } catch (error) {
                    console.error(`❌ Failed to execute ${actionName}:`, error);
                    process.exit(1);
                }
                return;
            }

            // No script specified - run all available actions
            console.log('🔄 Running all available server actions...');

            // Get available actions dynamically
            const availableActions = getAvailableActions();

            if (availableActions.length === 0) {
                console.log('ℹ️  No actions found in src/actions directory');
                return;
            }

            // Run all actions sequentially
            for (const action of availableActions) {
                try {
                    console.log(`🚀 Running ${action.name}...`);

                    // Dynamically load and execute the action
                    const actionFunction = await loadAction(action.value);
                    if (typeof actionFunction === 'function') {
                        await actionFunction({ verbose: options.verbose, site });
                        console.log(`✅ ${action.name} completed successfully`);
                    } else {
                        console.log(`❌ Action '${action.value}' does not export a valid function`);
                        process.exit(1);
                    }
                } catch (error) {
                    console.error(`❌ Failed to execute ${action.name}:`, error);
                    process.exit(1);
                }
            }

            console.log('🎉 All actions completed successfully!');
        } catch (error) {
            console.error('❌ Failed to execute actions:', error);
            process.exit(1);
        }
    });
