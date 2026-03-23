// Card Memory Game - Complete Implementation

// Game Configuration
const BOARD_COLS = 3; // 3 columns
const BOARD_ROWS = 5; // 5 rows
const TOTAL_CARDS = BOARD_COLS * BOARD_ROWS; // 15 cards
const TOTAL_PAIRS = Math.floor(TOTAL_CARDS / 2); // 7 pairs (14 cards, 1 extra)

// Card symbols (emoji placeholders - easy to replace with images later)
const CARD_SYMBOLS = [
  "🐱", "🐶", "🐼", "🦊", "🐸", "🐰",
  "🐻", "🐨", "🐯", "🐷", "🐵", "🐔",
  "🐙", "🦄", "🐝", "🦋", "🐞", "🐢"
];

// DOM Elements
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

// Game State
let deck = [];
let firstCard = null;
let secondCard = null;
let isChecking = false;
let matchedPairs = 0;
let timerInterval = null;
let startTime = null;
let currentTime = 0;

// Initialize
function init() {
  // Check if all elements exist
  if (!startButton || !menuButton || !menuButtonWin || !playAgainButton) {
    console.error("Error: Could not find required DOM elements");
    return;
  }

  // Check if GSAP is loaded
  if (typeof gsap === "undefined") {
    console.error("Error: GSAP library not loaded");
    return;
  }

  loadBestTime();
  startButton.addEventListener("click", startGame);
  menuButton.addEventListener("click", goToMenu);
  menuButtonWin.addEventListener("click", goToMenu);
  playAgainButton.addEventListener("click", startGame);
  
  console.log("Game initialized successfully");
}

// Wait for DOM and GSAP to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  // DOM already loaded, but wait a tick for GSAP
  setTimeout(init, 100);
}

// Screen Management
function showScreen(screen) {
  menuScreen.classList.remove("screen--active");
  gameScreen.classList.remove("screen--active");
  winScreen.classList.remove("screen--active");

  if (screen === "menu") {
    menuScreen.classList.add("screen--active");
  } else if (screen === "game") {
    gameScreen.classList.add("screen--active");
  } else if (screen === "win") {
    winScreen.classList.add("screen--active");
  }
}

// Timer Functions
function startTimer() {
  startTime = Date.now();
  currentTime = 0;
  updateTimerDisplay(0);

  timerInterval = setInterval(() => {
    currentTime = Math.floor((Date.now() - startTime) / 1000);
    updateTimerDisplay(currentTime);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  timerValue.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// LocalStorage Functions
function loadBestTime() {
  const bestTime = localStorage.getItem("memoryGameBestTime");
  if (bestTime) {
    bestTimeDisplay.textContent = formatTime(parseInt(bestTime));
  } else {
    bestTimeDisplay.textContent = "--:--";
  }
}

function saveBestTime(seconds) {
  const currentBest = localStorage.getItem("memoryGameBestTime");
  if (!currentBest || seconds < parseInt(currentBest)) {
    localStorage.setItem("memoryGameBestTime", seconds.toString());
    loadBestTime();
  }
}

// Card Creation
function createShuffledDeck() {
  const symbols = CARD_SYMBOLS.slice(0, TOTAL_PAIRS);
  const deck = [];

  // Create pairs
  symbols.forEach((symbol, index) => {
    deck.push({ id: `${index}-a`, symbol, matched: false });
    deck.push({ id: `${index}-b`, symbol, matched: false });
  });

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function createCardElement(cardData) {
  const card = document.createElement("button");
  card.className = "card";
  card.type = "button";
  card.dataset.cardId = cardData.id;
  card.dataset.symbol = cardData.symbol;

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const backFace = document.createElement("div");
  backFace.className = "card-face card-face--back";
  backFace.textContent = "❔";

  const frontFace = document.createElement("div");
  frontFace.className = "card-face card-face--front";
  frontFace.textContent = cardData.symbol;

  inner.appendChild(backFace);
  inner.appendChild(frontFace);
  card.appendChild(inner);

  card.addEventListener("click", () => handleCardClick(card));

  return card;
}

// Card Flip Animation (GSAP)
function flipCard(cardElement, isFlipped) {
  const inner = cardElement.querySelector(".card-inner");
  if (!inner) return;

  gsap.killTweensOf(inner);

  gsap.to(inner, {
    rotationY: isFlipped ? 180 : 0,
    duration: 0.35,
    ease: "power2.out",
    onStart: () => {
      if (isFlipped) {
        cardElement.classList.add("card--flipped");
      } else {
        cardElement.classList.remove("card--flipped");
      }
    }
  });
}

// Game Logic
function buildBoard() {
  gameBoard.innerHTML = "";
  deck = createShuffledDeck();
  matchedPairs = 0;
  firstCard = null;
  secondCard = null;
  isChecking = false;

  console.log(`Building board: ${deck.length} cards (${BOARD_SIZE}x${BOARD_SIZE})`);

  deck.forEach((cardData) => {
    const cardElement = createCardElement(cardData);
    gameBoard.appendChild(cardElement);
  });
}

function handleCardClick(cardElement) {
  // Prevent clicks during checking or if card is already matched/flipped
  if (isChecking) return;
  if (cardElement.classList.contains("card--matched")) return;
  if (cardElement.classList.contains("card--flipped")) return;
  if (cardElement === firstCard) return;

  // Flip the card
  flipCard(cardElement, true);

  // First card selection
  if (!firstCard) {
    firstCard = cardElement;
    return;
  }

  // Second card selection
  secondCard = cardElement;
  isChecking = true;

  // Check for match
  const firstSymbol = firstCard.dataset.symbol;
  const secondSymbol = secondCard.dataset.symbol;

  if (firstSymbol === secondSymbol) {
    // Match found
    setTimeout(() => {
      firstCard.classList.add("card--matched");
      secondCard.classList.add("card--matched");
      matchedPairs++;

      // Animate match
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
    // No match - flip back
    setTimeout(() => {
      flipCard(firstCard, false);
      flipCard(secondCard, false);
      resetSelection();
    }, 1000);
  }
}

function resetSelection() {
  firstCard = null;
  secondCard = null;
  isChecking = false;
}

function checkForWin() {
  if (matchedPairs === TOTAL_PAIRS) {
    stopTimer();
    const finalTime = currentTime;
    saveBestTime(finalTime);
    winTimeValue.textContent = formatTime(finalTime);
    
    setTimeout(() => {
      showScreen("win");
    }, 500);
  }
}

// Game Control
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
