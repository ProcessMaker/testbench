import { Site, Sites } from '../types/site';

/**
 * Type guard to check if an object is a valid Site
 */
function isValidSite(obj: any): obj is Site {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.name === 'string' &&
        typeof obj.url === 'string' &&
        typeof obj.bearerToken === 'string'
    );
}

/**
 * Type guard to check if an array contains valid Sites
 */
function isValidSitesArray(arr: any): arr is Sites {
    return Array.isArray(arr) && arr.every(isValidSite);
}

/**
 * Loads and validates sites from JSON
 * Throws an error if the data doesn't conform to the Site interface
 */
export function loadSites(): Sites {
    try {
        // Import the JSON data
        const sitesData = require('../../sites.json');

        if (!isValidSitesArray(sitesData)) {
            throw new Error('Invalid sites data: each site must have name (string), url (string), and bearerToken (string)');
        }

        return sitesData;
    } catch (error) {
        throw new Error(`Failed to load sites: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Type-safe version that can be used with the path mapping
 * This is the recommended approach for your current setup
 */
export function loadSitesFromPath(): Sites {
    try {
        // This will use your @sites.json path mapping
        const sitesData = require('@sites.json');

        if (!isValidSitesArray(sitesData)) {
            throw new Error('Invalid sites data: each site must have name (string), url (string), and bearerToken (string)');
        }

        return sitesData;
    } catch (error) {
        throw new Error(`Failed to load sites: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
