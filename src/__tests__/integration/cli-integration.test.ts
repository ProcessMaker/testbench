import { describe, it, expect } from 'vitest';
import { CLITester, mockEnv } from '../utils/cli-test-utils';

describe('CLI Integration Tests', () => {
    describe('help commands', () => {
        it('should show main help', async () => {
            const result = await CLITester.runDevCommand(['--help']);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('A CLI tool for running API calls and Playwright tests against remote servers');
            expect(result.stdout).toContain('update-server');
            expect(result.stdout).toContain('run-tests');
        });

        it('should show version', async () => {
            const result = await CLITester.runDevCommand(['--version']);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('1.0.0');
        });
    });

    describe('command discovery', () => {
        it('should list available commands', async () => {
            const result = await CLITester.runDevCommand(['--help']);

            expect(result.stdout).toContain('Commands:');
            expect(result.stdout).toContain('update-server');
            expect(result.stdout).toContain('run-tests');
        });
    });

    describe('error handling', () => {
        it('should handle unknown commands gracefully', async () => {
            const result = await CLITester.runDevCommand(['unknown-command']);

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("error: unknown command 'unknown-command'");
        });

        it('should handle invalid options gracefully', async () => {
            const result = await CLITester.runDevCommand(['update-server', '--invalid-option']);

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("error: unknown option '--invalid-option'");
        });
    });

    describe('environment validation', () => {
        it('should fail early when environment is not configured', async () => {
            const result = await CLITester.runDevCommand(['run-tests'], {
                env: {
                    SERVER_URL: '',
                    BEARER_TOKEN: ''
                }
            });

            expect(result.exitCode).toBe(1);
            // Check both stdout and stderr for the error message
            const output = result.stdout + result.stderr;
            expect(output).toContain('SERVER_URL environment variable is required');
        });
    });
});
