import Ajv from 'ajv';
import { Site, Sites } from '../types/site';
import siteSchema from '../schemas/site-schema.json';

const ajv = new Ajv();

/**
 * Advanced JSON schema validation for sites data
 * This provides more detailed validation than the simple type guards
 */
export function validateSitesWithSchema(data: any): Sites {
    const validate = ajv.compile(siteSchema);
    const valid = validate(data);

    if (!valid) {
        const errors = validate.errors?.map(err =>
            `${err.instancePath || 'root'}: ${err.message}`
        ).join(', ');
        throw new Error(`Sites data validation failed: ${errors}`);
    }

    return data as Sites;
}

/**
 * Load and validate sites using JSON schema
 */
export function loadSitesWithSchema(): Sites {
    try {
        const sitesData = require('@sites.json');
        return validateSitesWithSchema(sitesData);
    } catch (error) {
        throw new Error(`Failed to load and validate sites: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
