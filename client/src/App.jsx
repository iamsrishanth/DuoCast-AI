import { useState, useEffect } from 'react';
import ImageUpload from './components/ImageUpload';
import VideoPlayer from './components/VideoPlayer';
import './index.css';

const API_BASE = '/api';

const DURATION_OPTIONS = [
  { value: 4, label: '4s' },
  { value: 6, label: '6s' },
  { value: 8, label: '8s' },
];

const EXAMPLE_SCENARIOS = [
  'Two colleagues sitting in a modern office meeting room during a product discussion. Professional lighting, glass walls.',
  'Two friends at a cozy coffee shop, sitting across from each other at a small table. Warm ambient lighting, latte art visible.',
  'Two people standing in a park on a sunny afternoon, having a casual conversation. Trees and greenery in the background.',
];

export default function App() {
  const [portraitA, setPortraitA] = useState(null);
  const [portraitB, setPortraitB] = useState(null);
  const [scenario, setScenario] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [duration, setDuration] = useState(8);

  // Pipeline state
  const [status, setStatus] = useState('idle'); // idle | generating-scene | generating-video | done | error
  const [sceneImageUrl, setSceneImageUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Credits state
  const [credits, setCredits] = useState({ startingCredits: 20000000, creditsUsed: 0, creditsRemaining: 20000000 });

  useEffect(() => {
    fetch(`${API_BASE}/credits`)
      .then(res => res.json())
      .then(data => setCredits(data))
      .catch(() => { });
  }, []);

  const canGenerate = portraitA && portraitB && scenario.trim() && status === 'idle';

  const handleGenerate = async () => {
    setStatus('generating-scene');
    setError(null);
    setSceneImageUrl(null);
    setVideoUrl(null);
    setStatusMessage('Composing scene with NanoBanana Pro Edit...');

    try {
      // Step 1: Generate scene image
      const formData = new FormData();
      formData.append('portraitA', portraitA.file);
      formData.append('portraitB', portraitB.file);
      formData.append('scenario', scenario);

      const sceneRes = await fetch(`${API_BASE}/generate-scene`, {
        method: 'POST',
        body: formData,
      });

      const sceneData = await sceneRes.json();

      if (!sceneRes.ok || !sceneData.success) {
        throw new Error(sceneData.error || 'Scene generation failed');
      }

      setSceneImageUrl(sceneData.imageUrl);
      if (sceneData.creditsRemaining != null) {
        setCredits(c => ({ ...c, creditsUsed: sceneData.creditsUsed || c.creditsUsed, creditsRemaining: sceneData.creditsRemaining }));
      }
      setStatusMessage('Scene generated! Now creating video with Veo 3.1...');

      // Step 2: Generate video
      setStatus('generating-video');

      const finalVideoPrompt = videoPrompt.trim() ||
        `Two people having a natural conversation in the scene. They show natural expressions, subtle head movements, and realistic body language while speaking. Generate synchronized conversational audio with natural dialogue. ${scenario}`;

      const videoRes = await fetch(`${API_BASE}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneImageUrl: sceneData.imageUrl,
          videoPrompt: finalVideoPrompt,
          duration,
        }),
      });

      const videoData = await videoRes.json();

      if (!videoRes.ok || !videoData.success) {
        throw new Error(videoData.error || 'Video generation failed');
      }

      setVideoUrl(videoData.videoUrl);
      if (videoData.creditsRemaining != null) {
        setCredits(c => ({ ...c, creditsUsed: videoData.creditsUsed || c.creditsUsed, creditsRemaining: videoData.creditsRemaining }));
      }
      setStatus('done');
      setStatusMessage('Video ready!');
    } catch (err) {
      setStatus('error');
      setError(err.message);
      setStatusMessage('');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setSceneImageUrl(null);
    setVideoUrl(null);
    setError(null);
    setStatusMessage('');
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header__badge">
          <span></span> AI-Powered
        </div>
        <h1 className="header__title">DuoCast AI</h1>
        <p className="header__subtitle">
          Transform two portraits into a realistic conversational video with AI-generated audio
        </p>
        <div className="credits-widget">
          <div className="credits-widget__label">Credits Remaining</div>
          <div className="credits-widget__value">
            {(credits.creditsRemaining).toLocaleString()}
            <span className="credits-widget__total"> / {(credits.startingCredits).toLocaleString()}</span>
          </div>
          <div className="credits-widget__bar">
            <div
              className="credits-widget__bar-fill"
              style={{ width: `${(credits.creditsRemaining / credits.startingCredits) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="pipeline">
        {/* Step 1: Upload Portraits */}
        <section className="card">
          <div className="card__header">
            <div className="card__step">1</div>
            <div>
              <div className="card__title">Upload Portraits</div>
              <div className="card__description">Two portrait images of the people in the conversation</div>
            </div>
          </div>
          <div className="upload-grid">
            <ImageUpload
              label="Person A"
              sublabel="Left side of scene"
              image={portraitA}
              onImageChange={setPortraitA}
            />
            <ImageUpload
              label="Person B"
              sublabel="Right side of scene"
              image={portraitB}
              onImageChange={setPortraitB}
            />
          </div>
        </section>

        {/* Step 2: Describe Scene */}
        <section className="card">
          <div className="card__header">
            <div className="card__step">2</div>
            <div>
              <div className="card__title">Describe the Scene</div>
              <div className="card__description">Set the stage for the AI to compose and animate</div>
            </div>
          </div>

          <div className="prompt-section">
            <label className="prompt-label">Scene Description *</label>
            <textarea
              className="scenario-input"
              placeholder="e.g., Two colleagues in a modern office meeting room during a product discussion. Professional lighting, glass walls in the background..."
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {EXAMPLE_SCENARIOS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setScenario(ex)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontFamily: 'inherit',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = 'var(--accent-1)';
                    e.target.style.color = 'var(--text-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'var(--border-subtle)';
                    e.target.style.color = 'var(--text-muted)';
                  }}
                >
                  Example {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="prompt-section">
            <label className="prompt-label">Video Action Prompt (optional)</label>
            <textarea
              className="scenario-input"
              style={{ minHeight: '80px' }}
              placeholder="Override the default video prompt. Leave empty for auto-generated conversational dialogue..."
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
            />
          </div>
        </section>

        {/* Step 3: Generate */}
        <section className="card">
          <div className="card__header">
            <div className="card__step">3</div>
            <div>
              <div className="card__title">Generate DuoCast</div>
              <div className="card__description">Select duration and start the AI pipeline</div>
            </div>
          </div>

          <div className="controls">
            <div className="duration-select">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`duration-option ${duration === opt.value ? 'active' : ''}`}
                  onClick={() => setDuration(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {status === 'idle' ? (
              <button
                className="generate-btn"
                disabled={!canGenerate}
                onClick={handleGenerate}
              >
                🎬 Generate DuoCast
              </button>
            ) : status === 'done' || status === 'error' ? (
              <button className="generate-btn" onClick={handleReset}>
                🔄 Start Over
              </button>
            ) : (
              <button className="generate-btn" disabled>
                ⏳ Generating...
              </button>
            )}
          </div>

          {/* Progress */}
          {status !== 'idle' && (
            <div className="progress-section">
              <div className="progress-card">
                {/* Scene step */}
                <div className="progress-step">
                  <div className={`progress-icon ${status === 'generating-scene' ? 'loading' : ''}`}>
                    {status === 'generating-scene' ? '⏳' : sceneImageUrl ? '✅' : status === 'error' && !sceneImageUrl ? '❌' : '⬜'}
                  </div>
                  <div className={`progress-text ${status === 'generating-scene' ? 'active' :
                    sceneImageUrl ? 'done' :
                      status === 'error' && !sceneImageUrl ? 'error' : ''
                    }`}>
                    Step 1: Compose scene with NanoBanana Pro Edit
                  </div>
                </div>

                {/* Video step */}
                <div className="progress-step">
                  <div className={`progress-icon ${status === 'generating-video' ? 'loading' : ''}`}>
                    {status === 'generating-video' ? '⏳' : videoUrl ? '✅' : status === 'error' && sceneImageUrl ? '❌' : '⬜'}
                  </div>
                  <div className={`progress-text ${status === 'generating-video' ? 'active' :
                    videoUrl ? 'done' :
                      status === 'error' && sceneImageUrl ? 'error' : ''
                    }`}>
                    Step 2: Generate video + audio with Veo 3.1
                  </div>
                </div>

                {statusMessage && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {statusMessage}
                  </div>
                )}

                {(status === 'generating-scene' || status === 'generating-video') && (
                  <div className="loading-bar">
                    <div className="loading-bar__fill"></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scene preview */}
          {sceneImageUrl && (
            <div className="scene-preview">
              <img src={sceneImageUrl} alt="Generated scene" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="error-banner">
              ⚠️ {error}
            </div>
          )}

          {/* Video result */}
          <VideoPlayer videoUrl={videoUrl} />
        </section>
      </div>
    </div>
  );
}
