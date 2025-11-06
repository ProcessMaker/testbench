import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import path from 'path';

export interface CLITestResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export class CLITester {
    private static readonly TIMEOUT = 10000;

    /**
     * Run the CLI command and capture output
     */
    static async runCommand(args: string[] = [], options: {
        env?: Record<string, string>;
        timeout?: number;
    } = {}): Promise<CLITestResult> {
        const { env = {}, timeout = this.TIMEOUT } = options;

        return new Promise((resolve, reject) => {
            const child = spawn('node', [
                path.join(__dirname, '../../index.ts'),
                ...args
            ], {
                env: {
                    ...process.env,
                    ...env,
                    NODE_ENV: 'test'
                },
                stdio: 'pipe'
            });

            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            const timeoutId = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error(`Command timed out after ${timeout}ms`));
            }, timeout);

            child.on('close', (code) => {
                clearTimeout(timeoutId);
                resolve({
                    stdout,
                    stderr,
                    exitCode: code || 0
                });
            });

            child.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }

    /**
     * Run the CLI command using ts-node for development
     */
    static async runDevCommand(args: string[] = [], options: {
        env?: Record<string, string>;
        timeout?: number;
    } = {}): Promise<CLITestResult> {
        const { env = {}, timeout = this.TIMEOUT } = options;

        return new Promise((resolve, reject) => {
            const child = spawn('npx', [
                'ts-node',
                path.join(__dirname, '../../index.ts'),
                ...args
            ], {
                env: {
                    ...process.env,
                    ...env,
                    NODE_ENV: 'test'
                },
                stdio: 'pipe'
            });

            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            const timeoutId = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error(`Command timed out after ${timeout}ms`));
            }, timeout);

            child.on('close', (code) => {
                clearTimeout(timeoutId);
                resolve({
                    stdout,
                    stderr,
                    exitCode: code || 0
                });
            });

            child.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
}

/**
 * Mock environment variables for testing
 */
export const mockEnv = {
    valid: {
        SERVER_URL: 'https://test-server.com',
        BEARER_TOKEN: 'test-bearer-token-123'
    },
    invalid: {
        SERVER_URL: '',
        BEARER_TOKEN: ''
    }
};

/**
 * Wait for a specified amount of time
 */
export const wait = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));
