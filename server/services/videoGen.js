import fetch from 'node-fetch';

const API_BASE = 'https://api.aimlapi.com/v2';
const POLL_INTERVAL_MS = 10_000; // 10 seconds
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 30000]; // 5s, 15s, 30s

/**
 * Generate a video with audio from a scene image using Google Veo 3.1 I2V.
 * Creates an async generation task, then polls until complete.
 * Includes automatic retry with backoff for transient errors (timeouts, 5xx).
 *
 * @param {string} sceneImageUrl - URL of the scene image to animate
 * @param {string} videoPrompt - Text describing the video action/dialogue
 * @param {number} duration - Video duration in seconds (4, 6, or 8)
 * @param {string} apiKey - AIML API key
 * @param {function} onStatus - Optional callback for status updates
 * @returns {Promise<{videoUrl: string, generationId: string, creditsUsed: number}>}
 */
export async function generateVideo(sceneImageUrl, videoPrompt, duration, apiKey, onStatus) {
    // Step 1: Create video generation task (with retry)
    const requestBody = JSON.stringify({
        model: 'google/veo-3.1-i2v',
        prompt: videoPrompt,
        image_url: sceneImageUrl,
        generate_audio: true,
        duration: String(duration),
        aspect_ratio: '16:9',
        resolution: '1080p',
    });

    let generationId = null;
    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            const delay = RETRY_DELAYS[attempt - 1] || 30000;
            console.log(`   🔄 Retry ${attempt}/${MAX_RETRIES} in ${delay / 1000}s...`);
            await sleep(delay);
        }

        try {
            const createResponse = await fetch(`${API_BASE}/video/generations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: requestBody,
            });

            // Retry on server errors (5xx) and timeouts
            if (createResponse.status >= 500) {
                const errorText = await createResponse.text();
                lastError = new Error(`Veo 3.1 create error (${createResponse.status}): Server error`);
                console.warn(`   ⚠️ Attempt ${attempt + 1}: HTTP ${createResponse.status} — ${isHtmlResponse(errorText) ? 'Cloudflare timeout/error' : errorText.substring(0, 100)}`);
                continue;
            }

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`Veo 3.1 create error (${createResponse.status}): ${errorText}`);
            }

            const createData = await createResponse.json();
            generationId = createData.id;

            if (!generationId) {
                throw new Error('No generation ID received from Veo 3.1 API');
            }

            break; // Success — exit retry loop
        } catch (err) {
            if (err.message.includes('error (4')) {
                throw err; // Don't retry client errors
            }
            lastError = err;
            if (attempt < MAX_RETRIES) {
                console.warn(`   ⚠️ Attempt ${attempt + 1} failed: ${err.message}`);
            }
        }
    }

    if (!generationId) {
        throw lastError || new Error('Video creation failed after retries');
    }

    if (onStatus) onStatus({ status: 'queued', generationId });

    // Step 2: Poll for completion (with resilience to transient poll failures)
    const startTime = Date.now();
    let consecutivePollErrors = 0;

    while (Date.now() - startTime < TIMEOUT_MS) {
        await sleep(POLL_INTERVAL_MS);

        try {
            const pollResponse = await fetch(
                `${API_BASE}/video/generations?generation_id=${generationId}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            // Tolerate transient poll failures (up to 5 in a row)
            if (pollResponse.status >= 500) {
                consecutivePollErrors++;
                console.warn(`   ⚠️ Poll error (${pollResponse.status}), attempt ${consecutivePollErrors}/5`);
                if (consecutivePollErrors >= 5) {
                    throw new Error(`Veo 3.1 polling failed after 5 consecutive server errors`);
                }
                continue;
            }

            if (!pollResponse.ok) {
                const errorText = await pollResponse.text();
                throw new Error(`Veo 3.1 poll error (${pollResponse.status}): ${errorText}`);
            }

            consecutivePollErrors = 0; // Reset on success
            const pollData = await pollResponse.json();
            const status = pollData.status;

            if (onStatus) onStatus({ status, generationId });

            if (status === 'completed') {
                const videoUrl = pollData.video?.url;
                if (!videoUrl) {
                    throw new Error('Video completed but no URL found in response');
                }
                const creditsUsed = pollData.meta?.usage?.credits_used || 0;
                return { videoUrl, generationId, creditsUsed };
            }

            if (status === 'failed' || status === 'error') {
                const errMsg = pollData.error?.message || 'Unknown error';
                throw new Error(`Video generation failed: ${errMsg}`);
            }

            // Continue polling for: queued, generating, waiting, active
        } catch (err) {
            if (err.message.includes('poll error') && !err.message.includes('server errors')) {
                throw err; // Non-transient errors
            }
            if (err.message.includes('failed') || err.message.includes('completed')) {
                throw err; // Business logic errors
            }
            consecutivePollErrors++;
            console.warn(`   ⚠️ Poll exception: ${err.message}, attempt ${consecutivePollErrors}/5`);
            if (consecutivePollErrors >= 5) throw err;
        }
    }

    throw new Error(`Video generation timed out after ${TIMEOUT_MS / 1000}s`);
}

function isHtmlResponse(text) {
    return text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
