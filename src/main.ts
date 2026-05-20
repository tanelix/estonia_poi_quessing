import './style.css';
import { POIs, TOLERANCES } from './data';
import type { Difficulty, POI } from './data';
import { getDistance, latLngToPixel, pixelToLatLng, distanceToPath } from './utils';

// --- UI Elements ---
const screens = {
  menu: document.getElementById('menu-screen')!,
  game: document.getElementById('game-screen')!,
  end: document.getElementById('end-screen')!
};

// Menu Elements
const highScoreEasyEl = document.getElementById('high-score-easy')!;
const highScoreMediumEl = document.getElementById('high-score-medium')!;
const highScoreHardEl = document.getElementById('high-score-hard')!;
const difficultyBtns = document.querySelectorAll<HTMLButtonElement>('.difficulty-buttons .btn');

// Game Elements
const roundNumberEl = document.getElementById('round-number')!;
const currentScoreEl = document.getElementById('current-score')!;
const mapImg = document.getElementById('estonia-map') as HTMLImageElement;
const mapContainer = document.querySelector('.map-container') as HTMLElement;
const guessMarker = document.getElementById('guess-marker')!;
const actualMarker = document.getElementById('actual-marker')!;
const connectionLine = document.getElementById('connection-line')!;
const lineElement = document.getElementById('line-element')!;
const poiOverlay = document.getElementById('poi-overlay')!;
const poiNameEl = document.getElementById('poi-name')!;
const resultOverlay = document.getElementById('result-overlay')!;
const resultText = document.getElementById('result-text')!;
const resultPoints = document.getElementById('result-points')!;
const nextBtn = document.getElementById('next-btn')!;
const exitGameBtn = document.getElementById('exit-game-btn')!;

// End Elements
const finalScoreEl = document.getElementById('final-score')!;
const playAgainBtn = document.getElementById('play-again-btn')!;
const backMenuBtn = document.getElementById('back-menu-btn')!;

// --- Game State ---
const TOTAL_ROUNDS = 10;
let currentRound = 1;
let score = 0;
let currentDifficulty: Difficulty = 'easy';
let currentPOI: POI | null = null;
let remainingPOIs: POI[] = [];
let hasGuessed = false;

// --- Initialization ---
function init() {
  loadHighScore();
  setupEventListeners();
  showScreen('menu');
}

function loadHighScore() {
  const saved = localStorage.getItem('estoniaMapHighScoreV2');
  if (saved) {
    const scores = JSON.parse(saved);
    if (scores.easy) highScoreEasyEl.textContent = `${scores.easy.score}`;
    if (scores.medium) highScoreMediumEl.textContent = `${scores.medium.score}`;
    if (scores.hard) highScoreHardEl.textContent = `${scores.hard.score}`;
  }
}

function saveHighScore(newScore: number) {
  const saved = localStorage.getItem('estoniaMapHighScoreV2');
  let scores: any = { easy: { score: 0 }, medium: { score: 0 }, hard: { score: 0 } };
  
  if (saved) {
    scores = JSON.parse(saved);
  }
  
  if (!scores[currentDifficulty]) {
    scores[currentDifficulty] = { score: 0 };
  }
  
  if (newScore > scores[currentDifficulty].score) {
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getFullYear()).slice(2)}`;
    scores[currentDifficulty] = { score: newScore, date: dateStr };
    localStorage.setItem('estoniaMapHighScoreV2', JSON.stringify(scores));
    loadHighScore();
  }
}

function setupEventListeners() {
  difficultyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLButtonElement;
      startGame(target.dataset.difficulty as Difficulty);
    });
  });

  mapImg.addEventListener('click', handleMapClick);

  nextBtn.addEventListener('click', nextRound);

  exitGameBtn.addEventListener('click', () => {
    // Return to menu without saving an incomplete game's score
    showScreen('menu');
  });

  playAgainBtn.addEventListener('click', () => {
    startGame(currentDifficulty);
  });

  backMenuBtn.addEventListener('click', () => {
    showScreen('menu');
  });
}

function showScreen(screenName: 'menu' | 'game' | 'end') {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[screenName].classList.add('active');
}

// --- Game Loop ---
function startGame(difficulty: Difficulty) {
  currentDifficulty = difficulty;
  currentRound = 1;
  score = 0;
  hasGuessed = false;
  
  // Filter POIs: Medium includes easy, Hard includes easy+medium
  remainingPOIs = [...POIs];
  if (difficulty === 'easy') {
    remainingPOIs = remainingPOIs.filter(p => p.difficulty === 'easy');
  } else if (difficulty === 'medium') {
    remainingPOIs = remainingPOIs.filter(p => p.difficulty === 'easy' || p.difficulty === 'medium');
  }
  
  // Shuffle
  remainingPOIs.sort(() => Math.random() - 0.5);
  
  updateScoreUI();
  showScreen('game');
  startRound();
}

function startRound() {
  if (currentRound > TOTAL_ROUNDS || remainingPOIs.length === 0) {
    endGame();
    return;
  }

  hasGuessed = false;
  currentPOI = remainingPOIs.pop()!;
  
  roundNumberEl.textContent = currentRound.toString();
  poiNameEl.textContent = currentPOI.name;
  
  // Reset UI
  poiOverlay.classList.remove('hidden');
  poiOverlay.classList.remove('corner');
  resultOverlay.classList.add('hidden');
  guessMarker.classList.add('hidden');
  actualMarker.classList.add('hidden');
  connectionLine.classList.add('hidden');
  mapContainer.classList.remove('zoomed');
  
  // Animate POI text to corner after a short delay
  setTimeout(() => {
    poiOverlay.classList.add('corner');
  }, 1500);
}

function handleMapClick(e: MouseEvent) {
  if (hasGuessed || !currentPOI) return;
  hasGuessed = true;
  
  // Convert click to LatLng (using mapContainer dimensions)
  const rect = mapContainer.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  
  // Place Guess Marker
  guessMarker.style.left = `${clickX}px`;
  guessMarker.style.top = `${clickY}px`;
  guessMarker.classList.remove('hidden');
  
  const { lat: guessLat, lng: guessLng } = pixelToLatLng(clickX, clickY, rect.width, rect.height);
  
  // Calculate distance
  let distance = 0;
  if (currentPOI.type === 'river' && currentPOI.path) {
    distance = distanceToPath(guessLat, guessLng, currentPOI.path);
  } else {
    distance = getDistance(guessLat, guessLng, currentPOI.lat, currentPOI.lng);
  }
  
  // Score calculation
  const tolerance = TOLERANCES[currentDifficulty];
  let points = 0;
  if (distance <= tolerance) {
    points = Math.round(tolerance - distance);
  }
  
  // Show Actual Location
  const actualPixel = latLngToPixel(currentPOI.lat, currentPOI.lng, rect.width, rect.height);
  actualMarker.style.left = `${actualPixel.x}px`;
  actualMarker.style.top = `${actualPixel.y}px`;
  actualMarker.classList.remove('hidden');
  
  // Draw Connection Line
  connectionLine.classList.remove('hidden');
  lineElement.setAttribute('x1', `${clickX}`);
  lineElement.setAttribute('y1', `${clickY}`);
  lineElement.setAttribute('x2', `${actualPixel.x}`);
  lineElement.setAttribute('y2', `${actualPixel.y}`);
  
  // Zoom to the area
  const midX = (clickX + actualPixel.x) / 2;
  const midY = (clickY + actualPixel.y) / 2;
  mapContainer.style.transformOrigin = `${midX}px ${midY}px`;
  mapContainer.classList.add('zoomed');
  
  // Show Results
  setTimeout(() => {
    animateScore(points);
    resultText.textContent = `Kaugus: ${Math.round(distance)} km`;
    resultPoints.textContent = `+${points} punkti`;
    if (points === 0) {
      resultPoints.style.color = 'var(--hard)';
      resultText.textContent += ` (Liiga kaugel! Lubatud ${tolerance}km)`;
    } else {
      resultPoints.style.color = 'var(--easy)';
    }
    resultOverlay.classList.remove('hidden');
  }, 500);
}

function animateScore(pointsToAdd: number) {
  if (pointsToAdd === 0) return;
  const startScore = score;
  score += pointsToAdd;
  const duration = 1000;
  const startTime = performance.now();
  
  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing out cubic
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const currentDisplayScore = Math.floor(startScore + pointsToAdd * easeOut);
    currentScoreEl.textContent = currentDisplayScore.toString();
    
    // Pulse effect
    currentScoreEl.style.transform = `scale(${1 + Math.sin(progress * Math.PI) * 0.3})`;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      currentScoreEl.style.transform = 'scale(1)';
    }
  }
  
  requestAnimationFrame(update);
}

function updateScoreUI() {
  currentScoreEl.textContent = score.toString();
  roundNumberEl.textContent = currentRound.toString();
}

function nextRound() {
  currentRound++;
  startRound();
}

function endGame() {
  finalScoreEl.textContent = score.toString();
  saveHighScore(score);
  showScreen('end');
}

// Start
init();
