const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startMenu = document.getElementById('start-menu');
const levelMenu = document.getElementById('level-menu');
const gameOverMenu = document.getElementById('game-over-menu');
const hud = document.getElementById('hud');
const scoreDisplay = document.getElementById('score-display');
const levelDisplay = document.getElementById('level-display');
const activePowerup = document.getElementById('active-powerup');
const powerupIcon = document.getElementById('powerup-icon');
const rainOverlay = document.getElementById('rain-overlay');
const levelTitle = document.getElementById('level-title');
const finalScore = document.getElementById('final-score');
const leaderboardEntry = document.getElementById('leaderboard-entry');
const leaderboardDisplay = document.getElementById('leaderboard-display');
const playerNameInput = document.getElementById('player-name');
const saveScoreBtn = document.getElementById('save-score-btn');
const leaderboardList = document.getElementById('leaderboard-list');
const gameOverTitle = document.getElementById('game-over-title');

// Buttons
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('continue-btn').addEventListener('click', continueGame);
saveScoreBtn.addEventListener('click', saveScore);

// Set canvas to internal logical size, scaling handled by CSS/Container
const GAME_WIDTH = 500;
const GAME_HEIGHT = 800;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// Audio System
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let engineOsc = null;
let engineGain = null;
let engineFilter = null;

const SoundManager = {
    playTone: function(freq, type, duration, vol=0.1) {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    playExplosion: function() {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const bufferSize = audioCtx.sampleRate * 1.5; 
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // white noise
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 1.5);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start();
    },
    playPop: function() { 
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    },
    playCoin: function() {
        this.playTone(1200, 'sine', 0.1, 0.2);
        setTimeout(() => this.playTone(1600, 'sine', 0.2, 0.2), 100);
    },
    playRocket: function() {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1);
    },
    playShield: function() {
        this.playTone(400, 'square', 0.2, 0.2);
        setTimeout(() => this.playTone(600, 'square', 0.4, 0.2), 150);
    },
    playShoot: function() {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    },
    startEngine: function() {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        if(engineOsc) return;
        engineOsc = audioCtx.createOscillator();
        engineOsc.type = 'triangle'; // Changed from sawtooth to triangle to remove harshness
        engineOsc.frequency.value = 100; // Put back to 100Hz
        
        engineFilter = audioCtx.createBiquadFilter();
        engineFilter.type = 'lowpass';
        engineFilter.frequency.value = 150; // Cut off high frequencies to make it a deep purr

        engineGain = audioCtx.createGain();
        engineGain.gain.value = 0.4; // Triangle is quieter perceptually, slight boost

        engineOsc.connect(engineFilter);
        engineFilter.connect(engineGain);
        engineGain.connect(audioCtx.destination);
        
        engineOsc.start();
    },
    updateEngine: function(isAccelerating) {
        if(!engineOsc) return;
        const targetFreq = isAccelerating ? 200 : 100;
        const targetVol = isAccelerating ? 0.6 : 0.4;
        const targetFilter = isAccelerating ? 600 : 150;
        
        engineOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1);
        engineGain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.1);
        engineFilter.frequency.setTargetAtTime(targetFilter, audioCtx.currentTime, 0.1);
    },
    stopEngine: function() {
        if(engineOsc) {
            engineOsc.stop();
            engineOsc.disconnect();
            engineOsc = null;
        }
    }
};

// Fix for background/lock-screen audio noise
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        if (audioCtx.state === 'running') audioCtx.suspend();
    } else {
        if (isPlaying && audioCtx.state === 'suspended') audioCtx.resume();
    }
});

// Leaderboard & Confetti Logic
let leaderboard = JSON.parse(localStorage.getItem('nexonLeaderboard')) || [];

function saveScore() {
    const name = playerNameInput.value.trim() || 'Anonymous Racer';
    leaderboard.push({ name: name, score: score });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5); // Top 5
    localStorage.setItem('nexonLeaderboard', JSON.stringify(leaderboard));
    displayLeaderboard();
}

function displayLeaderboard() {
    leaderboardList.innerHTML = '';
    leaderboard.forEach((entry, index) => {
        const li = document.createElement('li');
        if (index === 0) li.className = 'rank-1';
        li.innerHTML = `<span>#${index + 1} ${entry.name}</span> <span>${entry.score} pts</span>`;
        leaderboardList.appendChild(li);
    });
    leaderboardEntry.classList.add('hidden');
    leaderboardDisplay.classList.remove('hidden');
}

function startConfetti() {
    const container = document.createElement('div');
    container.id = 'confetti-container';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.overflow = 'hidden';
    container.style.zIndex = '100';
    document.getElementById('game-container').appendChild(container);

    for (let i = 0; i < 150; i++) {
        const conf = document.createElement('div');
        conf.style.position = 'absolute';
        conf.style.width = '12px';
        conf.style.height = '12px';
        conf.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        conf.style.left = '50%';
        conf.style.top = '50%';
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 400 + 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity - 300; 
        
        conf.animate([
            { transform: `translate(0,0) rotate(0deg)`, opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) rotate(${Math.random()*720}deg)`, opacity: 1, offset: 0.5 },
            { transform: `translate(${tx}px, ${ty + 800}px) rotate(${Math.random()*1440}deg)`, opacity: 0 }
        ], {
            duration: 2500 + Math.random() * 1500,
            easing: 'cubic-bezier(.25,.8,.25,1)',
            fill: 'forwards'
        });
        container.appendChild(conf);
    }
}

// Assets
const carImg = new Image();
carImg.src = './car.png'; 
let transparentCarCanvas = document.createElement('canvas');
let carProcessed = false;

// Remove white background from generated car image
carImg.onload = () => {
    transparentCarCanvas.width = carImg.width;
    transparentCarCanvas.height = carImg.height;
    const tCtx = transparentCarCanvas.getContext('2d');
    tCtx.drawImage(carImg, 0, 0);
    
    const imgData = tCtx.getImageData(0, 0, carImg.width, carImg.height);
    const data = imgData.data;
    for(let i=0; i<data.length; i+=4) {
        if(data[i] > 220 && data[i+1] > 220 && data[i+2] > 220) {
            data[i+3] = 0; 
        }
    }
    tCtx.putImageData(imgData, 0, 0);
    carProcessed = true;
    drawRoad();
    drawPlayer();
};

// Game State
let animationId;
let isPlaying = false;
let score = 0;
let level = 1;
let baseSpeed = 5;
let roadOffset = 0;
let frames = 0;
let crashed = false;

// Input Handling
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, s: false, a: false, d: false, Control: false };
let currentHueRotation = 0; 

window.addEventListener('keydown', (e) => { 
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true; 
    if (e.key === 'Control') keys.Control = true;

    const k = e.key.toLowerCase();
    if (k === 'r') currentHueRotation = 150; // Red
    if (k === 'y') currentHueRotation = 210; // Yellow
    if (k === 'g') currentHueRotation = 270; // Green
    if (k === 'b') currentHueRotation = 0;   // Blue
});
window.addEventListener('keyup', (e) => { 
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false; 
    if (e.key === 'Control') keys.Control = false;
});

// Mobile Controls Setup
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const mobileControls = document.getElementById('mobile-controls');
const btnBlast = document.getElementById('btn-blast');

if (isTouchDevice) {
    mobileControls.classList.remove('hidden');

    // D-Pad
    const setupTouchBtn = (id, keyName) => {
        const btn = document.getElementById(id);
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; });
    };
    setupTouchBtn('btn-up', 'ArrowUp');
    setupTouchBtn('btn-down', 'ArrowDown');
    setupTouchBtn('btn-left', 'ArrowLeft');
    setupTouchBtn('btn-right', 'ArrowRight');

    // Blast Button
    btnBlast.addEventListener('touchstart', (e) => { e.preventDefault(); keys.Control = true; });
    btnBlast.addEventListener('touchend', (e) => { e.preventDefault(); keys.Control = false; });

    // Color Buttons
    document.getElementById('btn-color-b').addEventListener('touchstart', (e) => { e.preventDefault(); currentHueRotation = 0; });
    document.getElementById('btn-color-r').addEventListener('touchstart', (e) => { e.preventDefault(); currentHueRotation = 150; });
    document.getElementById('btn-color-y').addEventListener('touchstart', (e) => { e.preventDefault(); currentHueRotation = 210; });
    document.getElementById('btn-color-g').addEventListener('touchstart', (e) => { e.preventDefault(); currentHueRotation = 270; });
}

// Player Object
const player = {
    x: GAME_WIDTH / 2 - 30, y: GAME_HEIGHT - 150,
    width: 60, height: 120, speed: 7,
    isShielded: false, isTurbo: false, powerupTimer: 0
};

// Entities
let obstacles = [];
let items = [];
let bullets = [];
let bulletCooldown = 0;

const OBSTACLE_TYPES = [
    { emoji: '🚗', width: 50, height: 80, type: 'car', speedFactor: 0.5 }, 
    { emoji: '🚚', width: 60, height: 100, type: 'truck', speedFactor: 0.3 }, 
    { emoji: '🪨', width: 40, height: 40, type: 'rock', speedFactor: 0 },    
];

const ITEM_TYPES = [
    { emoji: '🚀', type: 'turbo', color: '#ff5500' },
    { emoji: '🛡️', type: 'shield', color: '#00ccff' },
    { emoji: '🪙', type: 'coin', color: '#ffcc00' }
];

function resetGame() {
    const existingConfetti = document.getElementById('confetti-container');
    if (existingConfetti) existingConfetti.remove();

    score = 0; level = 1; baseSpeed = 5; obstacles = []; items = []; bullets = []; bulletCooldown = 0;
    player.x = GAME_WIDTH / 2 - 30; player.y = GAME_HEIGHT - 150;
    player.isShielded = false; player.isTurbo = false; player.powerupTimer = 0;
    frames = 0; crashed = false;
    updateHUD();
    rainOverlay.classList.add('hidden');
    SoundManager.startEngine();
}

function startGame() {
    startMenu.classList.add('hidden');
    gameOverMenu.classList.add('hidden');
    hud.classList.remove('hidden');
    resetGame();
    isPlaying = true;
    gameLoop();
}

function continueGame() {
    levelMenu.classList.add('hidden');
    isPlaying = true;
    SoundManager.startEngine();
    gameLoop();
}

function spawnObstacle() {
    if (frames % Math.max(30, 100 - level * 10) === 0) {
        const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
        const laneX = Math.random() * (GAME_WIDTH - type.width - 40) + 20; 
        obstacles.push({ x: laneX, y: -type.height - 20, width: type.width, height: type.height, type: type.type, emoji: type.emoji, speed: baseSpeed * type.speedFactor });
    }
}

function spawnItem() {
    if (frames % 200 === 0 && Math.random() > 0.3) {
        const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
        const laneX = Math.random() * (GAME_WIDTH - 40 - 40) + 20;
        items.push({ x: laneX, y: -40, width: 40, height: 40, type: type.type, emoji: type.emoji });
    }
}

function updatePlayer() {
    let currentSpeed = player.speed;
    if (player.isTurbo) currentSpeed *= 1.5;
    let slip = 0;
    if (level === 2 && !player.isTurbo) { slip = (Math.random() - 0.5) * 2; }

    const isAccelerating = keys.ArrowUp || keys.w;
    SoundManager.updateEngine(isAccelerating || player.isTurbo);

    if ((keys.ArrowLeft || keys.a) && player.x > 20) player.x -= currentSpeed + slip;
    if ((keys.ArrowRight || keys.d) && player.x < GAME_WIDTH - player.width - 20) player.x += currentSpeed + slip;
    if ((keys.ArrowUp || keys.w) && player.y > 20) player.y -= currentSpeed;
    if ((keys.ArrowDown || keys.s) && player.y < GAME_HEIGHT - player.height - 20) player.y += currentSpeed;

    if (bulletCooldown > 0) bulletCooldown--;
    if (keys.Control && player.isTurbo && bulletCooldown === 0) {
        bullets.push({x: player.x + player.width / 2 - 5, y: player.y, w: 10, h: 25});
        SoundManager.playShoot();
        bulletCooldown = 12; 
    }

    if (player.powerupTimer > 0) {
        player.powerupTimer--;
        if (player.powerupTimer === 0) {
            player.isShielded = false; player.isTurbo = false; activePowerup.classList.add('hidden');
            if (isTouchDevice) btnBlast.classList.add('disabled');
        }
    }
}

function checkCollisions() {
    const pRect = { x: player.x + 20, y: player.y + 20, w: player.width - 40, h: player.height - 40 }; 

    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        const oRect = { x: obs.x + 10, y: obs.y + 10, w: obs.width - 20, h: obs.height - 20 };
        
        let shot = false;
        for(let j = 0; j < bullets.length; j++) {
            const b = bullets[j];
            if (b.x < oRect.x + oRect.w && b.x + b.w > oRect.x &&
                b.y < oRect.y + oRect.h && b.y + b.h > oRect.y) {
                bullets.splice(j, 1);
                shot = true;
                break;
            }
        }

        if (shot) {
            obstacles.splice(i, 1);
            SoundManager.playPop(); 
            score += 20; 
            i--;
            continue;
        }

        if (pRect.x < oRect.x + oRect.w && pRect.x + pRect.w > oRect.x &&
            pRect.y < oRect.y + oRect.h && pRect.y + pRect.h > oRect.y) {
            
            if (player.isShielded || player.isTurbo) {
                obstacles.splice(i, 1);
                SoundManager.playPop();
                score += 50; i--;
            } else {
                gameOver(obs);
                return;
            }
        }
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (pRect.x < item.x + item.width && pRect.x + pRect.w > item.x &&
            pRect.y < item.y + item.height && pRect.y + pRect.h > item.y) {
            applyPowerup(item.type);
            items.splice(i, 1); i--;
        }
    }
}

function applyPowerup(type) {
    activePowerup.classList.remove('hidden');
    if (type === 'coin') {
        SoundManager.playCoin();
        score += 100; activePowerup.classList.add('hidden');
    } else if (type === 'shield') {
        SoundManager.playShield();
        player.isShielded = true; player.isTurbo = false; player.powerupTimer = 300; powerupIcon.innerText = '🛡️';
    } else if (type === 'turbo') {
        SoundManager.playRocket();
        player.isTurbo = true; player.isShielded = true; player.powerupTimer = 300; powerupIcon.innerText = '🚀';
        if (isTouchDevice) btnBlast.classList.remove('disabled');
    }
}

function checkLevelUp() {
    let nextLevel = false;
    if (score >= 1500 && level === 1) {
        level = 2; baseSpeed = 7; nextLevel = true;
        rainOverlay.classList.remove('hidden');
        levelTitle.innerText = "Level 2!"; document.getElementById('level-desc').innerHTML = "Watch out for the Rain! 🌧️ The road is slippery.";
    } else if (score >= 3500 && level === 2) {
        level = 3; baseSpeed = 10; nextLevel = true;
        rainOverlay.classList.add('hidden'); 
        levelTitle.innerText = "Level 3!"; document.getElementById('level-desc').innerHTML = "Maximum Speed! ⚡ Hold on tight, Radhesh!";
    }

    if (nextLevel) {
        isPlaying = false; 
        SoundManager.stopEngine();
        levelMenu.classList.remove('hidden'); 
        updateHUD();
    }
}

function gameOver(hitObs) {
    isPlaying = false;
    crashed = true;
    SoundManager.stopEngine();
    SoundManager.playExplosion();

    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const crashX = (player.x + hitObs.x) / 2 + 20;
    const crashY = (player.y + hitObs.y) / 2 + 30;
    ctx.fillText('💥', crashX, crashY);
    ctx.fillText('🔥', crashX + 20, crashY + 10);

    const DESIRED_POINTS = 5000;
    const isHighScore = leaderboard.length < 5 || score > (leaderboard[leaderboard.length - 1]?.score || 0);

    setTimeout(() => {
        if (score >= DESIRED_POINTS) {
            gameOverTitle.innerText = "Victory! 🎉🏆";
            startConfetti();
            SoundManager.playCoin(); 
        } else {
            gameOverTitle.innerText = "Game Over! 💥";
        }

        finalScore.innerText = score;
        gameOverMenu.classList.remove('hidden');
        hud.classList.add('hidden');

        if (isHighScore && score >= DESIRED_POINTS) {
            leaderboardEntry.classList.remove('hidden');
            leaderboardDisplay.classList.add('hidden');
            playerNameInput.value = '';
            playerNameInput.focus();
        } else {
            leaderboardEntry.classList.add('hidden');
            displayLeaderboard();
        }
    }, 1500);
}

function updateHUD() { scoreDisplay.innerText = score; levelDisplay.innerText = level; }

function drawRoad() {
    const isNight = level >= 3;
    ctx.fillStyle = isNight ? '#0a1f0f' : '#1e5e2e'; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = isNight ? '#1a1a1a' : '#333'; ctx.fillRect(20, 0, GAME_WIDTH - 40, GAME_HEIGHT);
    ctx.fillStyle = isNight ? 'rgba(255,255,255,0.4)' : '#fff'; 
    roadOffset += baseSpeed; if (roadOffset > 60) roadOffset = 0;
    for (let i = -60; i < GAME_HEIGHT; i += 60) {
        ctx.fillRect(GAME_WIDTH / 3, i + roadOffset, 10, 30); ctx.fillRect((GAME_WIDTH / 3) * 2, i + roadOffset, 10, 30);
    }
    ctx.fillStyle = isNight ? '#665200' : '#ffcc00'; ctx.fillRect(20, 0, 5, GAME_HEIGHT); ctx.fillRect(GAME_WIDTH - 25, 0, 5, GAME_HEIGHT);

    if (isNight) {
        for (let i = -200; i < GAME_HEIGHT; i += 200) {
            let y = (i + roadOffset * 3.33) % (GAME_HEIGHT + 200) - 200; 
            ctx.shadowColor = '#ffffaa'; ctx.shadowBlur = 40; ctx.fillStyle = '#ffffcc';
            ctx.beginPath(); ctx.arc(10, y, 6, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(GAME_WIDTH - 10, y, 6, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.fillStyle = 'rgba(0, 0, 10, 0.5)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
}

function drawPlayer() {
    if (level >= 3) {
        ctx.save();
        ctx.translate(player.x + player.width/2, player.y);
        const gradient = ctx.createLinearGradient(0, 0, 0, -350);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.moveTo(-20, 10); ctx.lineTo(-70, -350); ctx.lineTo(10, -350); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(20, 10); ctx.lineTo(70, -350); ctx.lineTo(-10, -350); ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    if (player.isShielded || player.isTurbo) {
        ctx.beginPath(); ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width, 0, Math.PI * 2);
        ctx.fillStyle = player.isTurbo ? 'rgba(255, 85, 0, 0.4)' : 'rgba(0, 204, 255, 0.4)'; ctx.fill(); ctx.closePath();
    }
    if (carProcessed) {
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        ctx.rotate(Math.PI); 
        
        if (currentHueRotation !== 0) {
            ctx.filter = `hue-rotate(${currentHueRotation}deg) saturate(1.5)`;
        }
        
        ctx.drawImage(transparentCarCanvas, -player.width / 2, -player.height / 2, player.width, player.height);
        
        ctx.filter = 'none';
        ctx.restore();
    } else {
        ctx.fillStyle = '#000'; ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

function gameLoop() {
    if (!isPlaying) return;
    frames++;
    if (frames % 10 === 0) { score += (level * 2); updateHUD(); }
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawRoad();
    updatePlayer();
    spawnObstacle();
    spawnItem();

    ctx.fillStyle = '#ffff00';
    for(let i=0; i<bullets.length; i++) {
        let b = bullets[i];
        b.y -= 15;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 10; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.shadowBlur = 0;
        if(b.y < 0) { bullets.splice(i, 1); i--; }
    }

    ctx.font = '40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        obs.y += baseSpeed - obs.speed; 
        
        if (level >= 3 && (obs.type === 'car' || obs.type === 'truck')) {
            ctx.save();
            ctx.translate(obs.x + obs.width/2, obs.y + 10);
            const grad = ctx.createLinearGradient(0, 0, 0, -250);
            grad.addColorStop(0, 'rgba(255, 255, 200, 0.6)');
            grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-45, -250); ctx.lineTo(45, -250); ctx.lineTo(15, 0); ctx.closePath(); ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(obs.x + obs.width/2, obs.y + obs.height/2);
        if (obs.type === 'car' || obs.type === 'truck') {
            ctx.rotate(Math.PI / 2); 
        }
        ctx.fillText(obs.emoji, 0, 0);
        ctx.restore();

        if (obs.y > GAME_HEIGHT) { obstacles.splice(i, 1); i--; }
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        item.y += baseSpeed;
        const floatY = Math.sin((frames + item.x) * 0.1) * 5;
        ctx.shadowColor = ITEM_TYPES.find(t => t.type === item.type).color; ctx.shadowBlur = 15;
        ctx.fillText(item.emoji, item.x + item.width/2, item.y + item.height/2 + floatY);
        ctx.shadowBlur = 0; 
        if (item.y > GAME_HEIGHT) { items.splice(i, 1); i--; }
    }

    drawPlayer();
    checkCollisions();
    if(isPlaying) checkLevelUp();
    if (isPlaying) animationId = requestAnimationFrame(gameLoop);
}
