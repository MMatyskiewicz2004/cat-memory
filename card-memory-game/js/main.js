/**
 * Cat Memory — my gameplay code.
 *
 * GSAP (loaded in index.html before this file): I only use it in two places:
 *   1) flipCard() — tweens .card-inner on rotationY so cards flip in 3D.
 *   2) handleCardClick() — when two cards match, I run a short gsap.to() "pulse"
 *      (scale up/down) on both matched buttons for feedback.
 *
 * Everything else is plain DOM + setInterval + localStorage.
 */

// -----------------------------------------------------------------------------
// Board & timing — I chose 4×3 (12 cards, 6 pairs) and how long wrong pairs show
// -----------------------------------------------------------------------------
const BOARD_COLS = 4;
const BOARD_ROWS = 3;
const TOTAL_CARDS = BOARD_COLS * BOARD_ROWS;
const TOTAL_PAIRS = TOTAL_CARDS / 2;

const WRONG_PAIR_DISPLAY_MS = 1200;

const ASSETS_DIR = "assets";
const PAIR_KEYS = ["black", "blue", "orange", "pink", "purple", "yellow"];

function cardFaceSrc(pairKey, variant) {
  return `${ASSETS_DIR}/${pairKey}_${variant}.PNG`;
}

function getFrontImg(cardElement) {
  return cardElement.querySelector(".card-face--front .card-face__img");
}

function setCardFrontVariant(cardElement, variant) {
  const key = cardElement.dataset.pairKey;
  const img = getFrontImg(cardElement);
  if (img && key) img.src = cardFaceSrc(key, variant);
}

// -----------------------------------------------------------------------------
// DOM — I grab everything I need once at load
// -----------------------------------------------------------------------------
const menuScreen = document.getElementById("menu-screen");
const gameScreen = document.getElementById("game-screen");
const winScreen = document.getElementById("win-screen");
const startButton = document.getElementById("start-button");
const menuButton = document.getElementById("menu-button");
const menuButtonWin = document.getElementById("menu-button-win");
const playAgainButton = document.getElementById("play-again-button");
const gameBoard = document.getElementById("game-board");
const timerValue = document.getElementById("timer-value");
const bestTimeDisplay = document.getElementById("best-time-display");
const winTimeValue = document.getElementById("win-time-value");

// -----------------------------------------------------------------------------
// Game state — I reset most of this when I build a new board
// -----------------------------------------------------------------------------
let deck = [];
let firstCard = null;
let secondCard = null;
let isChecking = false;
let matchedPairs = 0;
let timerInterval = null;
let startTime = null;
let currentTime = 0;

// -----------------------------------------------------------------------------
// Boot — I wire buttons here and make sure GSAP exists (I need it for flips)
// -----------------------------------------------------------------------------
function init() {
  if (!startButton || !menuButton || !menuButtonWin || !playAgainButton) return;
  if (typeof gsap === "undefined") return;

  loadBestTime();
  startButton.addEventListener("click", startGame);
  menuButton.addEventListener("click", goToMenu);
  menuButtonWin.addEventListener("click", goToMenu);
  playAgainButton.addEventListener("click", startGame);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  requestAnimationFrame(init);
}

// -----------------------------------------------------------------------------
// Screens — I toggle .screen--active on three sections (menu / game / win)
// -----------------------------------------------------------------------------
function showScreen(screen) {
  menuScreen.classList.remove("screen--active");
  gameScreen.classList.remove("screen--active");
  winScreen.classList.remove("screen--active");

  if (screen === "menu") menuScreen.classList.add("screen--active");
  else if (screen === "game") gameScreen.classList.add("screen--active");
  else if (screen === "win") winScreen.classList.add("screen--active");
}

// -----------------------------------------------------------------------------
// Timer — I use setInterval to update the label while a run is active
// -----------------------------------------------------------------------------
function startTimer() {
  startTime = Date.now();
  currentTime = 0;
  updateTimerDisplay(0);
  timerInterval = setInterval(() => {
    currentTime = Date.now() - startTime;
    updateTimerDisplay(currentTime);
  }, 10);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const ms = Math.floor((milliseconds % 1000) / 10);
  timerValue.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const ms = Math.floor((milliseconds % 1000) / 10);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

// -----------------------------------------------------------------------------
// Best time — I persist my personal best in localStorage under this key
// -----------------------------------------------------------------------------
const BEST_TIME_KEY = "memoryGameBestTime";

function loadBestTime() {
  const bestTime = localStorage.getItem(BEST_TIME_KEY);
  bestTimeDisplay.textContent = bestTime ? formatTime(parseInt(bestTime, 10)) : "--:--.--";
}

function saveBestTime(milliseconds) {
  const currentBest = localStorage.getItem(BEST_TIME_KEY);
  if (!currentBest || milliseconds < parseInt(currentBest, 10)) {
    localStorage.setItem(BEST_TIME_KEY, String(milliseconds));
    loadBestTime();
  }
}

// -----------------------------------------------------------------------------
// Deck & cards — I build pairs from PAIR_KEYS, shuffle, then render buttons
// -----------------------------------------------------------------------------
function createShuffledDeck() {
  const keys = PAIR_KEYS.slice(0, TOTAL_PAIRS);
  const next = [];
  keys.forEach((pairKey, index) => {
    next.push({ id: `${index}-a`, pairKey, matched: false });
    next.push({ id: `${index}-b`, pairKey, matched: false });
  });
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function createCardElement(cardData) {
  const card = document.createElement("button");
  card.className = "card";
  card.type = "button";
  card.dataset.cardId = cardData.id;
  card.dataset.pairKey = cardData.pairKey;

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const backFace = document.createElement("div");
  backFace.className = "card-face card-face--back";
  backFace.setAttribute("aria-hidden", "true");

  const frontFace = document.createElement("div");
  frontFace.className = "card-face card-face--front";
  const frontImg = document.createElement("img");
  frontImg.className = "card-face__img";
  frontImg.src = cardFaceSrc(cardData.pairKey, "n");
  frontImg.alt = "";
  frontFace.appendChild(frontImg);

  inner.appendChild(backFace);
  inner.appendChild(frontFace);
  card.appendChild(inner);
  card.addEventListener("click", () => handleCardClick(card));
  return card;
}

// -----------------------------------------------------------------------------
// GSAP — flipCard(): I tween the inner wrapper’s rotationY for the flip motion
// -----------------------------------------------------------------------------
function flipCard(cardElement, isFlipped) {
  const inner = cardElement.querySelector(".card-inner");
  if (!inner) return;

  gsap.killTweensOf(inner);
  gsap.to(inner, {
    rotationY: isFlipped ? 180 : 0,
    duration: 0.15,
    ease: "power2.out",
    onStart: () => {
      cardElement.classList.toggle("card--flipped", isFlipped);
    }
  });
}

function buildBoard() {
  gameBoard.innerHTML = "";
  deck = createShuffledDeck();
  matchedPairs = 0;
  firstCard = null;
  secondCard = null;
  isChecking = false;
  deck.forEach((cardData) => {
    gameBoard.appendChild(createCardElement(cardData));
  });
}

// -----------------------------------------------------------------------------
// Clicks — I compare dataset.pairKey; neutral / wrong / correct PNGs swap here
// -----------------------------------------------------------------------------
function handleCardClick(cardElement) {
  if (isChecking) return;
  if (cardElement.classList.contains("card--matched")) return;
  if (cardElement.classList.contains("card--flipped")) return;
  if (cardElement === firstCard) return;

  flipCard(cardElement, true);

  if (!firstCard) {
    firstCard = cardElement;
    return;
  }

  secondCard = cardElement;
  isChecking = true;

  const firstKey = firstCard.dataset.pairKey;
  const secondKey = secondCard.dataset.pairKey;

  if (firstKey === secondKey) {
    setTimeout(() => {
      setCardFrontVariant(firstCard, "correct");
      setCardFrontVariant(secondCard, "correct");
      firstCard.classList.add("card--matched");
      secondCard.classList.add("card--matched");
      matchedPairs++;

      // GSAP — match pulse: quick scale bounce on both cards I just matched
      gsap.to([firstCard, secondCard], {
        scale: 1.1,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: "power2.out"
      });

      resetSelection();
      checkForWin();
    }, 500);
  } else {
    setCardFrontVariant(firstCard, "wrong");
    setCardFrontVariant(secondCard, "wrong");
    setTimeout(() => {
      flipCard(firstCard, false);
      flipCard(secondCard, false);
      setCardFrontVariant(firstCard, "n");
      setCardFrontVariant(secondCard, "n");
      resetSelection();
    }, WRONG_PAIR_DISPLAY_MS);
  }
}

function resetSelection() {
  firstCard = null;
  secondCard = null;
  isChecking = false;
}

function checkForWin() {
  if (matchedPairs !== TOTAL_PAIRS) return;
  stopTimer();
  const finalTime = currentTime;
  saveBestTime(finalTime);
  winTimeValue.textContent = formatTime(finalTime);
  setTimeout(() => showScreen("win"), 500);
}

// -----------------------------------------------------------------------------
// Flow — start / menu buttons
// -----------------------------------------------------------------------------
function startGame() {
  showScreen("game");
  buildBoard();
  startTimer();
}

function goToMenu() {
  stopTimer();
  showScreen("menu");
  loadBestTime();
}
