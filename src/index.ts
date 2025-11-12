#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import { updateServerCommand } from './commands/update-server';
import { ciSitesCommand } from './commands/ci-sites';
import { debugTunnelsCommand } from './commands/debug-tunnels';

// Load environment variables
config();

const program = new Command();

program
    .name('testbench')
    .description('A CLI tool for running API calls and Playwright tests against remote servers')
    .version('1.0.0');

// Add commands
program.addCommand(updateServerCommand);
program.addCommand(ciSitesCommand);
program.addCommand(debugTunnelsCommand);

// Parse command line arguments
program.parse();
