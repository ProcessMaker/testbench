import fs from 'fs';
import path from 'path';

export interface ActionInfo {
    name: string;
    value: string;
    filePath: string;
}

/**
 * Scans the src/actions directory and returns available action files
 * Only scans top-level files, excluding subfolders
 * @returns Array of action information objects
 */
export function getAvailableActions(): ActionInfo[] {
    const actionsDir = path.join(__dirname, '..', 'actions');

    if (!fs.existsSync(actionsDir)) {
        return [];
    }

    const files = fs.readdirSync(actionsDir);

    // Filter for both .ts (development) and .js (production) files
    // Exclude subfolders and test files
    return files
        .filter(file => {
            const filePath = path.join(actionsDir, file);
            const isDirectory = fs.statSync(filePath).isDirectory();

            if (isDirectory) {
                return false; // Skip subfolders
            }

            const isTsFile = file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts');
            const isJsFile = file.endsWith('.js') && !file.endsWith('.test.js');
            return isTsFile || isJsFile;
        })
        .map(file => {
            const fileName = file.replace(/\.(ts|js)$/, '');
            const displayName = fileName
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            return {
                name: displayName,
                value: fileName,
                filePath: path.join(actionsDir, file)
            };
        });
}

/**
 * Dynamically imports an action function from a file
 * @param actionValue The action value (filename without extension)
 * @returns The imported action function
 */
export async function loadAction(actionValue: string): Promise<any> {
    try {
        // Try .js first (production), then .ts (development)
        let actionPath: string;
        let actionModule: any;

        try {
            actionPath = path.join(__dirname, '..', 'actions', `${actionValue}.js`);
            actionModule = await import(actionPath);
        } catch {
            actionPath = path.join(__dirname, '..', 'actions', `${actionValue}.ts`);
            actionModule = await import(actionPath);
        }

        // Look for a function that matches the action name (e.g., configureEmail for configure-email)
        const functionName = actionValue
            .split('-')
            .map((word, index) =>
                index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join('');

        return actionModule[functionName];
    } catch (error) {
        throw new Error(`Failed to load action '${actionValue}': ${error}`);
    }
}
