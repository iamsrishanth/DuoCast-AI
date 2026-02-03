/**
 * DuoCast-AI Frontend Script
 * Handles form submission, file uploads, and progress tracking
 */

// DOM Elements
const form = document.getElementById('generateForm');
const submitBtn = document.getElementById('submitBtn');
const resultsCard = document.getElementById('resultsCard');
const progressFill = document.getElementById('progressFill');
const progressStatus = document.getElementById('progressStatus');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const scenePreview = document.getElementById('scenePreview');
const sceneImage = document.getElementById('sceneImage');
const videoPreview = document.getElementById('videoPreview');
const resultVideo = document.getElementById('resultVideo');
const downloadBtn = document.getElementById('downloadBtn');
const errorBox = document.getElementById('errorBox');
const errorMessage = document.getElementById('errorMessage');

// File inputs
const portraitAInput = document.getElementById('portraitA');
const portraitBInput = document.getElementById('portraitB');
const uploadBoxA = document.getElementById('uploadBoxA');
const uploadBoxB = document.getElementById('uploadBoxB');
const previewA = document.getElementById('previewA');
const previewB = document.getElementById('previewB');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSavedApiKey();
    setupFileUploads();
});

// Load saved API key from localStorage
function loadSavedApiKey() {
    const savedKey = localStorage.getItem('duocast_api_key');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
    }

    const useFreeModel = localStorage.getItem('duocast_use_free_model');
    if (useFreeModel !== null) {
        document.getElementById('useFreeModel').checked = useFreeModel === 'true';
    }
}

// Toggle API key visibility
function toggleApiKeyVisibility() {
    const input = document.getElementById('apiKey');
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Toggle advanced options
function toggleAdvanced() {
    const content = document.getElementById('advancedOptions');
    content.classList.toggle('open');
}

// Setup file upload handlers
function setupFileUploads() {
    uploadBoxA.addEventListener('click', () => portraitAInput.click());
    uploadBoxB.addEventListener('click', () => portraitBInput.click());

    portraitAInput.addEventListener('change', (e) => handleFileSelect(e, previewA, uploadBoxA));
    portraitBInput.addEventListener('change', (e) => handleFileSelect(e, previewB, uploadBoxB));

    // Drag and drop
    [uploadBoxA, uploadBoxB].forEach((box, index) => {
        box.addEventListener('dragover', (e) => {
            e.preventDefault();
            box.style.borderColor = 'var(--primary)';
            box.style.background = 'rgba(124, 58, 237, 0.1)';
        });

        box.addEventListener('dragleave', (e) => {
            e.preventDefault();
            box.style.borderColor = '';
            box.style.background = '';
        });

        box.addEventListener('drop', (e) => {
            e.preventDefault();
            box.style.borderColor = '';
            box.style.background = '';

            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                const input = index === 0 ? portraitAInput : portraitBInput;
                const preview = index === 0 ? previewA : previewB;

                // Create a DataTransfer object to set files
                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;

                handleFileSelect({ target: input }, preview, box);
            }
        });
    });
}

// Handle file selection
function handleFileSelect(e, previewEl, boxEl) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        previewEl.innerHTML = `<img src="${event.target.result}" alt="Portrait preview">`;
        boxEl.classList.add('has-image');
    };
    reader.readAsDataURL(file);
}

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const apiKey = document.getElementById('apiKey').value;
    const useFreeModel = document.getElementById('useFreeModel').checked;
    const scenario = document.getElementById('scenario').value;
    const tone = document.getElementById('tone').value;
    const cameraStyle = document.getElementById('cameraStyle').value;
    const resolution = document.getElementById('resolution').value;

    // Save API key preference
    localStorage.setItem('duocast_api_key', apiKey);
    localStorage.setItem('duocast_use_free_model', useFreeModel.toString());

    // Validate files
    if (!portraitAInput.files[0] || !portraitBInput.files[0]) {
        alert('Please upload both portrait images');
        return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('portraitA', portraitAInput.files[0]);
    formData.append('portraitB', portraitBInput.files[0]);
    formData.append('scenario', scenario);
    formData.append('apiKey', apiKey);
    formData.append('useFreeModel', useFreeModel.toString());
    formData.append('tone', tone);
    formData.append('cameraStyle', cameraStyle);
    formData.append('resolution', resolution);

    // Show results card
    resultsCard.style.display = 'block';
    resultsCard.scrollIntoView({ behavior: 'smooth' });

    // Reset UI
    resetProgressUI();

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.querySelector('.btn-text').textContent = 'Generating...';
    submitBtn.querySelector('.btn-icon').textContent = '⏳';

    try {
        // Start generation
        const response = await fetch('/api/generate', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to start generation');
        }

        const { generationId } = await response.json();

        // Poll for status
        pollStatus(generationId);

    } catch (error) {
        showError(error.message);
        resetSubmitButton();
    }
});

// Reset progress UI
function resetProgressUI() {
    progressFill.style.width = '0%';
    progressStatus.textContent = 'Starting generation...';

    step1.className = 'pipeline-step';
    step2.className = 'pipeline-step';
    step1.querySelector('.step-status').textContent = '⏳';
    step2.querySelector('.step-status').textContent = '⏳';

    scenePreview.style.display = 'none';
    videoPreview.style.display = 'none';
    errorBox.style.display = 'none';
}

// Poll generation status
async function pollStatus(generationId) {
    try {
        const response = await fetch(`/api/status/${generationId}`);
        const data = await response.json();

        updateUI(data);

        if (data.status !== 'complete' && data.status !== 'error') {
            setTimeout(() => pollStatus(generationId), 2000);
        } else {
            resetSubmitButton();
        }

    } catch (error) {
        showError('Failed to check generation status');
        resetSubmitButton();
    }
}

// Update UI based on status
function updateUI(data) {
    progressStatus.textContent = data.progress;

    switch (data.status) {
        case 'pending':
            progressFill.style.width = '10%';
            break;

        case 'scene':
            progressFill.style.width = '40%';
            step1.className = 'pipeline-step active';
            step1.querySelector('.step-status').textContent = '🔄';

            if (data.scenePath) {
                step1.className = 'pipeline-step complete';
                step1.querySelector('.step-status').textContent = '✅';
                sceneImage.src = data.scenePath + '?t=' + Date.now();
                scenePreview.style.display = 'block';
            }
            break;

        case 'video':
            progressFill.style.width = '70%';
            step1.className = 'pipeline-step complete';
            step1.querySelector('.step-status').textContent = '✅';
            step2.className = 'pipeline-step active';
            step2.querySelector('.step-status').textContent = '🔄';

            if (data.scenePath) {
                sceneImage.src = data.scenePath + '?t=' + Date.now();
                scenePreview.style.display = 'block';
            }
            break;

        case 'complete':
            progressFill.style.width = '100%';
            step1.className = 'pipeline-step complete';
            step1.querySelector('.step-status').textContent = '✅';
            step2.className = 'pipeline-step complete';
            step2.querySelector('.step-status').textContent = '✅';

            if (data.scenePath) {
                sceneImage.src = data.scenePath + '?t=' + Date.now();
                scenePreview.style.display = 'block';
            }

            if (data.videoPath) {
                resultVideo.querySelector('source').src = data.videoPath + '?t=' + Date.now();
                resultVideo.load();
                downloadBtn.href = data.videoPath;
                videoPreview.style.display = 'block';
            }
            break;

        case 'error':
            showError(data.error);

            // Mark current step as error
            if (progressFill.style.width === '40%' || progressFill.style.width === '10%') {
                step1.className = 'pipeline-step error';
                step1.querySelector('.step-status').textContent = '❌';
            } else {
                step2.className = 'pipeline-step error';
                step2.querySelector('.step-status').textContent = '❌';
            }
            break;
    }
}

// Show error
function showError(message) {
    errorBox.style.display = 'flex';
    errorMessage.textContent = message;
}

// Reset submit button
function resetSubmitButton() {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.querySelector('.btn-text').textContent = 'Generate Video';
    submitBtn.querySelector('.btn-icon').textContent = '🚀';
}

// Make functions available globally
window.toggleApiKeyVisibility = toggleApiKeyVisibility;
window.toggleAdvanced = toggleAdvanced;
