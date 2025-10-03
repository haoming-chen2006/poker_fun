// Configuration
const API_URL = 'http://localhost:5001/predict';
const FPS_UPDATE_INTERVAL = 1000;

// State
let stream = null;
let detectionMode = 'single'; // 'single' or 'continuous'
let isDetecting = false;
let detectionInterval = null;
let totalDetections = 0;
let frameCount = 0;
let lastFpsUpdate = Date.now();
let numPlayers = 3; // Default 3 players
let playerHands = {}; // Store player hands with confidence tracking

// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startCameraBtn = document.getElementById('startCamera');
const stopCameraBtn = document.getElementById('stopCamera');
const detectBtn = document.getElementById('detectBtn');
const updateHandsBtn = document.getElementById('updateHandsBtn');
const singleModeBtn = document.getElementById('singleMode');
const continuousModeBtn = document.getElementById('continuousMode');
const resultsContainer = document.getElementById('results');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const fpsDisplay = document.getElementById('fps');
const totalDetectionsDisplay = document.getElementById('totalDetections');
const clearResultsBtn = document.getElementById('clearResults');
const overlay = document.getElementById('overlay');
const playerHandsBar = document.getElementById('playerHandsBar');
const playerCountButtons = document.querySelectorAll('.player-count-btn');

// Event Listeners
startCameraBtn.addEventListener('click', startCamera);
stopCameraBtn.addEventListener('click', stopCamera);
detectBtn.addEventListener('click', handleDetection);
updateHandsBtn.addEventListener('click', updatePlayerHands);
singleModeBtn.addEventListener('click', () => setDetectionMode('single'));
continuousModeBtn.addEventListener('click', () => setDetectionMode('continuous'));
clearResultsBtn.addEventListener('click', clearResults);

// Player count selection
playerCountButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        playerCountButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        numPlayers = parseInt(btn.dataset.players);
        initializePlayerHands();
    });
});

// Camera Functions
async function startCamera() {
    try {
        // Try to get camera with rear camera preference (mobile)
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment'
                }
            });
        } catch (err) {
            // Fallback to any available camera (desktop/laptop)
            console.log('Rear camera not available, using default camera');
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
        }

        video.srcObject = stream;
        video.play();

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        };

        startCameraBtn.disabled = true;
        stopCameraBtn.disabled = false;
        detectBtn.disabled = false;
        updateHandsBtn.disabled = false;

        updateStatus('active', 'Camera Active');

        if (detectionMode === 'continuous') {
            startContinuousDetection();
        }
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert(`Could not access camera: ${error.message}\n\nPlease ensure:\n1. You have granted camera permissions\n2. No other application is using the camera\n3. Your browser supports camera access`);
        updateStatus('error', 'Camera Error');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        video.srcObject = null;
    }

    stopContinuousDetection();
    clearBoundingBoxes();

    startCameraBtn.disabled = false;
    stopCameraBtn.disabled = true;
    detectBtn.disabled = true;
    updateHandsBtn.disabled = true;

    updateStatus('inactive', 'Camera Stopped');
}

// Detection Mode Functions
function setDetectionMode(mode) {
    detectionMode = mode;

    if (mode === 'single') {
        singleModeBtn.classList.add('active');
        continuousModeBtn.classList.remove('active');
        stopContinuousDetection();
        detectBtn.innerHTML = '<span class="btn-icon">🔍</span> Detect Cards';
        detectBtn.disabled = !stream;
    } else {
        continuousModeBtn.classList.add('active');
        singleModeBtn.classList.remove('active');
        if (stream) {
            startContinuousDetection();
        }
        detectBtn.innerHTML = '<span class="btn-icon">⏹️</span> Stop Detection';
        detectBtn.disabled = !stream;
    }
}

function handleDetection() {
    if (detectionMode === 'single') {
        detectCards();
    } else {
        if (isDetecting) {
            stopContinuousDetection();
        } else {
            startContinuousDetection();
        }
    }
}

function startContinuousDetection() {
    if (detectionInterval) return;

    isDetecting = true;
    detectBtn.classList.add('detecting');
    detectBtn.innerHTML = '<span class="btn-icon">⏹️</span> Stop Detection';
    updateStatus('detecting', 'Detecting...');

    // Detect immediately, then every 500ms
    detectCards();
    detectionInterval = setInterval(() => {
        detectCards();
    }, 500);
}

function stopContinuousDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }

    isDetecting = false;
    detectBtn.classList.remove('detecting');

    if (detectionMode === 'continuous') {
        detectBtn.innerHTML = '<span class="btn-icon">🎥</span> Start Detection';
    }

    if (stream) {
        updateStatus('active', 'Camera Active');
    }
}

// Detection Function
async function detectCards() {
    if (!stream) return;

    try {
        // Capture frame from video
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);

        // Update FPS
        frameCount++;
        const now = Date.now();
        if (now - lastFpsUpdate >= FPS_UPDATE_INTERVAL) {
            const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
            fpsDisplay.textContent = fps;
            frameCount = 0;
            lastFpsUpdate = now;
        }

        // Send to backend
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageData,
                num_players: numPlayers
            })
        });

        const data = await response.json();

        if (data.success && data.detections.length > 0) {
            displayDetections(data.detections);
            drawBoundingBoxes(data.detections);
            totalDetections += data.detections.length;
            totalDetectionsDisplay.textContent = totalDetections;
        } else {
            clearBoundingBoxes();
        }

    } catch (error) {
        console.error('Detection error:', error);
        if (detectionMode === 'single') {
            alert('Detection failed. Make sure the backend server is running on port 5000.');
        }
        stopContinuousDetection();
        updateStatus('error', 'Detection Error');
    }
}

// Display Functions
function displayDetections(detections) {
    // Remove empty state if exists
    const emptyState = resultsContainer.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    detections.forEach(detection => {
        const card = document.createElement('div');
        card.className = 'detection-card';

        const timestamp = new Date().toLocaleTimeString();
        const confidencePercent = (detection.confidence * 100).toFixed(1);

        card.innerHTML = `
            <div class="detection-header">
                <div class="card-name">${detection.card}</div>
                <div class="timestamp">${timestamp}</div>
            </div>
            <div class="confidence-bar-container">
                <div class="confidence-label">
                    <span>Confidence</span>
                    <span>${confidencePercent}%</span>
                </div>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${confidencePercent}%"></div>
                </div>
            </div>
            <div class="bbox-info">
                BBox: [${detection.bbox.map(v => v.toFixed(0)).join(', ')}]
            </div>
        `;

        resultsContainer.insertBefore(card, resultsContainer.firstChild);

        // Keep only last 20 detections
        const cards = resultsContainer.querySelectorAll('.detection-card');
        if (cards.length > 20) {
            cards[cards.length - 1].remove();
        }
    });
}

function drawBoundingBoxes(detections) {
    clearBoundingBoxes();

    const videoRect = video.getBoundingClientRect();
    const scaleX = videoRect.width / canvas.width;
    const scaleY = videoRect.height / canvas.height;

    detections.forEach(detection => {
        const [x1, y1, x2, y2] = detection.bbox;

        const bbox = document.createElement('div');
        bbox.className = 'bbox';

        const left = x1 * scaleX;
        const top = y1 * scaleY;
        const width = (x2 - x1) * scaleX;
        const height = (y2 - y1) * scaleY;

        bbox.style.left = `${left}px`;
        bbox.style.top = `${top}px`;
        bbox.style.width = `${width}px`;
        bbox.style.height = `${height}px`;

        const label = document.createElement('div');
        label.className = 'bbox-label';
        label.textContent = `${detection.card} (${(detection.confidence * 100).toFixed(0)}%)`;

        bbox.appendChild(label);
        overlay.appendChild(bbox);
    });
}

function clearBoundingBoxes() {
    overlay.innerHTML = '';
}

function clearResults() {
    resultsContainer.innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">🃏</span>
            <p>No cards detected yet</p>
            <small>Start camera and click detect</small>
        </div>
    `;
    totalDetections = 0;
    totalDetectionsDisplay.textContent = '0';
}

function updateStatus(status, text) {
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = text;
}

// Player Hands Management
function initializePlayerHands() {
    playerHands = {};
    for (let i = 1; i <= numPlayers; i++) {
        playerHands[i] = {
            cards: {},  // card_name -> {confidence, bbox}
            lastUpdated: null
        };
    }
    renderPlayerHands();
}

function updatePlayerHands() {
    // This function is called when "Update Hands" button is clicked
    // It locks in the current detection as the player hands
    detectCardsForUpdate();
}

async function detectCardsForUpdate() {
    if (!stream) return;

    try {
        // Capture frame from video
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);

        // Send to backend
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageData,
                num_players: numPlayers
            })
        });

        const data = await response.json();

        if (data.success && data.hands && data.hands.length > 0) {
            // Update player hands with confidence-based logic
            data.hands.forEach(hand => {
                const playerId = hand.player_id;
                if (playerId <= numPlayers) {
                    updatePlayerHandWithConfidence(playerId, hand.cards);
                }
            });

            renderPlayerHands();
        }

    } catch (error) {
        console.error('Update hands error:', error);
        alert('Failed to update hands. Make sure the backend server is running.');
    }
}

function updatePlayerHandWithConfidence(playerId, newCards) {
    const playerHand = playerHands[playerId];
    if (!playerHand) return;

    // For each new card detected
    newCards.forEach(card => {
        const cardName = card.card;
        const confidence = card.confidence;

        // Check if we already have this card
        if (cardName in playerHand.cards) {
            // Only update if new detection has higher confidence
            if (confidence > playerHand.cards[cardName].confidence) {
                playerHand.cards[cardName] = {
                    confidence: confidence,
                    bbox: card.bbox,
                    lastUpdated: new Date()
                };
            }
        } else {
            // New card for this player
            playerHand.cards[cardName] = {
                confidence: confidence,
                bbox: card.bbox,
                lastUpdated: new Date()
            };
        }
    });

    playerHand.lastUpdated = new Date();
}

function renderPlayerHands() {
    playerHandsBar.innerHTML = '';

    for (let i = 1; i <= numPlayers; i++) {
        const hand = playerHands[i];
        const handDiv = document.createElement('div');
        handDiv.className = 'player-hand';

        const cards = Object.keys(hand.cards);
        if (cards.length === 0) {
            handDiv.classList.add('empty');
        }

        handDiv.innerHTML = `
            <div class="player-hand-header">Player ${i} ${cards.length === 2 ? '✓' : `(${cards.length}/2)`}</div>
            <div class="player-hand-cards">
                ${cards.length === 0 ? '<span style="opacity: 0.6;">No cards</span>' : cards.map(cardName => {
                    const cardData = hand.cards[cardName];
                    return `
                        <div class="player-card">
                            <div class="player-card-name">${cardName}</div>
                            <div class="player-card-confidence">${(cardData.confidence * 100).toFixed(0)}%</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        playerHandsBar.appendChild(handDiv);
    }
}

// Initialize - Auto-start camera on page load
updateStatus('inactive', 'Camera Not Started');
initializePlayerHands();
startCamera();
