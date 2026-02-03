/**
 * DuoCast Pipeline
 * Main orchestrator for the two-model video generation pipeline
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { NanoBananaService, type CompositeSceneResult } from '../services/nanobanana.js';
import { Veo3Service, type VideoGenerationResult } from '../services/veo3.js';
import { saveImage, validatePortraits } from '../utils/image.js';
import { defaultConfig, validateConfig, type DuoCastConfig, type AspectRatio, type ImageSize, type VideoAspectRatio, type VideoResolution } from '../config.js';

export interface PipelineInput {
    portraitA: string;        // Path to first portrait image
    portraitB: string;        // Path to second portrait image
    scenario: string;         // Text description of the conversation scenario
    outputPath?: string;      // Output video path (optional)
}

export interface PipelineOptions {
    // Scene generation options
    sceneAspectRatio?: AspectRatio;
    sceneImageSize?: ImageSize;

    // Video generation options
    videoAspectRatio?: VideoAspectRatio;
    videoResolution?: VideoResolution;
    tone?: 'professional' | 'casual' | 'dramatic' | 'humorous';
    cameraStyle?: 'static' | 'slow_pan' | 'dynamic';

    // Pipeline options
    saveIntermediateScene?: boolean;  // Save the generated scene image
    scenePath?: string;               // Custom path for scene image
}

export interface PipelineResult {
    success: boolean;
    videoPath?: string;
    scenePath?: string;
    error?: string;
    timing: {
        sceneGenerationMs: number;
        videoGenerationMs: number;
        totalMs: number;
    };
}

export type ProgressCallback = (stage: string, message: string) => void;

export class DuoCastPipeline {
    private nanoBanana: NanoBananaService;
    private veo3: Veo3Service;
    private config: DuoCastConfig;
    private onProgress?: ProgressCallback;

    constructor(config?: Partial<DuoCastConfig>) {
        this.config = { ...defaultConfig, ...config };
        validateConfig(this.config);

        this.nanoBanana = new NanoBananaService(this.config);
        this.veo3 = new Veo3Service(this.config);
    }

    /**
     * Set a progress callback for status updates
     */
    setProgressCallback(callback: ProgressCallback): void {
        this.onProgress = callback;
    }

    private progress(stage: string, message: string): void {
        if (this.onProgress) {
            this.onProgress(stage, message);
        }
    }

    /**
     * Execute the full two-stage pipeline
     * Stage 1: Generate composite scene with NanoBanana Pro
     * Stage 2: Generate video with Veo 3.1
     */
    async processConversation(
        input: PipelineInput,
        options: PipelineOptions = {}
    ): Promise<PipelineResult> {
        const startTime = Date.now();
        let sceneGenTime = 0;
        let videoGenTime = 0;

        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║           DuoCast-AI: Two-Model Video Pipeline             ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        try {
            // Validate inputs
            console.log('📋 Validating inputs...');
            validatePortraits(input.portraitA, input.portraitB);
            this.progress('validation', 'Input validation complete');

            // Prepare output paths
            const outputDir = this.config.pipeline.outputDir;
            const timestamp = Date.now();
            const videoPath = input.outputPath || path.join(outputDir, `conversation_${timestamp}.mp4`);
            const scenePath = options.scenePath || path.join(outputDir, `scene_${timestamp}.png`);

            // Ensure output directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // ═══════════════════════════════════════════════════════════════
            // STAGE 1: Generate Composite Scene with NanoBanana Pro
            // ═══════════════════════════════════════════════════════════════
            console.log('\n┌──────────────────────────────────────────────────────────────┐');
            console.log('│ STAGE 1: Scene Composition (NanoBanana Pro)                  │');
            console.log('└──────────────────────────────────────────────────────────────┘');

            this.progress('scene', 'Starting scene generation...');
            const sceneStart = Date.now();

            const sceneResult: CompositeSceneResult = await this.nanoBanana.generateCompositeScene(
                input.portraitA,
                input.portraitB,
                input.scenario,
                {
                    aspectRatio: options.sceneAspectRatio,
                    imageSize: options.sceneImageSize,
                }
            );

            sceneGenTime = Date.now() - sceneStart;
            this.progress('scene', `Scene generated in ${Math.round(sceneGenTime / 1000)}s`);

            // Optionally save the intermediate scene image
            let savedScenePath: string | undefined;
            if (options.saveIntermediateScene !== false) {
                saveImage(sceneResult.imageData, scenePath);
                savedScenePath = scenePath;
                console.log(`   Scene saved to: ${scenePath}`);
            }

            // ═══════════════════════════════════════════════════════════════
            // STAGE 2: Generate Video with Veo 3.1
            // ═══════════════════════════════════════════════════════════════
            console.log('\n┌──────────────────────────────────────────────────────────────┐');
            console.log('│ STAGE 2: Video Generation (Veo 3.1)                          │');
            console.log('└──────────────────────────────────────────────────────────────┘');

            this.progress('video', 'Starting video generation...');
            const videoStart = Date.now();

            const videoResult: VideoGenerationResult = await this.veo3.generateVideo(
                sceneResult.imageData,
                sceneResult.mimeType,
                input.scenario,
                videoPath,
                {
                    aspectRatio: options.videoAspectRatio,
                    resolution: options.videoResolution,
                    tone: options.tone,
                    cameraStyle: options.cameraStyle,
                }
            );

            videoGenTime = Date.now() - videoStart;
            this.progress('video', `Video generated in ${Math.round(videoGenTime / 1000)}s`);

            // ═══════════════════════════════════════════════════════════════
            // COMPLETE
            // ═══════════════════════════════════════════════════════════════
            const totalTime = Date.now() - startTime;

            console.log('\n╔════════════════════════════════════════════════════════════╗');
            console.log('║                    ✅ PIPELINE COMPLETE                     ║');
            console.log('╚════════════════════════════════════════════════════════════╝');
            console.log(`\n📊 Timing Summary:`);
            console.log(`   Scene Generation: ${Math.round(sceneGenTime / 1000)}s`);
            console.log(`   Video Generation: ${Math.round(videoGenTime / 1000)}s`);
            console.log(`   Total Time: ${Math.round(totalTime / 1000)}s`);
            console.log(`\n📁 Output Files:`);
            if (savedScenePath) console.log(`   Scene: ${savedScenePath}`);
            console.log(`   Video: ${videoResult.videoPath}`);

            return {
                success: true,
                videoPath: videoResult.videoPath,
                scenePath: savedScenePath,
                timing: {
                    sceneGenerationMs: sceneGenTime,
                    videoGenerationMs: videoGenTime,
                    totalMs: totalTime,
                },
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('\n❌ Pipeline failed:', errorMessage);

            return {
                success: false,
                error: errorMessage,
                timing: {
                    sceneGenerationMs: sceneGenTime,
                    videoGenerationMs: videoGenTime,
                    totalMs: Date.now() - startTime,
                },
            };
        }
    }

    /**
     * Quick mode: Skip scene generation and use provided image
     */
    async processWithExistingScene(
        scenePath: string,
        scenario: string,
        outputPath: string,
        options: Omit<PipelineOptions, 'saveIntermediateScene' | 'scenePath'> = {}
    ): Promise<PipelineResult> {
        const startTime = Date.now();

        try {
            console.log('🎬 Using existing scene image for video generation...');

            // Load the existing scene
            const sceneBuffer = fs.readFileSync(scenePath);
            const sceneData = sceneBuffer.toString('base64');
            const ext = path.extname(scenePath).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

            const videoResult = await this.veo3.generateVideo(
                sceneData,
                mimeType,
                scenario,
                outputPath,
                {
                    aspectRatio: options.videoAspectRatio,
                    resolution: options.videoResolution,
                    tone: options.tone,
                    cameraStyle: options.cameraStyle,
                }
            );

            const totalTime = Date.now() - startTime;

            return {
                success: true,
                videoPath: videoResult.videoPath,
                scenePath,
                timing: {
                    sceneGenerationMs: 0,
                    videoGenerationMs: videoResult.durationMs,
                    totalMs: totalTime,
                },
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            return {
                success: false,
                error: errorMessage,
                timing: {
                    sceneGenerationMs: 0,
                    videoGenerationMs: 0,
                    totalMs: Date.now() - startTime,
                },
            };
        }
    }
}
