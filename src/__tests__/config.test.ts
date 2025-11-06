import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should load valid environment variables', async () => {
        process.env.SERVER_URL = 'https://test-server.com';
        process.env.BEARER_TOKEN = 'test-token-123';

        // Dynamic import to ensure fresh module load
        const { config } = await import('../config');

        expect(config.serverUrl).toBe('https://test-server.com');
        expect(config.bearerToken).toBe('test-token-123');
    });

    it('should throw error when SERVER_URL is missing', async () => {
        delete process.env.SERVER_URL;
        process.env.BEARER_TOKEN = 'test-token-123';

        const { validateEnvironment } = await import('../config');
        expect(() => validateEnvironment()).toThrow('SERVER_URL environment variable is required');
    });

    it('should throw error when BEARER_TOKEN is missing', async () => {
        process.env.SERVER_URL = 'https://test-server.com';
        delete process.env.BEARER_TOKEN;

        const { validateEnvironment } = await import('../config');
        expect(() => validateEnvironment()).toThrow('BEARER_TOKEN environment variable is required');
    });

    it('should throw error when both environment variables are missing', async () => {
        delete process.env.SERVER_URL;
        delete process.env.BEARER_TOKEN;

        const { validateEnvironment } = await import('../config');
        expect(() => validateEnvironment()).toThrow('SERVER_URL environment variable is required');
    });

    it('should use empty strings as defaults when variables are undefined', async () => {
        process.env.SERVER_URL = undefined as any;
        process.env.BEARER_TOKEN = undefined as any;

        const { validateEnvironment } = await import('../config');
        expect(() => validateEnvironment()).toThrow('SERVER_URL environment variable is required');
    });
});