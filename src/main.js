/**
 * main.js — Bootstrap. Wires state → ui → callbacks → state.
 * Two independent ArgumentBoard instances: ours + opponent.
 */

import { ArgumentBoard } from './app.js';
import { renderBoard } from './ui.js';
import { resetVisualsState } from './visuals.js';

// ── Theme ──────────────────────────────────────────────────────────────────
const savedTheme = localStorage.getItem('av-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('av-theme', next);
  renderThemeBtn();
}

function renderThemeBtn() {
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    const current = document.documentElement.getAttribute('data-theme');
    btn.textContent = current === 'dark' ? '☀ Light' : '☾ Dark';
  }
}

// ── State ──────────────────────────────────────────────────────────────────
let oursBoard = new ArgumentBoard({ side: 'ours' });
let opponentBoard = new ArgumentBoard({ side: 'opponent' });

function updateOurs(newBoard) {
  oursBoard = newBoard;
  render();
}

function updateOpponent(newBoard) {
  opponentBoard = newBoard;
  render();
}

// ── Render ─────────────────────────────────────────────────────────────────
function makeCallbacks(getBoard, updateFn) {
  return {
    onAddPremise:               () => updateFn(getBoard().addPremise()),
    onRemovePremise:            (id) => updateFn(getBoard().removePremise(id)),
    onPremiseTextChange:        (id, text) => updateFn(getBoard().updatePremiseText(id, text)),
    onTogglePremiseNegation:    (id) => updateFn(getBoard().togglePremiseNegation(id)),
    onTogglePremiseTruth:       (id) => updateFn(getBoard().togglePremiseTruth(id)),
    onConclusionTextChange:     (text) => updateFn(getBoard().updateConclusionText(text)),
    onToggleConclusionNegation: () => updateFn(getBoard().toggleConclusionNegation()),
    onToggleConclusionTruth:    () => updateFn(getBoard().toggleConclusionTruth()),
    onSetType:                  (type) => updateFn(getBoard().setType(type)),
  };
}

function restart() {
  oursBoard = new ArgumentBoard({ side: 'ours' });
  opponentBoard = new ArgumentBoard({ side: 'opponent' });
  resetVisualsState();
  const root = document.getElementById('board-root-inner');
  if (root) root.innerHTML = '';
  render();
}

function render() {
  const root = document.getElementById('board-root-inner');
  if (!root) return;

  renderBoard(root,
    { ours: oursBoard.getState(), opponent: opponentBoard.getState() },
    {
      ours: makeCallbacks(() => oursBoard, updateOurs),
      opponent: makeCallbacks(() => opponentBoard, updateOpponent),
    },
  );
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  renderThemeBtn();

  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      if (!confirm('Clear all argument and visual content? The topic will be kept.')) return;
      restart();
    });
  }

  render();
});
