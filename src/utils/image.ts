/**
 * Image Utilities
 * Handles image loading, validation, and encoding for API submission
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ImageData {
    data: string;       // Base64 encoded image data
    mimeType: string;   // MIME type (image/png, image/jpeg, etc.)
    path: string;       // Original file path
}

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB (API docs say 10MB but base64 inflates size)

/**
 * Load and validate an image from the filesystem
 */
export function loadImage(imagePath: string): ImageData {
    const absolutePath = path.resolve(imagePath);

    // Check file exists
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Image file not found: ${absolutePath}`);
    }

    // Check file extension
    const ext = path.extname(absolutePath).toLowerCase();
    if (!SUPPORTED_FORMATS.includes(ext)) {
        throw new Error(`Unsupported image format: ${ext}. Supported: ${SUPPORTED_FORMATS.join(', ')}`);
    }

    // Read file and check size
    const buffer = fs.readFileSync(absolutePath);
    if (buffer.length > MAX_FILE_SIZE) {
        throw new Error(`Image file too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB. Max: 10MB`);
    }

    // Get MIME type
    const mimeType = getMimeType(ext);

    // Convert to base64
    const data = buffer.toString('base64');

    return {
        data,
        mimeType,
        path: absolutePath,
    };
}

/**
 * Get MIME type from file extension
 */
function getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
    };
    return mimeTypes[ext] || 'image/png';
}

/**
 * Save base64 image data to file
 */
export function saveImage(base64Data: string, outputPath: string): void {
    const buffer = Buffer.from(base64Data, 'base64');
    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, buffer);
}

/**
 * Validate that both portrait images exist
 */
export function validatePortraits(portraitA: string, portraitB: string): void {
    if (!fs.existsSync(portraitA)) {
        throw new Error(`Portrait A not found: ${portraitA}`);
    }
    if (!fs.existsSync(portraitB)) {
        throw new Error(`Portrait B not found: ${portraitB}`);
    }
}
