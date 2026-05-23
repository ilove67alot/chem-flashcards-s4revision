(function () {
  'use strict';

  const state = {
    deck: [],
    index: 0,
    isFlipped: false,
    known: new Set(),
    review: new Set(),
    filterTopic: 'All',
    filterDiff: 'all',
  };

  // DOM Elements
  const $card = document.getElementById('flashcard');
  const $scene = document.getElementById('card-scene');
  const $question = document.getElementById('card-question');
  const $answer = document.getElementById('card-answer');
  const $topicFront = document.getElementById('card-topic-front');
  const $topicBack = document.getElementById('card-topic-back');
  const $diffFront = document.getElementById('card-diff-front');
  const $diffBack = document.getElementById('card-diff-back');
  const $counter = document.getElementById('card-counter');
  const $btnPrev = document.getElementById('btn-prev');
  const $btnNext = document.getElementById('btn-next');
  const $btnYes = document.getElementById('btn-yes');
  const $btnNo = document.getElementById('btn-no');
  const $btnShuffle = document.getElementById('btn-shuffle');
  const $btnReset = document.getElementById('btn-reset');
  const $btnRestart = document.getElementById('btn-restart');
  const $topicSelect = document.getElementById('topic-select');
  const $chips = document.querySelectorAll('.chip');
  const $progressFill = document.getElementById('progress-fill');
  const $statTotal = document.getElementById('stat-total-num');
  const $statKnown = document.getElementById('stat-known-num');
  const $statReview = document.getElementById('stat-review-num');
  const $emptyState = document.getElementById('empty-state');
  const $completionScreen = document.getElementById('completion-screen');

  function init() {
    fetchDeck(true);
    bindEvents();
    loadProgress();
    // Keep focus locked onto card container to seamlessly intercept Tab triggers
    if($card) $card.focus();
  }

  function fetchDeck(initialHydration = false) {
    const url = `api/get_flashcards.php?topic=${encodeURIComponent(state.filterTopic)}&diff=${state.filterDiff}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (initialHydration) {
          buildTopicOptions(data.topics);
        }
        state.deck = data.cards;
        state.index = 0;
        state.isFlipped = false;
        renderCard();
        renderStats();
      })
      .catch(err => console.error("API Fetch Error:", err));
  }

  function buildTopicOptions(topics) {
    $topicSelect.innerHTML = '';
    topics.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      $topicSelect.appendChild(opt);
    });
  }

  function renderCard() {
    $completionScreen.style.display = 'none';
    $emptyState.style.display = 'none';
    $scene.style.display = '';

    if (state.deck.length === 0) {
      $scene.style.display = 'none';
      $emptyState.style.display = 'block';
      $counter.textContent = '0 / 0';
      return;
    }

    if (state.index >= state.deck.length) {
      showCompletion();
      return;
    }

    const card = state.deck[state.index];

    if (state.isFlipped) {
      $card.style.transition = 'none';
      $card.classList.remove('is-flipped');
      $card.offsetHeight; // Trigger structural reflow repaint
      $card.style.transition = '';
      state.isFlipped = false;
    }

    $question.textContent = card.question;
    $answer.textContent = card.answer;
    $topicFront.textContent = `${card.section} -> ${card.topic}`;
    $topicBack.textContent = `${card.section} -> ${card.topic}`;
    
    $diffFront.textContent = card.difficulty.toUpperCase();
    $diffFront.className = `card-diff ${card.difficulty}`;
    $diffBack.textContent = card.difficulty.toUpperCase();
    $diffBack.className = `card-diff ${card.difficulty}`;

    $counter.textContent = `Card ${state.index + 1} of ${state.deck.length}`;
    $btnPrev.disabled = state.index === 0;
    $btnNext.disabled = state.index >= state.deck.length;
    
    // Maintain active focus ring context target properties on card
    $card.focus();
  }

  function flipCard() {
    if (state.deck.length === 0 || state.index >= state.deck.length) return;
    state.isFlipped = !state.isFlipped;
    $card.classList.toggle('is-flipped', state.isFlipped);
  }

  function goNext() { if (state.index < state.deck.length) { state.index++; renderCard(); } }
  function goPrev() { if (state.index > 0) { state.index--; renderCard(); } }

  function markKnown() { if (state.isFlipped && state.index < state.deck.length) { state.known.add(state.deck[state.index].id); state.review.delete(state.deck[state.index].id); saveProgress(); renderStats(); goNext(); } }
  function markReview() { if (state.isFlipped && state.index < state.deck.length) { state.review.add(state.deck[state.index].id); state.known.delete(state.deck[state.index].id); saveProgress(); renderStats(); goNext(); } }

  function renderStats() {
    const total = state.deck.length;
    const currentKnown = [...state.known].filter(id => state.deck.find(c => c.id === id)).length;
    const currentReview = [...state.review].filter(id => state.deck.find(c => c.id === id)).length;
    
    $statTotal.textContent = total;
    $statKnown.textContent = currentKnown;
    $statReview.textContent = currentReview;
    $progressFill.style.width = total > 0 ? `${Math.round((currentKnown / total) * 100)}%` : '0%';
  }

  function showCompletion() {
    $scene.style.display = 'none';
    $completionScreen.style.display = 'block';
    document.getElementById('completion-stats').innerHTML = `
      <p>Mastered Cards: <strong>${state.known.size}</strong></p>
      <p>Needs Review: <strong>${state.review.size}</strong></p>
    `;
  }

  function saveProgress() { localStorage.setItem('dse_k', JSON.stringify([...state.known])); localStorage.setItem('dse_r', JSON.stringify([...state.review])); }
  function loadProgress() { const k = localStorage.getItem('dse_k'), r = localStorage.getItem('dse_r'); if(k) JSON.parse(k).forEach(i => state.known.add(i)); if(r) JSON.parse(r).forEach(i => state.review.add(i)); }

  function bindEvents() {
    $card.addEventListener('click', flipCard);
    $btnNext.addEventListener('click', e => { e.stopPropagation(); goNext(); });
    $btnPrev.addEventListener('click', e => { e.stopPropagation(); goPrev(); });
    $btnYes.addEventListener('click', e => { e.stopPropagation(); markKnown(); });
    $btnNo.addEventListener('click', e => { e.stopPropagation(); markReview(); });
    
    $btnShuffle.addEventListener('click', () => {
      for (let i = state.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
      }
      state.index = 0; renderCard();
    });

    $btnReset.addEventListener('click', () => {
      if(confirm("Reset all matching progress cache parameters?")) { state.known.clear(); state.review.clear(); saveProgress(); fetchDeck(); }
    });
    
    $btnRestart.addEventListener('click', () => { state.index = 0; renderCard(); });
    $topicSelect.addEventListener('change', () => { state.filterTopic = $topicSelect.value; fetchDeck(); });
    
    $chips.forEach(chip => {
      chip.addEventListener('click', () => {
        $chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.filterDiff = chip.dataset.diff;
        fetchDeck();
      });
    });

    // INTERCEPT KEYBOARD SHORTCUT ENTRIES
    document.addEventListener('keydown', e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      switch (e.key) {
        case 'Tab':
          e.preventDefault(); // Stop native browser focus highlights from jumping across inputs
          flipCard();
          break;
        case 'ArrowRight':
          goNext();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
        case 'y':
        case 'Y':
          markKnown();
          break;
        case 'n':
        case 'N':
          markReview();
          break;
      }
    });
  }

  init();
})();