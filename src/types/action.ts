import { Site } from '../models/Site';

export interface ActionOptions {
    verbose?: boolean;
    site?: Site;
    email?: string;
}

export interface TestRunnerOptions {
    verbose?: boolean;
    headless?: boolean;
    browser?: 'chromium' | 'firefox' | 'webkit';
}
