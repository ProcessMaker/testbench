import { AxiosInstance, AxiosError } from "axios";
import { validateEnvironment } from "../config";
import { Site } from "../types/site";
import axios from "axios";

export function apiClient(site: Site): AxiosInstance {
    // Validate environment before creating API client
    validateEnvironment();

    const client = axios.create({
        baseURL: site.url,
        headers: {
            'Authorization': `Bearer ${site.bearerToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    // Add response interceptor for error handling
    client.interceptors.response.use(
        (response) => response,
        (error: AxiosError) => {
            const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
            const url = error.config?.url || 'UNKNOWN';
            const status = error.response?.status || 'NO_RESPONSE';
            const statusText = error.response?.statusText || 'NO_STATUS_TEXT';
            const responseData = error.response?.data;

            // Extract response message from various possible locations
            let responseMessage = 'No response message available';
            if (responseData) {
                if (typeof responseData === 'string') {
                    responseMessage = responseData;
                } else if (typeof responseData === 'object' && responseData !== null) {
                    const data = responseData as Record<string, any>;
                    if (data.message) {
                        responseMessage = data.message;
                    } else if (data.error) {
                        responseMessage = data.error;
                    } else if (data.detail) {
                        responseMessage = data.detail;
                    } else {
                        responseMessage = JSON.stringify(responseData);
                    }
                } else {
                    responseMessage = JSON.stringify(responseData);
                }
            }

            console.error(`❌ API Request Failed:`);
            console.error(`   Method: ${method}`);
            console.error(`   URL: ${url}`);
            console.error(`   Status: ${status} ${statusText}`);
            console.error(`   Response: ${responseMessage}`);

            // Re-throw the error to maintain normal error handling flow
            throw error;
        }
    );

    return client;
}