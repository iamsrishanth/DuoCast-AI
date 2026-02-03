/**
 * Veo 3.1 Service
 * Handles video generation with native audio synthesis
 */

import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildVideoPrompt, type VideoPromptOptions } from '../utils/prompts.js';
import type { DuoCastConfig, VideoAspectRatio, VideoResolution } from '../config.js';

export interface VideoGenerationResult {
    videoPath: string;      // Path to saved video file
    prompt: string;         // The prompt used for generation
    durationMs: number;     // Time taken to generate
}

export interface Veo3Options {
    aspectRatio?: VideoAspectRatio;
    resolution?: VideoResolution;
    tone?: 'professional' | 'casual' | 'dramatic' | 'humorous';
    cameraStyle?: 'static' | 'slow_pan' | 'dynamic';
    customPrompt?: string;
}

export class Veo3Service {
    private ai: GoogleGenAI;
    private config: DuoCastConfig;

    constructor(config: DuoCastConfig) {
        this.config = config;
        this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    }

    /**
     * Generate a video from a scene image with audio
     */
    async generateVideo(
        sceneImageData: string,
        sceneImageMimeType: string,
        scenario: string,
        outputPath: string,
        options: Veo3Options = {}
    ): Promise<VideoGenerationResult> {
        const startTime = Date.now();

        // Build the video prompt
        const promptOptions: VideoPromptOptions = {
            scenario,
            tone: options.tone || 'professional',
            cameraStyle: options.cameraStyle || 'static',
            includeAudio: true,
        };

        const prompt = options.customPrompt || buildVideoPrompt(promptOptions);

        console.log('🎬 Generating video with Veo 3.1...');
        console.log(`   Model: ${this.config.veo.model}`);
        console.log(`   Aspect Ratio: ${options.aspectRatio || this.config.veo.aspectRatio}`);
        console.log(`   Resolution: ${options.resolution || this.config.veo.resolution}`);

        try {
            // Create image object for Veo
            const image = {
                imageBytes: sceneImageData,
                mimeType: sceneImageMimeType,
            };

            // Start video generation
            // @ts-ignore - generateVideos is available in the SDK
            let operation = await this.ai.models.generateVideos({
                model: this.config.veo.model,
                prompt: prompt,
                image: image,
                config: {
                    aspectRatio: options.aspectRatio || this.config.veo.aspectRatio,
                    resolution: options.resolution || this.config.veo.resolution,
                },
            });

            console.log('⏳ Video generation started. Polling for completion...');

            // Poll for completion
            const maxWaitTime = this.config.pipeline.maxWaitTimeMs;
            const pollInterval = this.config.pipeline.pollIntervalMs;
            let elapsedTime = 0;

            while (!operation.done) {
                if (elapsedTime >= maxWaitTime) {
                    throw new Error(`Video generation timed out after ${maxWaitTime / 1000} seconds`);
                }

                await this.sleep(pollInterval);
                elapsedTime += pollInterval;

                const minutes = Math.floor(elapsedTime / 60000);
                const seconds = Math.floor((elapsedTime % 60000) / 1000);
                console.log(`   Waiting... (${minutes}m ${seconds}s elapsed)`);

                // @ts-ignore - getVideosOperation is available in the SDK
                operation = await this.ai.operations.getVideosOperation({
                    operation: operation,
                });
            }

            // Download the generated video
            console.log('📥 Downloading generated video...');

            const generatedVideo = operation.response?.generatedVideos?.[0];
            if (!generatedVideo?.video) {
                throw new Error('No video in generation response');
            }

            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Download and save the video
            // @ts-ignore - files.download is available in the SDK
            await this.ai.files.download({
                file: generatedVideo.video,
                downloadPath: outputPath,
            });

            const durationMs = Date.now() - startTime;
            console.log(`✅ Video saved to: ${outputPath}`);
            console.log(`   Generation time: ${Math.round(durationMs / 1000)}s`);

            return {
                videoPath: outputPath,
                prompt,
                durationMs,
            };
        } catch (error) {
            console.error('❌ Failed to generate video:', error);
            throw error;
        }
    }

    /**
     * Generate video directly from text prompt (no image input)
     */
    async generateVideoFromText(
        scenario: string,
        outputPath: string,
        options: Veo3Options = {}
    ): Promise<VideoGenerationResult> {
        const startTime = Date.now();

        const promptOptions: VideoPromptOptions = {
            scenario,
            tone: options.tone || 'professional',
            cameraStyle: options.cameraStyle || 'static',
            includeAudio: true,
        };

        const prompt = options.customPrompt || buildVideoPrompt(promptOptions);

        console.log('🎬 Generating video from text with Veo 3.1...');

        try {
            // @ts-ignore - generateVideos is available in the SDK
            let operation = await this.ai.models.generateVideos({
                model: this.config.veo.model,
                prompt: prompt,
                config: {
                    aspectRatio: options.aspectRatio || this.config.veo.aspectRatio,
                    resolution: options.resolution || this.config.veo.resolution,
                },
            });

            console.log('⏳ Video generation started. Polling for completion...');

            // Poll for completion
            while (!operation.done) {
                await this.sleep(this.config.pipeline.pollIntervalMs);
                console.log('   Still processing...');
                // @ts-ignore
                operation = await this.ai.operations.getVideosOperation({
                    operation: operation,
                });
            }

            // Download the video
            const generatedVideo = operation.response?.generatedVideos?.[0];
            if (!generatedVideo?.video) {
                throw new Error('No video in generation response');
            }

            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // @ts-ignore
            await this.ai.files.download({
                file: generatedVideo.video,
                downloadPath: outputPath,
            });

            const durationMs = Date.now() - startTime;
            console.log(`✅ Video saved to: ${outputPath}`);

            return {
                videoPath: outputPath,
                prompt,
                durationMs,
            };
        } catch (error) {
            console.error('❌ Failed to generate video:', error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
