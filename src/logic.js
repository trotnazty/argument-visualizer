/**
 * logic.js — Pure argument evaluation engine.
 * NO DOM access. NO side effects. Exports functions only.
 * All functions are independently testable.
 */

/**
 * @typedef {Object} Premise
 * @property {string} text
 * @property {boolean} negated
 * @property {boolean} isTrue
 */

/**
 * @typedef {Object} Argument
 * @property {Premise[]} premises
 * @property {{ text: string, negated: boolean, isTrue: boolean }} conclusion
 * @property {'deductive'|'inductive'|'abductive'|'analogical'} type
 * @property {'ours'|'opponent'} side
 */

/**
 * @typedef {Object} EvalResult
 * @property {string} verdict       — Short label (e.g. "Valid", "Strong")
 * @property {string} detail        — One-sentence explanation
 * @property {number} score         — 0.0–1.0 for the validity bar
 * @property {'green'|'yellow'|'red'} color
 */

/**
 * Canonical list of logical fallacies for tagging.
 */
export const FALLACIES = [
  { id: 'none', label: 'No Fallacy' },
  { id: 'ad-hominem', label: 'Ad Hominem' },
  { id: 'appeal-to-authority', label: 'Appeal to Authority' },
  { id: 'appeal-to-emotion', label: 'Appeal to Emotion' },
  { id: 'bandwagon', label: 'Bandwagon' },
  { id: 'burden-of-proof', label: 'Burden of Proof' },
  { id: 'circular-reasoning', label: 'Circular Reasoning' },
  { id: 'equivocation', label: 'Equivocation' },
  { id: 'false-cause', label: 'False Cause' },
  { id: 'false-dilemma', label: 'False Dilemma' },
  { id: 'hasty-generalization', label: 'Hasty Generalization' },
  { id: 'loaded-question', label: 'Loaded Question' },
  { id: 'red-herring', label: 'Red Herring' },
  { id: 'slippery-slope', label: 'Slippery Slope' },
  { id: 'straw-man', label: 'Straw Man' },
  { id: 'tu-quoque', label: 'Tu Quoque' },
];

/**
 * Count premises tagged with a fallacy.
 * @param {Premise[]} premises
 * @returns {{ count: number, labels: string[] }}
 */
export function countFallacies(premises) {
  const tagged = premises.filter(p => p.fallacy && p.fallacy !== 'none');
  const labels = tagged.map(p => {
    const f = FALLACIES.find(f => f.id === p.fallacy);
    return f ? f.label : p.fallacy;
  });
  return { count: tagged.length, labels };
}

/**
 * Apply negation to a truth value.
 * @param {boolean} isTrue
 * @param {boolean} negated
 * @returns {boolean}
 */
export function effectiveTruth(isTrue, negated) {
  return negated ? !isTrue : isTrue;
}

/**
 * Evaluate a deductive argument.
 * Valid:  all premises effectively true → conclusion follows.
 * Sound:  valid AND conclusion effectively true.
 */
function evaluateDeductive(arg) {
  const allPremisesTrue = arg.premises.every(p => effectiveTruth(p.isTrue, p.negated));
  const conclusionTrue = effectiveTruth(arg.conclusion.isTrue, arg.conclusion.negated);

  if (allPremisesTrue && conclusionTrue) {
    return { verdict: 'Sound', detail: 'All premises are true and the conclusion follows.', score: 1.0, color: 'green' };
  }
  if (allPremisesTrue && !conclusionTrue) {
    return { verdict: 'Valid (Unsound)', detail: 'Premises support the conclusion, but the conclusion is marked false.', score: 0.65, color: 'yellow' };
  }
  const trueCount = arg.premises.filter(p => effectiveTruth(p.isTrue, p.negated)).length;
  const ratio = arg.premises.length > 0 ? trueCount / arg.premises.length : 0;
  if (ratio >= 0.5) {
    return { verdict: 'Weak', detail: 'Some premises are false — the argument cannot be fully deduced.', score: 0.35, color: 'yellow' };
  }
  return { verdict: 'Invalid', detail: 'Too many false premises. The conclusion does not follow.', score: 0.1, color: 'red' };
}

/**
 * Evaluate an inductive argument.
 * Strong:  majority of premises support conclusion.
 * Cogent:  strong AND premises are (mostly) true.
 */
function evaluateInductive(arg) {
  const total = arg.premises.length;
  if (total === 0) return { verdict: 'Insufficient Data', detail: 'No premises to evaluate.', score: 0, color: 'red' };

  const trueCount = arg.premises.filter(p => effectiveTruth(p.isTrue, p.negated)).length;
  const ratio = trueCount / total;
  const conclusionTrue = effectiveTruth(arg.conclusion.isTrue, arg.conclusion.negated);

  if (ratio >= 0.75 && conclusionTrue) {
    return { verdict: 'Cogent', detail: 'Strong inductive support with true premises and a true conclusion.', score: 1.0, color: 'green' };
  }
  if (ratio >= 0.5) {
    return { verdict: 'Strong', detail: `${trueCount}/${total} premises support the conclusion.`, score: 0.65, color: 'yellow' };
  }
  return { verdict: 'Weak', detail: 'Insufficient evidence — fewer than half the premises support the conclusion.', score: 0.2, color: 'red' };
}

/**
 * Evaluate an abductive argument (inference to best explanation).
 * Uses truth-value ratio as proxy for plausibility.
 */
function evaluateAbductive(arg) {
  const total = arg.premises.length;
  if (total === 0) return { verdict: 'Implausible', detail: 'No premises to evaluate.', score: 0, color: 'red' };

  const trueCount = arg.premises.filter(p => effectiveTruth(p.isTrue, p.negated)).length;
  const ratio = trueCount / total;
  const conclusionTrue = effectiveTruth(arg.conclusion.isTrue, arg.conclusion.negated);

  if (ratio >= 0.75 && conclusionTrue) {
    return { verdict: 'Best Explanation', detail: 'The conclusion is the most plausible inference from the evidence.', score: 1.0, color: 'green' };
  }
  if (ratio >= 0.4) {
    return { verdict: 'Plausible', detail: 'The conclusion is a reasonable but not compelling explanation.', score: 0.55, color: 'yellow' };
  }
  return { verdict: 'Implausible', detail: 'The evidence does not support this explanation.', score: 0.15, color: 'red' };
}

/**
 * Evaluate an analogical argument.
 * Strong analogy: at least 2 premises (analogical cases) effectively true.
 */
function evaluateAnalogical(arg) {
  const trueCount = arg.premises.filter(p => effectiveTruth(p.isTrue, p.negated)).length;

  if (trueCount >= 2) {
    return { verdict: 'Strong Analogy', detail: `${trueCount} analogical cases support the conclusion.`, score: 0.85, color: 'green' };
  }
  if (trueCount === 1) {
    return { verdict: 'Weak Analogy', detail: 'Only one analogical case — not enough to draw a strong parallel.', score: 0.35, color: 'yellow' };
  }
  return { verdict: 'No Analogy', detail: 'No supporting analogical cases found.', score: 0.05, color: 'red' };
}

/**
 * Main evaluation dispatcher.
 * @param {Argument} arg
 * @returns {EvalResult}
 */
export function evaluateArgument(arg) {
  if (!arg.premises || arg.premises.length === 0) {
    return { verdict: 'No Premises', detail: 'Add at least one premise to evaluate.', score: 0, color: 'red' };
  }

  let result;
  switch (arg.type) {
    case 'deductive':   result = evaluateDeductive(arg); break;
    case 'inductive':   result = evaluateInductive(arg); break;
    case 'abductive':   result = evaluateAbductive(arg); break;
    case 'analogical':  result = evaluateAnalogical(arg); break;
    default:            result = evaluateDeductive(arg);
  }

  // Flag fallacies in the evaluation result
  const { count, labels } = countFallacies(arg.premises);
  if (count > 0) {
    result.fallacyCount = count;
    result.fallacyLabels = labels;
    result.detail += ` ⚠ ${count} fallac${count === 1 ? 'y' : 'ies'} tagged: ${labels.join(', ')}.`;
    // Downgrade color if not already red
    if (result.color === 'green') {
      result.color = 'yellow';
    }
    // Reduce score slightly per fallacy
    result.score = Math.max(0.05, result.score - count * 0.1);
  }

  return result;
}

/**
 * Syllogism validation (for future Enforcer Mode).
 * Checks Aristotelian three-term structure.
 * @param {{ majorPremise: string, minorPremise: string, conclusion: string }} syllogism
 * @returns {{ valid: boolean, message: string }}
 */
export function validateSyllogism({ majorPremise, minorPremise, conclusion }) {
  // Tokenize to words, lowercase
  const tokenize = str => str.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);

  const majorTerms = new Set(tokenize(majorPremise));
  const minorTerms = new Set(tokenize(minorPremise));
  const conclusionTerms = new Set(tokenize(conclusion));

  // Find middle term: appears in both premises but not in conclusion
  const middleCandidates = [...majorTerms].filter(t => minorTerms.has(t) && !conclusionTerms.has(t));

  if (middleCandidates.length === 0) {
    return { valid: false, message: 'No middle term found. A syllogism requires a term shared by both premises that does not appear in the conclusion.' };
  }
  return { valid: true, message: `Valid syllogistic structure. Middle term(s): "${middleCandidates.join('", "')}"` };
}
