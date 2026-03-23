// All GSAP-based animation helpers live here.
// We use GSAP to create a smooth 3D flip for each card.

/**
 * Flip a card element.
 * @param {HTMLElement} cardElement - The root `.card` element.
 * @param {boolean} toFaceUp - True to show front face.
 */
function flipCardElement(cardElement, toFaceUp) {
  if (!cardElement) return;

  const inner = cardElement.querySelector(".card-inner");
  if (!inner) return;

  // Prevent double-running animations on the same element
  gsap.killTweensOf(inner);

  const currentRotation = gsap.getProperty(inner, "rotationY") || 0;
  const targetRotation = toFaceUp ? 180 : 0;

  gsap.to(inner, {
    rotationY: targetRotation,
    duration: 0.35,
    ease: "power2.out",
    onStart: () => {
      // Keep CSS class in sync so styles (like matched state) still work
      if (toFaceUp) {
        cardElement.classList.add("card--flipped");
      } else {
        cardElement.classList.remove("card--flipped");
      }
    },
  });
}

/**
 * Indicate a successful match with a small GSAP "pop" animation.
 */
function markCardAsMatched(cardElement) {
  if (!cardElement) return;
  cardElement.classList.add("card--matched");

  gsap.fromTo(
    cardElement,
    { scale: 1 },
    {
      scale: 1.08,
      duration: 0.18,
      yoyo: true,
      repeat: 1,
      ease: "power1.out",
    }
  );
}

/**
 * Temporarily disable pointer events for all cards.
 */
function setBoardInteractivity(isEnabled) {
  const cards = document.querySelectorAll(".card");
  cards.forEach((card) => {
    if (isEnabled) {
      card.classList.remove("card--disabled");
    } else {
      card.classList.add("card--disabled");
    }
  });
}

// Expose helpers
window.MemoryGameAnimations = {
  flipCardElement,
  markCardAsMatched,
  setBoardInteractivity,
};

