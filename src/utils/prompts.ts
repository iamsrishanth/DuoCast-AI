/**
 * Prompt Templates
 * Builds optimized prompts for NanoBanana Pro and Veo 3.1
 */

export interface ScenePromptOptions {
    scenario: string;
    setting?: string;
    positionA?: string;
    positionB?: string;
    lighting?: string;
    style?: string;
}

export interface VideoPromptOptions {
    scenario: string;
    tone?: 'professional' | 'casual' | 'dramatic' | 'humorous';
    cameraStyle?: 'static' | 'slow_pan' | 'dynamic';
    includeAudio?: boolean;
}

/**
 * Build a scene composition prompt for NanoBanana Pro
 * Creates a prompt that places both portraits into a natural scene
 */
export function buildScenePrompt(options: ScenePromptOptions): string {
    const {
        scenario,
        setting = 'modern office meeting room',
        positionA = 'on the left side of the frame',
        positionB = 'on the right side of the frame',
        lighting = 'natural lighting',
        style = 'photorealistic, high quality',
    } = options;

    return `Create a detailed scene composition for a conversation video:

Scene: ${scenario}

Setting: ${setting}

Character Placement:
- Person A (first image): ${positionA}, seated or standing naturally
- Person B (second image): ${positionB}, facing Person A

Requirements:
- Both people should be clearly visible in the frame
- They should appear to be engaged in conversation
- Maintain the exact facial features and identity from the reference images
- ${lighting}
- Professional composition suitable for video
- Landscape orientation (16:9 aspect ratio)
- ${style}

The image should look like a still frame from a professional video interview or meeting.`;
}

/**
 * Build a video generation prompt for Veo 3.1
 * Creates a prompt with dialogue and audio instructions
 */
export function buildVideoPrompt(options: VideoPromptOptions): string {
    const {
        scenario,
        tone = 'professional',
        cameraStyle = 'static',
        includeAudio = true,
    } = options;

    const toneDescriptions: Record<string, string> = {
        professional: 'Professional and articulate tone, clear speech, thoughtful expressions',
        casual: 'Relaxed and friendly tone, natural pauses, warm expressions',
        dramatic: 'Intense and emotional tone, expressive faces, dramatic pauses',
        humorous: 'Light-hearted and playful tone, occasional smiles, animated expressions',
    };

    const cameraDescriptions: Record<string, string> = {
        static: 'Camera remains static, focused on both subjects',
        slow_pan: 'Camera slowly pans between speakers during their turns',
        dynamic: 'Camera has subtle movement, creating a cinematic feel',
    };

    let prompt = `Two people having a conversation: ${scenario}

Visual Direction:
- ${cameraDescriptions[cameraStyle]}
- Both characters show natural expressions and subtle head movements while speaking
- Realistic lip synchronization with speech
- Natural eye contact and body language
- ${toneDescriptions[tone]}`;

    if (includeAudio) {
        prompt += `

Audio Direction:
- Generate natural dialogue synchronized with lip movements
- Include appropriate ambient room sound
- Clear, distinct voices for each speaker
- Natural conversation rhythm with pauses and reactions`;
    }

    return prompt;
}

/**
 * Create a combined prompt for the full conversation scenario
 */
export function buildConversationContext(
    scenario: string,
    speakerAName: string = 'Person A',
    speakerBName: string = 'Person B'
): string {
    return `${speakerAName} and ${speakerBName} are having a conversation. ${scenario}. 
Generate realistic dialogue between them with natural back-and-forth exchanges. 
Each person should speak 2-3 sentences before the other responds.`;
}
