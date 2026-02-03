/**
 * DuoCast-AI
 * Two-model pipeline for generating conversational videos
 * 
 * Uses NanoBanana Pro (Gemini 3 Pro Image) for scene composition
 * and Veo 3.1 for video generation with native audio synthesis.
 */

export { DuoCastPipeline, type PipelineInput, type PipelineOptions, type PipelineResult, type ProgressCallback } from './pipeline/duocast.js';
export { NanoBananaService, type CompositeSceneResult, type NanoBananaOptions } from './services/nanobanana.js';
export { Veo3Service, type VideoGenerationResult, type Veo3Options } from './services/veo3.js';
export { defaultConfig, validateConfig, type DuoCastConfig, type AspectRatio, type ImageSize, type VideoAspectRatio, type VideoResolution } from './config.js';
export { loadImage, saveImage, validatePortraits, type ImageData } from './utils/image.js';
export { buildScenePrompt, buildVideoPrompt, buildConversationContext, type ScenePromptOptions, type VideoPromptOptions } from './utils/prompts.js';

/**
 * Quick helper to create a video from two portraits
 * 
 * @example
 * ```typescript
 * import { createConversationVideo } from 'duocast-ai';
 * 
 * const result = await createConversationVideo(
 *   './portraits/alice.jpg',
 *   './portraits/bob.jpg',
 *   'Two colleagues discussing a new AI product launch in a modern office',
 *   './output/conversation.mp4'
 * );
 * ```
 */
export async function createConversationVideo(
    portraitA: string,
    portraitB: string,
    scenario: string,
    outputPath: string
): Promise<{ success: boolean; videoPath?: string; error?: string }> {
    const pipeline = new DuoCastPipeline();
    const result = await pipeline.processConversation({
        portraitA,
        portraitB,
        scenario,
        outputPath,
    });

    return {
        success: result.success,
        videoPath: result.videoPath,
        error: result.error,
    };
}
