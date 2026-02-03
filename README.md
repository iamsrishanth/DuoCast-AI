<div align="center">

# 🎬 DuoCast-AI

### Transform Portrait Images into Talking Videos

[![Made with Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

**Generate realistic conversational videos from just two photos and a scenario description**

[Features](#-features) • [Quick Start](#-quick-start) • [Web App](#-web-application) • [CLI](#-command-line) • [How It Works](#-how-it-works)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🖼️ **Portrait to Video** | Transform static images into dynamic talking videos |
| 🎭 **Two-Person Conversations** | Create realistic dialogues between two individuals |
| 🔊 **Native Audio Generation** | AI-generated speech with lip-sync, no separate TTS needed |
| 🌐 **Web Interface** | Beautiful, modern UI with real-time progress tracking |
| 💻 **CLI Support** | Full command-line interface for automation |
| 🔑 **Flexible API Keys** | Easily switch API keys and model tiers |

---

## 🏗️ Architecture

DuoCast-AI uses a revolutionary **two-stage pipeline** that simplifies video generation:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   📷 Portrait A  │     │                 │     │                 │
│   📷 Portrait B  │────▶│  NanoBanana Pro │────▶│     Veo 3.1     │────▶ 🎬 Video
│   📝 Scenario   │     │  Scene Compose  │     │  Video + Audio  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

| Stage | Model | What It Does |
|-------|-------|--------------|
| **1** | NanoBanana Pro | Blends two portraits into a natural scene |
| **2** | Veo 3.1 | Animates the scene with speech & lip-sync |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** installed
- **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)

### Installation

```bash
# Clone the repository
git clone https://github.com/iamsrishanth/DuoCast-AI.git
cd DuoCast-AI

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Configure API Key

Edit `.env` and add your Gemini API key:

```env
GEMINI_API_KEY=your_api_key_here
USE_FREE_MODEL=true  # Set to 'false' if you have billing enabled
```

---

## 🌐 Web Application

The easiest way to use DuoCast-AI is through the web interface:

```bash
npm run web
```

Then open **http://localhost:3000** in your browser.

### Web UI Features

- 🔐 **Secure API Key Input** - Keys are saved locally, never sent to third parties
- 🔄 **Free Tier Toggle** - Switch between free and pro models instantly
- 📤 **Drag & Drop Upload** - Easy portrait image uploading
- 📊 **Live Progress Tracking** - Watch your video generate in real-time
- 💾 **Auto-Download** - Generated videos ready to download

---

## 💻 Command Line

For automation and scripting, use the CLI:

### Generate a Conversation Video

```bash
npm run generate -- generate \
  -a "./portraits/alice.jpg" \
  -b "./portraits/bob.jpg" \
  -s "Two colleagues discussing a new AI product launch in a modern office" \
  -o "./output/conversation.mp4"
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-a, --portrait-a` | First person's portrait image | *Required* |
| `-b, --portrait-b` | Second person's portrait image | *Required* |
| `-s, --scenario` | Conversation scenario description | *Required* |
| `-o, --output` | Output video path | `./output/conversation.mp4` |
| `--tone` | Conversation tone (professional, casual, dramatic, humorous) | `professional` |
| `--camera` | Camera style (static, slow_pan, dynamic) | `static` |
| `--resolution` | Video resolution (720p, 1080p, 4k) | `720p` |

### Other Commands

```bash
# Generate scene image only (Stage 1)
npm run generate -- scene-only -a portrait1.jpg -b portrait2.jpg -s "Meeting scene" -o scene.png

# Generate video from existing scene image
npm run generate -- from-scene -i scene.png -s "Discussing AI" -o video.mp4
```

---

## 🔧 Configuration

### Model Selection

DuoCast-AI supports two image generation models:

| Model | Tier | Best For |
|-------|------|----------|
| `gemini-2.5-flash-image` | Free | Testing, prototyping, free tier users |
| `gemini-3-pro-image-preview` | Paid | Production, highest quality |

Set `USE_FREE_MODEL=true` in `.env` for free tier, or toggle in the web UI.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Your Gemini API key | *Required* |
| `USE_FREE_MODEL` | Use free tier model | `true` |
| `PORT` | Web server port | `3000` |

---

## 📁 Project Structure

```
DuoCast-AI/
├── public/                 # Web UI files
│   ├── index.html         # Main HTML page
│   ├── styles.css         # Premium CSS styling
│   └── script.js          # Frontend logic
├── src/
│   ├── cli.ts             # CLI entry point
│   ├── server.ts          # Express web server
│   ├── config.ts          # Configuration management
│   ├── index.ts           # Library exports
│   ├── services/
│   │   ├── nanobanana.ts  # Scene generation service
│   │   └── veo3.ts        # Video generation service
│   ├── pipeline/
│   │   └── duocast.ts     # Main pipeline orchestrator
│   └── utils/
│       ├── image.ts       # Image utilities
│       └── prompts.ts     # Prompt templates
├── output/                 # Generated videos & scenes
├── uploads/               # Temporary upload storage
└── .env                   # API configuration
```

---

## 🎯 Example Use Cases

- **Virtual Meetings** - Create demo videos for presentation software
- **Content Creation** - Generate talking head videos for social media
- **Education** - Produce educational dialogue videos
- **Prototyping** - Quickly prototype video concepts before filming
- **Entertainment** - Create fun videos with friends' photos

---

## ⚠️ Important Notes

### Rate Limits

The Gemini API has rate limits, especially on the free tier:

- If you see a **429 error**, wait ~1 minute before retrying
- For heavy usage, enable billing on your Google Cloud account
- The free tier has daily limits - pace your generations

### Image Requirements

- **Formats**: JPEG, PNG, WebP
- **Max Size**: 20MB per image
- **Best Results**: Clear, well-lit portrait photos with visible faces

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests

---

## 📄 License

MIT License - feel free to use in your own projects!

---

<div align="center">

**Built with ❤️ using [NanoBanana Pro](https://ai.google.dev/) + [Veo 3.1](https://deepmind.google/models/veo/)**

</div>
