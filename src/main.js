/**
 * main.js — Bootstrap. Wires state → ui → callbacks → state.
 * Two independent ArgumentBoard instances: ours + opponent.
 */

import { ArgumentBoard } from './app.js';
import { renderBoard } from './ui.js';
import { resetVisualsState } from './visuals.js';

// ── Theme ──────────────────────────────────────────────────────────────────

let palette = localStorage.getItem('av-palette') || 'default';
let mode = localStorage.getItem('av-mode') || 'dark';

function applyTheme() {
  const theme = palette === 'nord'
    ? (mode === 'dark' ? 'nord' : 'nord-light')
    : mode;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('av-palette', palette);
  localStorage.setItem('av-mode', mode);
  renderBtns();
}

function togglePalette() {
  palette = palette === 'default' ? 'nord' : 'default';
  applyTheme();
}

function toggleMode() {
  mode = mode === 'dark' ? 'light' : 'dark';
  applyTheme();
}

function renderBtns() {
  const paletteBtn = document.getElementById('palette-toggle');
  if (paletteBtn) paletteBtn.textContent = palette === 'default' ? '🎨 Dracula' : '❄ Nord';
  const modeBtn = document.getElementById('theme-toggle');
  if (modeBtn) modeBtn.textContent = mode === 'dark' ? '☾ Dark' : '☀ Light';
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
    onAddSubPremise:            (parentId) => updateFn(getBoard().addSubPremise(parentId)),
    onRemoveSubPremise:         (parentId, subId) => updateFn(getBoard().removeSubPremise(parentId, subId)),
    onSubPremiseTextChange:     (parentId, subId, text) => updateFn(getBoard().updateSubPremiseText(parentId, subId, text)),
    onToggleSubPremiseNegation: (parentId, subId) => updateFn(getBoard().toggleSubPremiseNegation(parentId, subId)),
    onToggleSubPremiseTruth:    (parentId, subId) => updateFn(getBoard().toggleSubPremiseTruth(parentId, subId)),
    onConclusionTextChange:     (text) => updateFn(getBoard().updateConclusionText(text)),
    onToggleConclusionNegation: () => updateFn(getBoard().toggleConclusionNegation()),
    onToggleConclusionTruth:    () => updateFn(getBoard().toggleConclusionTruth()),
    onSetType:                  (type) => updateFn(getBoard().setType(type)),
  };
}

function resetArgument() {
  oursBoard = new ArgumentBoard({ side: 'ours' });
  opponentBoard = new ArgumentBoard({ side: 'opponent' });
  render();
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
    { onResetArgument: resetArgument },
  );
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();

  const paletteBtn = document.getElementById('palette-toggle');
  if (paletteBtn) paletteBtn.addEventListener('click', togglePalette);

  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleMode);

  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      if (!confirm('Clear all argument and visual content? The topic will be kept.')) return;
      restart();
    });
  }

  render();
});
