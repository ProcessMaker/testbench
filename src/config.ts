import { config as dotenvConfig } from 'dotenv';

// Load environment variables only if not in test environment
if (process.env.NODE_ENV !== 'test') {
    dotenvConfig();
}

// Validate required environment variables
export function validateEnvironment(): void {
}

export const config = {
};