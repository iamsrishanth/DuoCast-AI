import fetch from 'node-fetch';

const API_BASE = 'https://api.aimlapi.com';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 30000]; // 5s, 15s, 30s

/**
 * Generate a composite scene image using NanoBanana Pro Edit.
 * Takes two portrait images (base64) and a scenario prompt,
 * producing a single landscape image with both characters.
 * Includes automatic retry with backoff for transient errors (timeouts, 5xx).
 *
 * @param {string} imageABase64 - Base64 encoded portrait A (data:image/...)
 * @param {string} imageBBase64 - Base64 encoded portrait B (data:image/...)
 * @param {string} scenarioPrompt - Text describing the scene/setting
 * @param {string} apiKey - AIML API key
 * @returns {Promise<{imageUrl: string, creditsUsed: number}>} Generated scene image URL
 */
export async function generateScene(imageABase64, imageBBase64, scenarioPrompt, apiKey) {
    const compositePrompt = `Create a realistic photographic scene. ${scenarioPrompt}. 
Left side of the image: the person from the first reference image, naturally positioned. 
Right side of the image: the person from the second reference image, naturally positioned. 
Both people should be facing each other or slightly angled toward each other. 
Maintain the exact facial features and appearance of both reference people. 
Natural lighting, high quality, photorealistic. Landscape orientation 16:9.`;

    const requestBody = JSON.stringify({
        model: 'google/nano-banana-pro-edit',
        prompt: compositePrompt,
        image_urls: [imageABase64, imageBBase64],
        aspect_ratio: '16:9',
        resolution: '2K',
        num_images: 1,
    });

    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            const delay = RETRY_DELAYS[attempt - 1] || 30000;
            console.log(`   🔄 Retry ${attempt}/${MAX_RETRIES} in ${delay / 1000}s...`);
            await sleep(delay);
        }

        try {
            const response = await fetch(`${API_BASE}/v1/images/generations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: requestBody,
            });

            // Retry on server errors (5xx) and timeouts (524)
            if (response.status >= 500) {
                const errorText = await response.text();
                lastError = new Error(`NanoBanana API error (${response.status}): Server error`);
                console.warn(`   ⚠️ Attempt ${attempt + 1}: HTTP ${response.status} — ${isHtmlResponse(errorText) ? 'Cloudflare timeout/error' : errorText.substring(0, 100)}`);
                continue;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`NanoBanana API error (${response.status}): ${errorText}`);
            }

            const data = await response.json();

            // The response can have different structures depending on the model
            let imageUrl = null;

            if (data.data && data.data[0]) {
                imageUrl = data.data[0].url || data.data[0].b64_json;
            } else if (data.images && data.images[0]) {
                imageUrl = data.images[0].url;
            } else if (data.url) {
                imageUrl = data.url;
            }

            if (!imageUrl) {
                console.log('Full API response:', JSON.stringify(data, null, 2));
                throw new Error('No image URL found in API response');
            }

            const creditsUsed = data.meta?.usage?.credits_used || 0;

            return { imageUrl, creditsUsed };
        } catch (err) {
            // Don't retry client errors (4xx) — those are our fault
            if (err.message.includes('API error (4')) {
                throw err;
            }
            lastError = err;
            if (attempt < MAX_RETRIES) {
                console.warn(`   ⚠️ Attempt ${attempt + 1} failed: ${err.message}`);
            }
        }
    }

    throw lastError || new Error('Scene generation failed after retries');
}

function isHtmlResponse(text) {
    return text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
