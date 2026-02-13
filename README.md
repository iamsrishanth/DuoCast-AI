# 🎬 DuoCast AI

**Generate realistic conversational videos from two portrait images using AI.**

Upload two portraits, describe a scene, and DuoCast AI composes them into a natural-looking conversation video — complete with AI-generated audio, speech, and body language.

---

## ✨ Features

- 🖼️ **Drag-and-drop** portrait uploads with live preview
- 🎨 **AI scene composition** — merges two portraits into a cinematic scene
- 🎥 **AI video generation** — animates the scene with natural dialogue and audio
- ⏱️ **Adjustable duration** — 4s, 6s, or 8s output
- 💰 **Credits tracker** — real-time remaining credits display (persisted to disk)
- 🌙 **Premium dark UI** — glassmorphism, gradient accents, micro-animations

---

## 🧠 How It Works

DuoCast AI uses a **two-model pipeline** powered by [AIML API](https://aimlapi.com):

| Step | Model | What It Does |
|------|-------|-------------|
| 1 | **NanoBanana Pro Edit** | Composites two portraits into a single scene image (16:9, 2K) |
| 2 | **Google Veo 3.1 I2V** | Converts the scene image into a video with AI-generated audio (1080p) |

```
Portrait A ─┐
             ├─▶ NanoBanana Pro Edit ─▶ Scene Image ─▶ Veo 3.1 I2V ─▶ Video + Audio
Portrait B ─┘
```

---

## 📁 Project Structure

```
DuoCast-AI/
├── .env                    # API key (not committed)
├── .env.example            # Template for .env
├── .gitignore
├── README.md
│
├── server/                 # Node.js / Express backend
│   ├── index.js            # Express app, routes, credits tracker
│   ├── package.json
│   ├── credits.json        # Persistent credits state (auto-generated)
│   └── services/
│       ├── imageGen.js     # NanoBanana Pro Edit API integration
│       └── videoGen.js     # Veo 3.1 I2V API integration (async polling)
│
└── client/                 # React / Vite frontend
    ├── vite.config.js      # Dev proxy → backend on :5000
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx          # Main 3-step pipeline UI
        ├── index.css        # Dark theme, glassmorphism styles
        └── components/
            ├── ImageUpload.jsx   # Drag-and-drop image upload
            └── VideoPlayer.jsx   # Video player + download
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **AIML API key** — sign up at [aimlapi.com](https://aimlapi.com)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/DuoCast-AI.git
cd DuoCast-AI
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```
AIML_API_KEY=your_actual_api_key_here
```

### 3. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 4. Start the application

Open **two terminals**:

```bash
# Terminal 1 — Backend (port 5000)
cd server
npm start

# Terminal 2 — Frontend (port 5173)
cd client
npm run dev
```

### 5. Open in browser

Navigate to **<http://localhost:5173>**

---

## 🎮 Usage

1. **Upload two portrait images** — drag & drop or click the upload zones
2. **Describe the scene** — e.g., *"Two colleagues in a modern office meeting room"*
3. **Optionally customize** the video action prompt
4. **Select duration** — 4s, 6s, or 8s
5. **Click "Generate DuoCast"** and wait for the pipeline to complete
6. **Watch and download** the generated video with audio

---

## 💰 Credits System

- Starting balance: **20,000,000 credits**
- Credits are consumed per API call (scene + video generation)
- Balance is displayed in the header and **persisted to `server/credits.json`**
- Survives server restarts — no data loss

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/generate-scene` | Upload 2 portraits + scenario → scene image URL |
| `POST` | `/api/generate-video` | Scene image URL + prompt + duration → video URL |
| `GET`  | `/api/credits` | Get current credits balance |
| `GET`  | `/api/health` | Health check |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7 |
| Backend | Node.js, Express.js |
| APIs | AIML API (NanoBanana Pro Edit, Google Veo 3.1 I2V) |
| Styling | Vanilla CSS (custom dark theme) |

---

## 📝 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AIML_API_KEY` | ✅ | Your AIML API key from [aimlapi.com](https://aimlapi.com) |
| `PORT` | ❌ | Backend port (default: `5000`) |

---

## 📄 License

MIT
