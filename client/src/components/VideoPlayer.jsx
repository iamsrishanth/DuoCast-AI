export default function VideoPlayer({ videoUrl }) {
    if (!videoUrl) return null;

    return (
        <div className="video-result">
            <div className="video-player">
                <video
                    src={videoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                />
            </div>
            <div className="video-actions">
                <a
                    href={videoUrl}
                    download="duocast-video.mp4"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-btn"
                >
                    ⬇ Download Video
                </a>
                <button
                    className="download-btn"
                    onClick={() => {
                        navigator.clipboard.writeText(videoUrl);
                    }}
                >
                    📋 Copy URL
                </button>
            </div>
        </div>
    );
}
