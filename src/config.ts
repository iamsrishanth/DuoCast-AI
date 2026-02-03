/**
 * DuoCast-AI Configuration
 * Centralized configuration for the two-model pipeline
 */

import { config as loadEnv } from 'dotenv';

// Load environment variables
loadEnv();

export interface DuoCastConfig {
    // API Configuration
    apiKey: string;

    // Nano Banana Pro settings
    nanoBanana: {
        model: string;
        aspectRatio: AspectRatio;
        imageSize: ImageSize;
    };

    // Veo 3.1 settings
    veo: {
        model: string;
        aspectRatio: VideoAspectRatio;
        resolution: VideoResolution;
    };

    // Pipeline settings
    pipeline: {
        outputDir: string;
        pollIntervalMs: number;
        maxWaitTimeMs: number;
    };
}

export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
export type ImageSize = '1K' | '2K' | '4K';
export type VideoAspectRatio = '16:9' | '9:16';
export type VideoResolution = '720p' | '1080p' | '4k';

// Free tier model (more generous limits)
export const FREE_TIER_IMAGE_MODEL = 'gemini-2.5-flash-image';
// Pro model (requires billing)
export const PRO_IMAGE_MODEL = 'gemini-3-pro-image-preview';

// Select model based on USE_FREE_MODEL env var
const getImageModel = () => {
    return process.env.USE_FREE_MODEL === 'true' ? FREE_TIER_IMAGE_MODEL : PRO_IMAGE_MODEL;
};

export const defaultConfig: DuoCastConfig = {
    apiKey: process.env.GEMINI_API_KEY || '',

    nanoBanana: {
        model: getImageModel(),
        aspectRatio: '16:9',
        imageSize: '2K',
    },

    veo: {
        model: 'veo-3.1-generate-preview',
        aspectRatio: '16:9',
        resolution: '720p',
    },

    pipeline: {
        outputDir: './output',
        pollIntervalMs: 10000,  // 10 seconds
        maxWaitTimeMs: 600000,  // 10 minutes
    },
};

export function validateConfig(config: DuoCastConfig): void {
    if (!config.apiKey) {
        throw new Error('GEMINI_API_KEY is required. Set it in your .env file.');
    }
}
