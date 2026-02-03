#!/usr/bin/env node

/**
 * DuoCast-AI CLI
 * Command-line interface for generating conversational videos
 */

import { Command } from 'commander';
import { DuoCastPipeline } from './pipeline/duocast.js';
import { defaultConfig } from './config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const program = new Command();

program
    .name('duocast')
    .description('Generate conversational videos from two portrait images')
    .version('1.0.0');

// Main generate command
program
    .command('generate')
    .description('Generate a conversational video from two portraits')
    .requiredOption('-a, --portrait-a <path>', 'Path to first person\'s portrait image')
    .requiredOption('-b, --portrait-b <path>', 'Path to second person\'s portrait image')
    .requiredOption('-s, --scenario <text>', 'Description of the conversation scenario')
    .option('-o, --output <path>', 'Output video path', './output/conversation.mp4')
    .option('--tone <type>', 'Conversation tone: professional, casual, dramatic, humorous', 'professional')
    .option('--camera <style>', 'Camera style: static, slow_pan, dynamic', 'static')
    .option('--resolution <res>', 'Video resolution: 720p, 1080p, 4k', '720p')
    .option('--aspect-ratio <ratio>', 'Video aspect ratio: 16:9, 9:16', '16:9')
    .option('--no-save-scene', 'Skip saving the intermediate scene image')
    .action(async (options) => {
        console.log('\n🎬 DuoCast-AI Video Generator\n');

        // Validate input files exist
        if (!fs.existsSync(options.portraitA)) {
            console.error(`❌ Portrait A not found: ${options.portraitA}`);
            process.exit(1);
        }
        if (!fs.existsSync(options.portraitB)) {
            console.error(`❌ Portrait B not found: ${options.portraitB}`);
            process.exit(1);
        }

        // Initialize pipeline
        const pipeline = new DuoCastPipeline();

        // Run the pipeline
        const result = await pipeline.processConversation(
            {
                portraitA: options.portraitA,
                portraitB: options.portraitB,
                scenario: options.scenario,
                outputPath: options.output,
            },
            {
                tone: options.tone as any,
                cameraStyle: options.camera as any,
                videoResolution: options.resolution as any,
                videoAspectRatio: options.aspectRatio as any,
                saveIntermediateScene: options.saveScene !== false,
            }
        );

        if (result.success) {
            console.log('\n🎉 Video generation complete!');
            console.log(`   Output: ${result.videoPath}`);
            process.exit(0);
        } else {
            console.error('\n❌ Video generation failed:', result.error);
            process.exit(1);
        }
    });

// Quick mode: use existing scene image
program
    .command('from-scene')
    .description('Generate video from an existing scene image')
    .requiredOption('-i, --scene <path>', 'Path to the scene image')
    .requiredOption('-s, --scenario <text>', 'Description of the conversation')
    .option('-o, --output <path>', 'Output video path', './output/conversation.mp4')
    .option('--tone <type>', 'Conversation tone', 'professional')
    .option('--camera <style>', 'Camera style', 'static')
    .option('--resolution <res>', 'Video resolution', '720p')
    .action(async (options) => {
        console.log('\n🎬 DuoCast-AI: Video from Scene\n');

        if (!fs.existsSync(options.scene)) {
            console.error(`❌ Scene image not found: ${options.scene}`);
            process.exit(1);
        }

        const pipeline = new DuoCastPipeline();

        const result = await pipeline.processWithExistingScene(
            options.scene,
            options.scenario,
            options.output,
            {
                tone: options.tone as any,
                cameraStyle: options.camera as any,
                videoResolution: options.resolution as any,
            }
        );

        if (result.success) {
            console.log('\n🎉 Video generation complete!');
            console.log(`   Output: ${result.videoPath}`);
            process.exit(0);
        } else {
            console.error('\n❌ Video generation failed:', result.error);
            process.exit(1);
        }
    });

// Scene-only mode: just generate the composite scene
program
    .command('scene-only')
    .description('Generate only the composite scene image (Stage 1)')
    .requiredOption('-a, --portrait-a <path>', 'Path to first person\'s portrait image')
    .requiredOption('-b, --portrait-b <path>', 'Path to second person\'s portrait image')
    .requiredOption('-s, --scenario <text>', 'Description of the scene')
    .option('-o, --output <path>', 'Output scene image path', './output/scene.png')
    .option('--aspect-ratio <ratio>', 'Image aspect ratio', '16:9')
    .option('--size <size>', 'Image size: 1K, 2K, 4K', '2K')
    .action(async (options) => {
        console.log('\n🎨 DuoCast-AI: Scene Generation\n');

        if (!fs.existsSync(options.portraitA)) {
            console.error(`❌ Portrait A not found: ${options.portraitA}`);
            process.exit(1);
        }
        if (!fs.existsSync(options.portraitB)) {
            console.error(`❌ Portrait B not found: ${options.portraitB}`);
            process.exit(1);
        }

        // Import NanoBanana service directly
        const { NanoBananaService } = await import('./services/nanobanana.js');
        const { saveImage } = await import('./utils/image.js');

        const nanoBanana = new NanoBananaService(defaultConfig);

        try {
            const result = await nanoBanana.generateCompositeScene(
                options.portraitA,
                options.portraitB,
                options.scenario,
                {
                    aspectRatio: options.aspectRatio as any,
                    imageSize: options.size as any,
                }
            );

            // Ensure output directory exists
            const outputDir = path.dirname(options.output);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            saveImage(result.imageData, options.output);
            console.log(`\n✅ Scene saved to: ${options.output}`);
            process.exit(0);
        } catch (error) {
            console.error('\n❌ Scene generation failed:', error);
            process.exit(1);
        }
    });

// Parse and run
program.parse();
