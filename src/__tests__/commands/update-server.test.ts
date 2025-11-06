import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CLITester, mockEnv } from '../utils/cli-test-utils';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock inquirer
vi.mock('inquirer', () => ({
    default: {
        prompt: vi.fn()
    }
}));

// Mock the action loader
vi.mock('../../utils/action-loader', () => ({
    getAvailableActions: vi.fn(() => [
        { name: 'Configure Email', value: 'configure-email', filePath: '/mock/path' },
        { name: 'Update Environment', value: 'update-environment', filePath: '/mock/path' }
    ]),
    loadAction: vi.fn()
}));

// Mock the configure-email action
vi.mock('../../actions/configure-email', () => ({
    configureEmail: vi.fn()
}));

// Mock the config to avoid environment validation
vi.mock('../../config', () => ({
    config: {
        serverUrl: 'https://test-server.com',
        bearerToken: 'test-token'
    }
}));

describe('update-server command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });


    describe('CLI integration tests', () => {
        it('should fail when environment variables are missing', async () => {
            const result = await CLITester.runDevCommand(['update-server'], {
                env: mockEnv.invalid
            });

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain('SERVER_URL environment variable is required');
        });

        it('should show help when --help is used', async () => {
            const result = await CLITester.runDevCommand(['update-server', '--help']);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Update the remote server environment using API calls');
            expect(result.stdout).toContain('-v, --verbose');
        });
    });
});
