/**
 * DuoCast-AI Web Server
 * Express server with API endpoints for the two-model pipeline
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { buildScenePrompt, buildVideoPrompt } from './utils/prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/output', express.static(path.join(__dirname, '../output')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
    }
});

// Store generation status
const generations: Map<string, {
    status: 'pending' | 'scene' | 'video' | 'complete' | 'error';
    progress: string;
    scenePath?: string;
    videoPath?: string;
    error?: string;
}> = new Map();

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate scene endpoint
app.post('/api/generate', upload.fields([
    { name: 'portraitA', maxCount: 1 },
    { name: 'portraitB', maxCount: 1 }
]), async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files.portraitA || !files.portraitB) {
        return res.status(400).json({ error: 'Both portrait images are required' });
    }

    const { scenario, apiKey, useFreeModel, tone, cameraStyle, resolution } = req.body;

    if (!scenario) {
        return res.status(400).json({ error: 'Scenario description is required' });
    }

    if (!apiKey) {
        return res.status(400).json({ error: 'API key is required' });
    }

    const generationId = Date.now().toString();
    generations.set(generationId, { status: 'pending', progress: 'Starting...' });

    // Start generation in background
    processGeneration(generationId, {
        portraitAPath: files.portraitA[0].path,
        portraitBPath: files.portraitB[0].path,
        scenario,
        apiKey,
        useFreeModel: useFreeModel === 'true',
        tone: tone || 'professional',
        cameraStyle: cameraStyle || 'static',
        resolution: resolution || '720p',
    });

    res.json({ generationId, status: 'started' });
});

// Check generation status
app.get('/api/status/:id', (req, res) => {
    const generation = generations.get(req.params.id);
    if (!generation) {
        return res.status(404).json({ error: 'Generation not found' });
    }
    res.json(generation);
});

// Background generation process
async function processGeneration(id: string, options: {
    portraitAPath: string;
    portraitBPath: string;
    scenario: string;
    apiKey: string;
    useFreeModel: boolean;
    tone: string;
    cameraStyle: string;
    resolution: string;
}) {
    const update = (status: any, progress: string, extra?: any) => {
        generations.set(id, { status, progress, ...extra });
    };

    try {
        const ai = new GoogleGenAI({ apiKey: options.apiKey });
        const imageModel = options.useFreeModel ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';

        // ========== STAGE 1: Scene Generation ==========
        update('scene', 'Generating composite scene...');

        const portraitA = fs.readFileSync(options.portraitAPath);
        const portraitB = fs.readFileSync(options.portraitBPath);

        const scenePrompt = buildScenePrompt({ scenario: options.scenario });

        const sceneResponse = await ai.models.generateContent({
            model: imageModel,
            contents: [
                { text: scenePrompt },
                { inlineData: { mimeType: 'image/jpeg', data: portraitA.toString('base64') } },
                { inlineData: { mimeType: 'image/jpeg', data: portraitB.toString('base64') } },
            ],
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
            },
        });

        // Extract scene image
        let sceneImageData: string | null = null;
        const candidate = sceneResponse.candidates?.[0];
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData?.data) {
                    sceneImageData = part.inlineData.data;
                    break;
                }
            }
        }

        if (!sceneImageData) {
            throw new Error('Failed to generate scene image');
        }

        // Save scene image
        const outputDir = path.join(__dirname, '../output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const scenePath = path.join(outputDir, `scene_${id}.png`);
        fs.writeFileSync(scenePath, Buffer.from(sceneImageData, 'base64'));

        update('scene', 'Scene generated! Starting video generation...', { scenePath: `/output/scene_${id}.png` });

        // ========== STAGE 2: Video Generation ==========
        update('video', 'Generating video with Veo 3.1...');

        const videoPrompt = buildVideoPrompt({
            scenario: options.scenario,
            tone: options.tone as any,
            cameraStyle: options.cameraStyle as any,
            includeAudio: true,
        });

        // @ts-ignore
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt: videoPrompt,
            image: {
                imageBytes: sceneImageData,
                mimeType: 'image/png',
            },
            config: {
                aspectRatio: '16:9',
                resolution: options.resolution,
            },
        });

        // Poll for completion
        let attempts = 0;
        const maxAttempts = 60; // 10 minutes max

        while (!operation.done && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            attempts++;
            update('video', `Video generating... (${attempts * 10}s elapsed)`);
            // @ts-ignore
            operation = await ai.operations.getVideosOperation({ operation });
        }

        if (!operation.done) {
            throw new Error('Video generation timed out');
        }

        // Download video
        const generatedVideo = operation.response?.generatedVideos?.[0];
        if (!generatedVideo?.video) {
            throw new Error('No video in response');
        }

        const videoPath = path.join(outputDir, `video_${id}.mp4`);
        // @ts-ignore
        await ai.files.download({
            file: generatedVideo.video,
            downloadPath: videoPath,
        });

        update('complete', 'Generation complete!', {
            scenePath: `/output/scene_${id}.png`,
            videoPath: `/output/video_${id}.mp4`,
        });

        // Cleanup uploaded files
        fs.unlinkSync(options.portraitAPath);
        fs.unlinkSync(options.portraitBPath);

    } catch (error: any) {
        console.error('Generation error:', error);
        update('error', 'Generation failed', { error: error.message || String(error) });
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║              DuoCast-AI Web Server                         ║
╚════════════════════════════════════════════════════════════╝

🌐 Server running at: http://localhost:${PORT}
📁 Static files from: public/
📤 Uploads stored in: uploads/
📥 Output files in: output/

Ready to generate conversational videos!
  `);
});

export default app;
