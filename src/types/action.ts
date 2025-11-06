import { Site } from './site';

export interface ActionOptions {
    verbose?: boolean;
    site?: Site;
}

export interface TestRunnerOptions {
    verbose?: boolean;
    headless?: boolean;
    browser?: 'chromium' | 'firefox' | 'webkit';
}
