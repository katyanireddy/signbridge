/* ============================================================
   SignBridge – app.js
   Application logic: camera, MediaPipe, prediction UI,
   word builder, session history, speech synthesis
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // --------------------------------------------------------
    // DOM Elements
    // --------------------------------------------------------
    const videoElement       = document.getElementById('webcam');
    const canvasElement      = document.getElementById('output-canvas');
    const canvasCtx          = canvasElement.getContext('2d');
    const cameraOverlay      = document.getElementById('camera-overlay');
    const statusText         = document.getElementById('camera-status');

    const predictionLetterEl = document.getElementById('prediction-letter');
    const confidenceTextEl   = document.getElementById('confidence-text');
    const confidenceBarEl    = document.getElementById('confidence-bar');
    const handStatusEl       = document.getElementById('hand-status');
    const loadingIndicator   = document.getElementById('loading-indicator');

    const builtWordEl        = document.getElementById('built-word');
    const btnAdd             = document.getElementById('btn-add');
    const btnBackspace       = document.getElementById('btn-backspace');
    const btnClear           = document.getElementById('btn-clear');
    const btnSpeak           = document.getElementById('btn-speak');

    const historyBody        = document.getElementById('history-body');
    const historyEmpty       = document.getElementById('history-empty');

    // --------------------------------------------------------
    // State Variables
    // --------------------------------------------------------
    let currentPrediction = '';
    let currentConfidence = 0;
    let builtWord         = '';
    let predictionHistory = [];
    let isHandDetected    = false;
    let lastPredictTime   = 0;

    // --------------------------------------------------------
    // Web Speech API
    // --------------------------------------------------------
    const synth = window.speechSynthesis;

    function speakText(text) {
        if (!text || synth.speaking) return;
        const utterance   = new SpeechSynthesisUtterance(text);
        utterance.rate    = 0.9;
        utterance.pitch   = 1;
        synth.speak(utterance);
    }

    // --------------------------------------------------------
    // Camera Initialization
    // --------------------------------------------------------
    async function initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            videoElement.srcObject = stream;

            videoElement.onloadedmetadata = () => {
                // Hide overlay
                cameraOverlay.classList.add('opacity-0');
                setTimeout(() => cameraOverlay.classList.add('hidden'), 300);

                // Update status badge
                statusText.innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"></span>
                    Camera Active
                `;
                statusText.className =
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ' +
                    'bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] ' +
                    'transition-colors border border-emerald-500/30 backdrop-blur-md';

                initMediaPipe();
            };
        } catch (err) {
            console.error('Camera access denied:', err);

            cameraOverlay.innerHTML = `
                <div class="text-rose-400 text-sm font-semibold flex items-center gap-2 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
                    <iconify-icon icon="solar:danger-triangle-linear"></iconify-icon>
                    Camera access denied
                </div>
            `;

            statusText.innerHTML = `
                <span class="w-2 h-2 rounded-full bg-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                Error
            `;
            statusText.className =
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ' +
                'bg-rose-500/10 text-rose-400 border border-rose-500/30 backdrop-blur-md ' +
                'shadow-[0_0_15px_rgba(244,63,94,0.15)]';
        }
    }

    // --------------------------------------------------------
    // MediaPipe Hands Initialization
    // --------------------------------------------------------
    function initMediaPipe() {
        const hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });

        hands.onResults(onResults);

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({ image: videoElement });
            },
            width: 640,
            height: 480
        });

        camera.start();
    }

    // --------------------------------------------------------
    // Process MediaPipe Results
    // (Currently uses simulation; replace with real model call)
    // --------------------------------------------------------
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    function onResults(results) {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            isHandDetected = true;
            loadingIndicator.classList.remove('opacity-0');

            handStatusEl.textContent = 'Analyzing gesture...';
            handStatusEl.className =
                'mt-6 text-sm text-brand-cyan font-semibold h-5 transition-colors tracking-tight ' +
                'drop-shadow-[0_0_5px_rgba(6,182,212,0.4)]';

            // Draw hand skeleton
            for (const landmarks of results.multiHandLandmarks) {
                drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                    color: 'rgba(6, 182, 212, 0.4)',
                    lineWidth: 3
                });
                drawLandmarks(canvasCtx, landmarks, {
                    color: '#06b6d4',
                    lineWidth: 1,
                    radius: 4
                });
            }

            // Debounce predictions every 1.5 seconds
            const now = Date.now();
            if (now - lastPredictTime > 1500) {
                const mockLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
                const mockConf   = (Math.random() * 15 + 85).toFixed(1); // 85–100 %

                handlePrediction(mockLetter, parseFloat(mockConf));
                lastPredictTime = now;
            }

        } else {
            // No hand visible – reset UI once per transition
            if (isHandDetected) {
                isHandDetected = false;
                loadingIndicator.classList.add('opacity-0');

                handStatusEl.textContent = 'No hand detected';
                handStatusEl.className   =
                    'mt-6 text-sm text-slate-500 font-medium h-5 transition-colors tracking-tight';

                handlePrediction('-', 0);
            }
        }

        canvasCtx.restore();
    }

    // --------------------------------------------------------
    // UI Update: Prediction Display
    // --------------------------------------------------------
    function handlePrediction(letter, conf) {
        currentPrediction = letter;
        currentConfidence = conf;

        // --- Big glowing letter ---
        predictionLetterEl.textContent = letter;

        if (letter !== '-') {
            predictionLetterEl.className =
                'text-[5.5rem] font-semibold tracking-tighter text-white ' +
                'bg-gradient-to-br from-brand-indigo to-brand-purple rounded-[2.5rem] ' +
                'w-36 h-36 flex items-center justify-center ' +
                'shadow-[0_0_40px_rgba(147,51,234,0.6)] border border-white/20 ' +
                'transition-all duration-300 scale-100 mb-8 neon-glow-active';
        } else {
            predictionLetterEl.className =
                'text-8xl font-semibold tracking-tighter text-slate-600 ' +
                'bg-white/5 backdrop-blur-md rounded-[2.5rem] ' +
                'w-36 h-36 flex items-center justify-center ' +
                'transition-all duration-300 ring-1 ring-white/10 shadow-inner mb-8 scale-95';
        }

        // --- Confidence bar ---
        confidenceTextEl.textContent = `${conf}%`;
        confidenceBarEl.style.width  = `${conf}%`;

        if (conf > 85) {
            confidenceBarEl.className =
                'h-full bg-gradient-to-r from-brand-cyan to-brand-indigo rounded-full ' +
                'transition-all duration-500 relative shadow-[0_0_15px_rgba(6,182,212,0.6)]';
            confidenceTextEl.className =
                'text-brand-cyan font-bold drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]';
        } else if (conf > 0) {
            confidenceBarEl.className =
                'h-full bg-gradient-to-r from-brand-indigo to-brand-purple rounded-full ' +
                'transition-all duration-500 relative shadow-[0_0_15px_rgba(147,51,234,0.6)]';
            confidenceTextEl.className =
                'text-brand-purple font-bold drop-shadow-[0_0_5px_rgba(147,51,234,0.5)]';
        } else {
            confidenceBarEl.className   = 'h-full bg-slate-700 rounded-full transition-all duration-500 relative';
            confidenceTextEl.className  = 'text-slate-500 font-semibold';
            confidenceTextEl.textContent = '0%';
        }

        // --- History ---
        if (letter !== '-' && conf > 0) {
            addToHistory(letter, conf);
        }
    }

    // --------------------------------------------------------
    // Session History
    // --------------------------------------------------------
    function addToHistory(letter, conf) {
        const time = new Date().toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        predictionHistory.unshift({ time, letter, conf });
        if (predictionHistory.length > 10) predictionHistory.pop();
        renderHistory();
    }

    function renderHistory() {
        if (predictionHistory.length > 0) historyEmpty.classList.add('hidden');

        historyBody.innerHTML = predictionHistory.map((item, index) => `
            <div class="bg-white/5 backdrop-blur-md border border-white/10
                        hover:border-brand-purple/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.2)]
                        rounded-2xl p-4 transition-all duration-300
                        flex flex-col items-center justify-center gap-2
                        relative overflow-hidden group hover:-translate-y-1">

                ${index === 0
                    ? '<div class="absolute top-0 w-full h-1 bg-gradient-to-r from-brand-cyan via-brand-indigo to-brand-purple shadow-[0_0_10px_rgba(147,51,234,0.8)]"></div>'
                    : ''}

                <span class="text-[0.65rem] text-slate-400 font-semibold uppercase tracking-[0.15em]">
                    ${item.time}
                </span>
                <span class="text-3xl font-semibold tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                    ${item.letter}
                </span>
                <div class="flex flex-col items-center w-full gap-1 mt-1">
                    <span class="text-[0.7rem] font-bold ${item.conf > 85 ? 'text-brand-cyan' : 'text-brand-purple'}">
                        ${item.conf}% Match
                    </span>
                    <div class="h-1 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                        <div class="h-full ${item.conf > 85 ? 'bg-brand-cyan' : 'bg-brand-purple'}
                                    rounded-full opacity-90 shadow-[0_0_10px_currentColor]"
                             style="width: ${item.conf}%">
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // --------------------------------------------------------
    // Word Builder UI Sync
    // --------------------------------------------------------
    function updateWordBuilderUI() {
        builtWordEl.textContent = builtWord;
        btnSpeak.disabled = builtWord.length === 0;
    }

    // --------------------------------------------------------
    // Button Event Listeners
    // --------------------------------------------------------
    btnAdd.addEventListener('click', () => {
        if (currentPrediction && currentPrediction !== '-') {
            builtWord += currentPrediction;
            updateWordBuilderUI();
        }
    });

    btnBackspace.addEventListener('click', () => {
        builtWord = builtWord.slice(0, -1);
        updateWordBuilderUI();
    });

    btnClear.addEventListener('click', () => {
        builtWord = '';
        updateWordBuilderUI();
    });

    btnSpeak.addEventListener('click', () => {
        speakText(builtWord);
    });

    // Spacebar shortcut to add current prediction
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && currentPrediction !== '-' && isHandDetected) {
            e.preventDefault();
            btnAdd.click();
        }
    });

    // --------------------------------------------------------
    // Boot
    // --------------------------------------------------------
    initCamera();
});
const hands = new Hands({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});
hands.onResults(results => {
  if (results.multiHandLandmarks) {
    const landmarks = results.multiHandLandmarks[0];

    let features = [];

    landmarks.forEach(pt => {
      features.push(pt.x);
      features.push(pt.y);
    });

    sendToBackend(features);
  }
});

async function sendToBackend(features) {
  const res = await fetch("http://127.0.0.1:8000/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ data: features })
  });

  const result = await res.json();

  document.getElementById("prediction-letter").innerText = result.letter;
  document.getElementById("confidence-text").innerText = result.confidence;
}
const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 640,
  height: 480
});

camera.start();
function sendToBackend(features) {
  fetch("http://127.0.0.1:8000/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ data: features })
  })
  .then(res => res.json())
  .then(data => {
    console.log(data);

    // UI update
    document.getElementById("prediction-letter").innerText = data.letter;
    document.getElementById("confidence").innerText =
      (data.confidence * 100).toFixed(1) + "%";
  });
}
hands.onResults((results) => {
  console.log(results);  // 👈 ADD THIS
});