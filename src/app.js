/**
 * app.js — State management. ArgumentBoard class.
 * NO DOM access. Imports from logic.js only.
 */

import { evaluateArgument } from './logic.js';

let _nextId = 1;
function uid() { return `p${_nextId++}`; }

/**
 * Creates a blank premise object.
 * @param {string} [text='']
 * @returns {import('./logic.js').Premise & { id: string }}
 */
function makePremise(text = '') {
  return { id: uid(), text, negated: false, isTrue: true };
}

/**
 * ArgumentBoard — holds the full state of one argument panel.
 * Call getState() for a snapshot. All mutations return a new board (immutable style).
 */
export class ArgumentBoard {
  constructor(initial = {}) {
    this.premises = initial.premises ?? [makePremise(), makePremise()];
    this.conclusion = initial.conclusion ?? { text: '', negated: false, isTrue: true };
    this.type = initial.type ?? 'deductive';
    this.side = initial.side ?? 'ours';
  }

  // ── Premise mutations ──────────────────────────────────────────────────────

  addPremise() {
    return new ArgumentBoard({
      ...this._snapshot(),
      premises: [...this.premises, makePremise()],
    });
  }

  removePremise(id) {
    if (this.premises.length <= 1) return this; // keep at least one
    return new ArgumentBoard({
      ...this._snapshot(),
      premises: this.premises.filter(p => p.id !== id),
    });
  }

  updatePremiseText(id, text) {
    return new ArgumentBoard({
      ...this._snapshot(),
      premises: this.premises.map(p => p.id === id ? { ...p, text } : p),
    });
  }

  togglePremiseNegation(id) {
    return new ArgumentBoard({
      ...this._snapshot(),
      premises: this.premises.map(p => p.id === id ? { ...p, negated: !p.negated } : p),
    });
  }

  togglePremiseTruth(id) {
    return new ArgumentBoard({
      ...this._snapshot(),
      premises: this.premises.map(p => p.id === id ? { ...p, isTrue: !p.isTrue } : p),
    });
  }

  // ── Conclusion mutations ───────────────────────────────────────────────────

  updateConclusionText(text) {
    return new ArgumentBoard({ ...this._snapshot(), conclusion: { ...this.conclusion, text } });
  }

  toggleConclusionNegation() {
    return new ArgumentBoard({ ...this._snapshot(), conclusion: { ...this.conclusion, negated: !this.conclusion.negated } });
  }

  toggleConclusionTruth() {
    return new ArgumentBoard({ ...this._snapshot(), conclusion: { ...this.conclusion, isTrue: !this.conclusion.isTrue } });
  }

  // ── Argument-level mutations ───────────────────────────────────────────────

  setType(type) {
    return new ArgumentBoard({ ...this._snapshot(), type });
  }

  setSide(side) {
    return new ArgumentBoard({ ...this._snapshot(), side });
  }

  // ── Evaluation ─────────────────────────────────────────────────────────────

  evaluate() {
    return evaluateArgument(this._snapshot());
  }

  // ── Serialization ──────────────────────────────────────────────────────────

  toJSON() {
    return JSON.stringify(this._snapshot());
  }

  static fromJSON(json) {
    return new ArgumentBoard(JSON.parse(json));
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _snapshot() {
    return {
      premises: this.premises.map(p => ({ ...p })),
      conclusion: { ...this.conclusion },
      type: this.type,
      side: this.side,
    };
  }

  getState() {
    return { ...this._snapshot(), eval: this.evaluate() };
  }
}
