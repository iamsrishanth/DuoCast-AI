import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generateScene } from './services/imageGen.js';
import { generateVideo } from './services/videoGen.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.AIML_API_KEY;

if (!API_KEY) {
    console.error('❌ AIML_API_KEY not found in .env');
    process.exit(1);
}

// Persistent credits tracker (JSON file)
const STARTING_CREDITS = 20_000_000;
const CREDITS_FILE = path.resolve(__dirname, 'credits.json');

function loadCredits() {
    try {
        if (fs.existsSync(CREDITS_FILE)) {
            const data = JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf-8'));
            return data.creditsUsed || 0;
        }
    } catch (err) {
        console.warn('⚠️ Could not read credits.json, starting fresh:', err.message);
    }
    return 0;
}

function saveCredits() {
    const data = {
        startingCredits: STARTING_CREDITS,
        creditsUsed: creditsUsedTotal,
        creditsRemaining: STARTING_CREDITS - creditsUsedTotal,
        lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(CREDITS_FILE, JSON.stringify(data, null, 2));
}

let creditsUsedTotal = loadCredits();
console.log(`💰 Credits loaded: ${(STARTING_CREDITS - creditsUsedTotal).toLocaleString()} remaining`);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Multer config for image uploads (in-memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

/**
 * POST /api/generate-scene
 * Accepts two portrait images + scenario text.
 * Returns a composite scene image URL.
 */
app.post(
    '/api/generate-scene',
    upload.fields([
        { name: 'portraitA', maxCount: 1 },
        { name: 'portraitB', maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const { scenario } = req.body;

            if (!req.files?.portraitA?.[0] || !req.files?.portraitB?.[0]) {
                return res.status(400).json({ error: 'Both portrait images are required' });
            }
            if (!scenario) {
                return res.status(400).json({ error: 'Scenario text is required' });
            }

            const portraitA = req.files.portraitA[0];
            const portraitB = req.files.portraitB[0];

            // Convert to base64 data URIs
            const imageABase64 = `data:${portraitA.mimetype};base64,${portraitA.buffer.toString('base64')}`;
            const imageBBase64 = `data:${portraitB.mimetype};base64,${portraitB.buffer.toString('base64')}`;

            console.log('🎨 Generating scene...');
            const result = await generateScene(imageABase64, imageBBase64, scenario, API_KEY);
            console.log('✅ Scene generated:', result.imageUrl?.substring(0, 80) + '...');

            if (result.creditsUsed) {
                creditsUsedTotal += result.creditsUsed;
                saveCredits();
                console.log(`   Credits used: ${result.creditsUsed} | Remaining: ${STARTING_CREDITS - creditsUsedTotal}`);
            }

            res.json({
                success: true,
                imageUrl: result.imageUrl,
                creditsUsed: result.creditsUsed,
                creditsRemaining: STARTING_CREDITS - creditsUsedTotal,
            });
        } catch (err) {
            console.error('❌ Scene generation error:', err.message);
            res.status(500).json({ error: err.message });
        }
    }
);

/**
 * POST /api/generate-video
 * Accepts scene image URL + video prompt + duration.
 * Polls Veo 3.1 until video is ready, then returns URL.
 */
app.post('/api/generate-video', async (req, res) => {
    try {
        const { sceneImageUrl, videoPrompt, duration = 8 } = req.body;

        if (!sceneImageUrl) {
            return res.status(400).json({ error: 'Scene image URL is required' });
        }
        if (!videoPrompt) {
            return res.status(400).json({ error: 'Video prompt is required' });
        }

        console.log('🎬 Generating video...');
        const result = await generateVideo(
            sceneImageUrl,
            videoPrompt,
            duration,
            API_KEY,
            (statusUpdate) => {
                console.log(`   Status: ${statusUpdate.status} (ID: ${statusUpdate.generationId})`);
            }
        );
        console.log('✅ Video generated:', result.videoUrl?.substring(0, 80) + '...');

        if (result.creditsUsed) {
            creditsUsedTotal += result.creditsUsed;
            saveCredits();
            console.log(`   Credits used: ${result.creditsUsed} | Remaining: ${STARTING_CREDITS - creditsUsedTotal}`);
        }

        res.json({
            success: true,
            videoUrl: result.videoUrl,
            generationId: result.generationId,
            creditsUsed: result.creditsUsed,
            creditsRemaining: STARTING_CREDITS - creditsUsedTotal,
        });
    } catch (err) {
        console.error('❌ Video generation error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Credits endpoint
app.get('/api/credits', (req, res) => {
    res.json({
        startingCredits: STARTING_CREDITS,
        creditsUsed: creditsUsedTotal,
        creditsRemaining: STARTING_CREDITS - creditsUsedTotal,
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`\n🚀 DuoCast AI Server running on http://localhost:${PORT}`);
    console.log(`   API Key: ${API_KEY.substring(0, 8)}...`);
});
