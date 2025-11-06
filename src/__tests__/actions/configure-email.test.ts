import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureEmail } from '../../actions/configure-email';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock the server-updater module
vi.mock('../../utils/api-client', () => ({
    apiClient: vi.fn(() => ({
        get: vi.fn(),
        put: vi.fn()
    }))
}));

describe('configure-email action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('successful execution', () => {
        it('should configure email successfully', async () => {
            const mockApiClient = {
                post: vi.fn().mockResolvedValueOnce({
                    data: { success: true, message: 'Email configured' },
                    status: 200
                })
            };

            // Mock the createApiClient function
            const { apiClient } = await import('../../utils/api-client');
            vi.mocked(apiClient).mockReturnValue(mockApiClient as any);

            await configureEmail();

            expect(mockApiClient.post).toHaveBeenCalledWith('/api/email/configure', {
                smtpHost: 'smtp.example.com',
                smtpPort: 587,
                smtpUser: 'noreply@example.com',
                smtpPassword: 'encrypted-password',
                fromAddress: 'noreply@example.com',
                timestamp: expect.any(String)
            });
        });

        it('should show verbose output when verbose flag is used', async () => {
            const mockApiClient = {
                post: vi.fn().mockResolvedValueOnce({
                    data: { success: true, message: 'Email configured' },
                    status: 200
                })
            };

            const { apiClient } = await import('../../utils/api-client');
            vi.mocked(apiClient).mockReturnValue(mockApiClient as any);

            // Capture console.log output
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            await configureEmail({ verbose: true });

            expect(consoleSpy).toHaveBeenCalledWith('📧 Configuring email settings...');
            expect(consoleSpy).toHaveBeenCalledWith('✅ Email configuration updated:', { success: true, message: 'Email configured' });

            consoleSpy.mockRestore();
        });
    });

    describe('error handling', () => {
        it('should handle API errors gracefully', async () => {
            const mockApiClient = {
                post: vi.fn().mockRejectedValueOnce({
                    response: {
                        status: 400,
                        statusText: 'Bad Request'
                    }
                })
            };

            const { apiClient } = await import('../../utils/api-client');
            vi.mocked(apiClient).mockReturnValue(mockApiClient as any);

            await expect(configureEmail()).rejects.toThrow('Email configuration failed: 400 Bad Request');
        });

        it('should handle network errors', async () => {
            const mockApiClient = {
                post: vi.fn().mockRejectedValueOnce(new Error('Network error'))
            };

            const { apiClient } = await import('../../utils/api-client');
            vi.mocked(apiClient).mockReturnValue(mockApiClient as any);

            await expect(configureEmail()).rejects.toThrow('Network error');
        });
    });
});
