import './style.css';
import { POIs, TOLERANCES } from './data';
import type { Difficulty, POI } from './data';
import { getDistance, latLngToPixel, pixelToLatLng, distanceToPath, distanceToPolygon } from './utils';

// --- UI Elements ---
const screens = {
  menu: document.getElementById('menu-screen')!,
  game: document.getElementById('game-screen')!,
  end: document.getElementById('end-screen')!
};

// Menu Elements
interface HighScore {
  score: number;
  date: string;
}

function loadHighScores(): Record<string, HighScore> {
  const defaults = { score: 0, date: '' };
  const getScore = (key: string) => {
    const val = localStorage.getItem(key);
    if (!val) return defaults;
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === 'number') return { score: parsed, date: '' };
      return parsed;
    } catch {
      return { score: parseInt(val) || 0, date: '' };
    }
  };
  return {
    easy: getScore('highscore-easy'),
    medium: getScore('highscore-medium'),
    hard: getScore('highscore-hard')
  };
}

let highScores = loadHighScores();
const difficultyBtns = document.querySelectorAll<HTMLButtonElement>('.difficulty-buttons .btn');

// Game Elements
const roundNumberEl = document.getElementById('round-number')!;
const currentScoreEl = document.getElementById('current-score')!;
const mapImg = document.getElementById('estonia-map') as HTMLImageElement;
const mapContainer = document.querySelector('.map-container') as HTMLElement;
const guessMarker = document.getElementById('guess-marker')!;
const actualMarker = document.getElementById('actual-marker')!;
const contourSvg = document.getElementById('contour-svg')!;
const contourPolygon = document.getElementById('contour-polygon')!;
const contourPolyline = document.getElementById('contour-polyline')!;
const connectionLine = document.getElementById('connection-line')!;
const lineElement = document.getElementById('line-element')!;
const poiOverlay = document.getElementById('poi-overlay')!;
const poiName = document.getElementById('poi-name')!;
const resultOverlay = document.getElementById('result-overlay')!;
const nextBtn = document.getElementById('next-btn')!;
const exitGameBtn = document.getElementById('exit-game-btn')!;

// New Elements
const zoomInBtn = document.getElementById('zoom-in-btn')!;
const zoomOutBtn = document.getElementById('zoom-out-btn')!;
const mapWrapper = document.querySelector('.map-wrapper') as HTMLElement;

const DEFAULT_SCALE = 1.2;

// State Variables
let currentScale = DEFAULT_SCALE;
let panX = 0;
let panY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

// Helper to update transform
function updateMapTransform() {
  mapContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
}

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
  updateMenuHighScores();
  setupEventListeners();
  showScreen('menu');
}

function updateMenuHighScores() {
  document.getElementById('high-score-easy')!.textContent = `${highScores.easy.score}`;
  document.getElementById('high-score-medium')!.textContent = `${highScores.medium.score}`;
  document.getElementById('high-score-hard')!.textContent = `${highScores.hard.score}`;
}

function saveHighScore() {
  if (score > highScores[currentDifficulty].score) {
    const dateStr = new Date().toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: '2-digit' });
    highScores[currentDifficulty] = { score, date: dateStr };
    localStorage.setItem(`highscore-${currentDifficulty}`, JSON.stringify(highScores[currentDifficulty]));
    updateMenuHighScores();
  }
}

function setupEventListeners() {
  difficultyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      startGame(target.dataset.difficulty as Difficulty);
    });
  });

  mapImg.addEventListener('click', handleMapClick);

  nextBtn.addEventListener('click', nextRound);

  exitGameBtn.addEventListener('click', () => {
    showScreen('menu');
  });

  playAgainBtn.addEventListener('click', () => {
    startGame(currentDifficulty);
  });

  backMenuBtn.addEventListener('click', () => {
    showScreen('menu');
  });

  // Zoom Controls
  zoomInBtn.addEventListener('click', () => {
    currentScale = Math.min(currentScale + 0.5, 4);
    updateMapTransform();
  });

  zoomOutBtn.addEventListener('click', () => {
    currentScale = Math.max(currentScale - 0.5, DEFAULT_SCALE);
    updateMapTransform();
  });

  // Drag to pan
  mapWrapper.addEventListener('mousedown', (e) => {
    if (e.target !== mapImg) return;
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    mapWrapper.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateMapTransform();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    mapWrapper.style.cursor = 'default';
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
  
  remainingPOIs = [...POIs];
  if (difficulty === 'easy') {
    remainingPOIs = remainingPOIs.filter(p => p.difficulty === 'easy');
  } else if (difficulty === 'medium') {
    remainingPOIs = remainingPOIs.filter(p => p.difficulty === 'easy' || p.difficulty === 'medium');
  }
  
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
  poiName.textContent = currentPOI.name;
  
  // Reset UI
  poiOverlay.classList.remove('hidden');
  resultOverlay.classList.add('hidden');
  guessMarker.classList.add('hidden');
  actualMarker.classList.add('hidden');
  contourSvg.classList.add('hidden');
  contourPolygon.classList.add('hidden');
  contourPolyline.classList.add('hidden');
  connectionLine.classList.add('hidden');
  
  // Reset pan and zoom to default
  if (window.innerWidth > window.innerHeight) {
    currentScale = 1.4;
    panY = mapWrapper.clientHeight * 0.1; // Move view north (translate map down)
  } else {
    currentScale = DEFAULT_SCALE;
    panY = -(mapWrapper.clientHeight * 0.1); // Move centerpoint up 10%
  }
  panX = 0;
  updateMapTransform();
}

function handleMapClick(e: MouseEvent) {
  if (hasGuessed || !currentPOI) return;
  if (isDragging && (Math.abs(e.clientX - panX - startX) > 5 || Math.abs(e.clientY - panY - startY) > 5)) return; // Ignore click if dragging
  hasGuessed = true;
  
  const rect = mapContainer.getBoundingClientRect();
  const unscaledW = mapContainer.offsetWidth;
  const unscaledH = mapContainer.offsetHeight;
  
  const clickX = (e.clientX - rect.left) / currentScale;
  const clickY = (e.clientY - rect.top) / currentScale;
  
  guessMarker.style.left = `${clickX}px`;
  guessMarker.style.top = `${clickY}px`;
  guessMarker.classList.remove('hidden');
  
  const { lat: guessLat, lng: guessLng } = pixelToLatLng(clickX, clickY, unscaledW, unscaledH);
  
  let distance = 0;
  if (currentPOI.polygon) {
    distance = distanceToPolygon(guessLat, guessLng, currentPOI.polygon);
  } else if (currentPOI.type === 'river' && currentPOI.path) {
    distance = distanceToPath(guessLat, guessLng, currentPOI.path);
  } else {
    distance = getDistance(guessLat, guessLng, currentPOI.lat, currentPOI.lng);
  }
  
  const tolerance = TOLERANCES[currentDifficulty];
  let points = 0;
  if (distance <= tolerance) {
    points = Math.round(tolerance - distance);
  }
  
  const actualPixel = latLngToPixel(currentPOI.lat, currentPOI.lng, unscaledW, unscaledH);
  
  if (currentPOI.polygon || currentPOI.path) {
    const shapeCoords = currentPOI.polygon || currentPOI.path;
    const pointsStr = shapeCoords!.map(p => {
      const px = latLngToPixel(p[0], p[1], unscaledW, unscaledH);
      return `${px.x},${px.y}`;
    }).join(' ');
    
    contourSvg.classList.remove('hidden');
    if (currentPOI.polygon) {
      contourPolygon.setAttribute('points', pointsStr);
      contourPolygon.classList.remove('hidden');
    } else {
      contourPolyline.setAttribute('points', pointsStr);
      contourPolyline.classList.remove('hidden');
    }
  } else {
    actualMarker.style.left = `${actualPixel.x}px`;
    actualMarker.style.top = `${actualPixel.y}px`;
    actualMarker.classList.remove('hidden');
  }
  
  connectionLine.classList.remove('hidden');
  lineElement.setAttribute('x1', `${clickX}`);
  lineElement.setAttribute('y1', `${clickY}`);
  lineElement.setAttribute('x2', `${actualPixel.x}`);
  lineElement.setAttribute('y2', `${actualPixel.y}`);
  
  // Auto-zoom to the actual location
  currentScale = 2.5;
  panX = (unscaledW / 2 - actualPixel.x) * currentScale;
  panY = (unscaledH / 2 - actualPixel.y) * currentScale;
  updateMapTransform();
  
  animateScore(points, 2000);
  
  resultOverlay.classList.remove('hidden');
}

function animateScore(pointsToAdd: number, duration = 1000) {
  if (pointsToAdd === 0) {
    return;
  }
  const startScore = score;
  score += pointsToAdd;
  const startTime = performance.now();
  
  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const currentPointsToAdd = Math.floor(pointsToAdd * progress);
    currentScoreEl.textContent = (startScore + currentPointsToAdd).toString();
    currentScoreEl.style.color = progress < 1 ? 'var(--primary)' : 'inherit';
    currentScoreEl.style.transform = progress < 1 ? 'scale(1.2)' : 'scale(1)';
    currentScoreEl.style.display = 'inline-block';
    currentScoreEl.style.transition = 'transform 0.1s ease';
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      currentScoreEl.style.transform = 'scale(1)';
      currentScoreEl.style.color = 'inherit';
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
  saveHighScore();
  showScreen('end');
}

// Start
init();
