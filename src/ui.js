/**
 * ui.js — DOM rendering. No business logic.
 * Patches existing DOM elements in place to avoid focus loss on re-render.
 */

import { createVisualsPanel, refreshVisuals } from './visuals.js';
import { FALLACIES } from './logic.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function setClass(el, cls, on) {
  on ? el.classList.add(cls) : el.classList.remove(cls);
}

function qs(scope, sel) { return scope.querySelector(sel); }
function qsa(scope, sel) { return [...scope.querySelectorAll(sel)]; }

// ── Premise Row ────────────────────────────────────────────────────────────

function createPremiseRow(premise, index, callbacks) {
  const wrapper = document.createElement('div');
  wrapper.className = 'premise-wrapper';
  wrapper.dataset.premiseId = premise.id;

  const label = document.createElement('div');
  label.className = 'premise-label';
  label.textContent = `P${index + 1}`;

  const row = document.createElement('div');
  row.className = 'premise-row';
  row.dataset.id = premise.id;

  const negBtn = document.createElement('button');
  negBtn.className = `toggle-btn neg-btn${premise.negated ? ' active' : ''}`;
  negBtn.title = 'Toggle negation (¬)';
  negBtn.textContent = '¬';
  negBtn.tabIndex = -1;
  negBtn.addEventListener('click', () => callbacks.onTogglePremiseNegation(premise.id));

  const truthBtn = document.createElement('button');
  truthBtn.className = `toggle-btn truth-btn ${premise.isTrue ? 'true' : 'false'}`;
  truthBtn.title = 'Toggle truth value';
  truthBtn.textContent = premise.isTrue ? 'T' : 'F';
  truthBtn.tabIndex = -1;
  truthBtn.addEventListener('click', () => callbacks.onTogglePremiseTruth(premise.id));

  const input = document.createElement('textarea');
  input.className = 'premise-input';
  input.placeholder = 'Enter premise…';
  input.value = premise.text;
  input.rows = 1;
  input.dataset.inputId = premise.id;
  input.addEventListener('input', e => {
    callbacks.onPremiseTextChange(premise.id, e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  });

  // Fallacy dropdown
  const fallacySelect = document.createElement('select');
  fallacySelect.className = 'fallacy-select';
  fallacySelect.title = 'Tag a fallacy';
  fallacySelect.tabIndex = -1;
  FALLACIES.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.id === 'none' ? '—' : f.label;
    opt.selected = premise.fallacy === f.id;
    fallacySelect.appendChild(opt);
  });
  if (premise.fallacy && premise.fallacy !== 'none') {
    fallacySelect.classList.add('has-fallacy');
  }
  fallacySelect.addEventListener('change', e => callbacks.onSetPremiseFallacy(premise.id, e.target.value));

  // Fallacy badge (shown when a fallacy is selected)
  const fallacyBadge = document.createElement('span');
  fallacyBadge.className = 'fallacy-badge';
  if (premise.fallacy && premise.fallacy !== 'none') {
    const f = FALLACIES.find(f => f.id === premise.fallacy);
    fallacyBadge.textContent = f ? f.label : premise.fallacy;
    fallacyBadge.classList.add('visible');
  }

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-btn';
  removeBtn.title = 'Remove premise';
  removeBtn.textContent = '×';
  removeBtn.tabIndex = -1;
  removeBtn.addEventListener('click', () => callbacks.onRemovePremise(premise.id));

  row.append(negBtn, truthBtn, input, fallacySelect, removeBtn);

  const main = document.createElement('div');
  main.className = 'premise-main';
  main.append(label, row);
  wrapper.appendChild(main);

  // Fallacy badge row
  if (premise.fallacy && premise.fallacy !== 'none') {
    wrapper.appendChild(fallacyBadge);
  }

  // Sub-premises
  const subContainer = document.createElement('div');
  subContainer.className = 'sub-premises-container';

  (premise.subPremises || []).forEach((sub, si) => {
    subContainer.appendChild(createSubPremiseRow(sub, index, si, premise.id, callbacks));
  });

  const addSubBtn = document.createElement('button');
  addSubBtn.className = 'add-sub-premise-btn';
  addSubBtn.textContent = '+';
  addSubBtn.title = 'Add sub-premise';
  addSubBtn.tabIndex = -1;
  addSubBtn.addEventListener('click', () => callbacks.onAddSubPremise(premise.id));
  subContainer.appendChild(addSubBtn);

  wrapper.appendChild(subContainer);
  return wrapper;
}

function createSubPremiseRow(sub, parentIndex, subIndex, parentId, callbacks) {
  const wrapper = document.createElement('div');
  wrapper.className = 'sub-premise-wrapper';
  wrapper.dataset.subPremiseId = sub.id;

  const label = document.createElement('div');
  label.className = 'premise-label sub-premise-label';
  label.textContent = `P${parentIndex + 1}.${subIndex + 1}`;

  const row = document.createElement('div');
  row.className = 'premise-row sub-premise-row';

  const negBtn = document.createElement('button');
  negBtn.className = `toggle-btn neg-btn${sub.negated ? ' active' : ''}`;
  negBtn.title = 'Toggle negation (¬)';
  negBtn.textContent = '¬';
  negBtn.tabIndex = -1;
  negBtn.addEventListener('click', () => callbacks.onToggleSubPremiseNegation(parentId, sub.id));

  const truthBtn = document.createElement('button');
  truthBtn.className = `toggle-btn truth-btn ${sub.isTrue ? 'true' : 'false'}`;
  truthBtn.title = 'Toggle truth value';
  truthBtn.textContent = sub.isTrue ? 'T' : 'F';
  truthBtn.tabIndex = -1;
  truthBtn.addEventListener('click', () => callbacks.onToggleSubPremiseTruth(parentId, sub.id));

  const input = document.createElement('textarea');
  input.className = 'premise-input';
  input.placeholder = 'Enter sub-premise…';
  input.value = sub.text;
  input.rows = 1;
  input.dataset.inputId = sub.id;
  input.addEventListener('input', e => {
    callbacks.onSubPremiseTextChange(parentId, sub.id, e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  });

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-btn';
  removeBtn.title = 'Remove sub-premise';
  removeBtn.textContent = '×';
  removeBtn.tabIndex = -1;
  removeBtn.addEventListener('click', () => callbacks.onRemoveSubPremise(parentId, sub.id));

  row.append(negBtn, truthBtn, input, removeBtn);
  wrapper.append(label, row);
  return wrapper;
}

function patchPremiseRow(wrapper, premise, index, callbacks) {
  const label = wrapper.querySelector('.premise-main > .premise-label');
  if (label) label.textContent = `P${index + 1}`;

  const negBtn = wrapper.querySelector('.premise-main > .premise-row > .neg-btn');
  if (negBtn) setClass(negBtn, 'active', premise.negated);

  const truthBtn = wrapper.querySelector('.premise-main > .premise-row > .truth-btn');
  if (truthBtn) {
    truthBtn.textContent = premise.isTrue ? 'T' : 'F';
    setClass(truthBtn, 'true', premise.isTrue);
    setClass(truthBtn, 'false', !premise.isTrue);
  }

  const input = wrapper.querySelector('.premise-main > .premise-row > textarea');
  if (input && document.activeElement !== input) {
    input.value = premise.text;
  }

  // Fallacy select
  const fallacySelect = wrapper.querySelector('.premise-main > .premise-row > .fallacy-select');
  if (fallacySelect && document.activeElement !== fallacySelect) {
    fallacySelect.value = premise.fallacy || 'none';
    setClass(fallacySelect, 'has-fallacy', premise.fallacy && premise.fallacy !== 'none');
  }

  // Fallacy badge
  const existingBadge = wrapper.querySelector(':scope > .fallacy-badge');
  if (premise.fallacy && premise.fallacy !== 'none') {
    const f = FALLACIES.find(f => f.id === premise.fallacy);
    const badgeText = f ? f.label : premise.fallacy;
    if (existingBadge) {
      existingBadge.textContent = badgeText;
    } else {
      const badge = document.createElement('span');
      badge.className = 'fallacy-badge visible';
      badge.textContent = badgeText;
      const subContainer = wrapper.querySelector('.sub-premises-container');
      wrapper.insertBefore(badge, subContainer);
    }
  } else if (existingBadge) {
    existingBadge.remove();
  }

  // Patch sub-premises in place to preserve focus
  const subContainer = wrapper.querySelector('.sub-premises-container');
  if (subContainer) {
    const addBtn = subContainer.querySelector('.add-sub-premise-btn');
    const existingSubs = [...subContainer.querySelectorAll('.sub-premise-wrapper')];
    const newSubs = premise.subPremises || [];
    const newIds = newSubs.map(s => s.id);

    // Remove deleted sub-premises
    existingSubs.forEach(w => {
      if (!newIds.includes(w.dataset.subPremiseId)) w.remove();
    });

    // Patch existing or create new
    newSubs.forEach((sub, si) => {
      const existing = subContainer.querySelector(`[data-sub-premise-id="${sub.id}"]`);
      if (existing) {
        // Patch in place
        const lbl = existing.querySelector('.sub-premise-label');
        if (lbl) lbl.textContent = `P${index + 1}.${si + 1}`;

        const neg = existing.querySelector('.neg-btn');
        if (neg) setClass(neg, 'active', sub.negated);

        const truth = existing.querySelector('.truth-btn');
        if (truth) {
          truth.textContent = sub.isTrue ? 'T' : 'F';
          setClass(truth, 'true', sub.isTrue);
          setClass(truth, 'false', !sub.isTrue);
        }

        const inp = existing.querySelector('textarea');
        if (inp && document.activeElement !== inp) {
          inp.value = sub.text;
        }
      } else {
        subContainer.insertBefore(createSubPremiseRow(sub, index, si, premise.id, callbacks), addBtn);
      }
    });
  }
}

// ── Conclusion Row ─────────────────────────────────────────────────────────

function createConclusionRow(conclusion, callbacks) {
  const row = document.createElement('div');
  row.className = 'conclusion-row';

  const label = document.createElement('span');
  label.className = 'conclusion-label';
  label.textContent = '∴';

  const negBtn = document.createElement('button');
  negBtn.className = `toggle-btn neg-btn${conclusion.negated ? ' active' : ''}`;
  negBtn.title = 'Toggle negation';
  negBtn.textContent = '¬';
  negBtn.tabIndex = -1;
  negBtn.addEventListener('click', callbacks.onToggleConclusionNegation);

  const truthBtn = document.createElement('button');
  truthBtn.className = `toggle-btn truth-btn ${conclusion.isTrue ? 'true' : 'false'}`;
  truthBtn.title = 'Toggle truth value';
  truthBtn.textContent = conclusion.isTrue ? 'T' : 'F';
  truthBtn.tabIndex = -1;
  truthBtn.addEventListener('click', callbacks.onToggleConclusionTruth);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'premise-input conclusion-input';
  input.placeholder = 'Enter conclusion…';
  input.value = conclusion.text;
  input.addEventListener('input', e => callbacks.onConclusionTextChange(e.target.value));

  row.append(label, negBtn, truthBtn, input);
  return row;
}

function patchConclusionRow(row, conclusion) {
  const negBtn = row.querySelector('.neg-btn');
  if (negBtn) setClass(negBtn, 'active', conclusion.negated);

  const truthBtn = row.querySelector('.truth-btn');
  if (truthBtn) {
    truthBtn.textContent = conclusion.isTrue ? 'T' : 'F';
    setClass(truthBtn, 'true', conclusion.isTrue);
    setClass(truthBtn, 'false', !conclusion.isTrue);
  }

  const input = row.querySelector('input');
  if (input && document.activeElement !== input) {
    input.value = conclusion.text;
  }
}

// ── Validity Bar ───────────────────────────────────────────────────────────

function createValiditySection(evalResult) {
  const container = document.createElement('div');
  container.className = 'validity-container';

  const verdict = document.createElement('div');
  verdict.className = `validity-verdict color-${evalResult.color}`;
  verdict.textContent = evalResult.verdict;

  const track = document.createElement('div');
  track.className = 'validity-bar-track';

  const fill = document.createElement('div');
  fill.className = `validity-bar-fill color-${evalResult.color}`;
  fill.style.width = `${Math.round(evalResult.score * 100)}%`;
  track.appendChild(fill);

  const detail = document.createElement('div');
  detail.className = 'validity-detail';
  detail.textContent = evalResult.detail;

  container.append(verdict, track, detail);
  return container;
}

function patchValiditySection(container, evalResult) {
  const verdict = qs(container, '.validity-verdict');
  if (verdict) {
    verdict.textContent = evalResult.verdict;
    verdict.className = `validity-verdict color-${evalResult.color}`;
  }

  const fill = qs(container, '.validity-bar-fill');
  if (fill) {
    fill.style.width = `${Math.round(evalResult.score * 100)}%`;
    fill.className = `validity-bar-fill color-${evalResult.color}`;
  }

  const detail = qs(container, '.validity-detail');
  if (detail) detail.textContent = evalResult.detail;
}

// ── Single Side Panel ──────────────────────────────────────────────────────

function createSidePanel(side, state, callbacks) {
  const panel = document.createElement('div');
  panel.className = `side-panel side-${side}`;
  panel.dataset.side = side;

  // Panel title
  const title = document.createElement('div');
  title.className = `side-panel-title side-title-${side}`;
  title.textContent = side === 'ours' ? 'Our Side' : 'Guest';
  panel.appendChild(title);

  // Type selector
  const typeSelect = document.createElement('select');
  typeSelect.className = 'type-select';
  ['deductive', 'inductive', 'abductive', 'analogical'].forEach(type => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    opt.selected = state.type === type;
    typeSelect.appendChild(opt);
  });
  typeSelect.tabIndex = -1;
  typeSelect.addEventListener('change', e => callbacks.onSetType(e.target.value));
  panel.appendChild(typeSelect);

  // Premises
  const premisesContainer = document.createElement('div');
  premisesContainer.className = 'premises-container';

  state.premises.forEach((p, i) => {
    premisesContainer.appendChild(createPremiseRow(p, i, callbacks));
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'add-premise-btn';
  addBtn.textContent = '+ Add Premise';
  addBtn.tabIndex = -1;
  addBtn.addEventListener('click', callbacks.onAddPremise);
  premisesContainer.appendChild(addBtn);
  panel.appendChild(premisesContainer);

  // Conclusion
  const conclusionContainer = document.createElement('div');
  conclusionContainer.className = 'conclusion-container';
  conclusionContainer.appendChild(createConclusionRow(state.conclusion, callbacks));
  panel.appendChild(conclusionContainer);

  // Validity
  panel.appendChild(createValiditySection(state.eval));

  return panel;
}

function patchSidePanel(panel, state) {
  // Type select
  const typeSelect = qs(panel, '.type-select');
  if (typeSelect) typeSelect.value = state.type;

  // Premises
  const container = qs(panel, '.premises-container');
  if (container) {
    const existingWrappers = qsa(container, '[data-premise-id]');
    const newIds = state.premises.map(p => p.id);

    existingWrappers.forEach(w => {
      if (!newIds.includes(w.dataset.premiseId)) w.remove();
    });

    const addBtn = qs(container, '.add-premise-btn');
    state.premises.forEach((p, i) => {
      const existing = qs(container, `[data-premise-id="${p.id}"]`);
      if (existing) {
        patchPremiseRow(existing, p, i, panel._callbacks);
      } else {
        const newRow = createPremiseRow(p, i, panel._callbacks);
        container.insertBefore(newRow, addBtn);
      }
    });
  }

  // Conclusion
  const conclusionContainer = qs(panel, '.conclusion-container');
  if (conclusionContainer) {
    const row = qs(conclusionContainer, '.conclusion-row');
    if (row) patchConclusionRow(row, state.conclusion);
  }

  // Validity
  const validityContainer = qs(panel, '.validity-container');
  if (validityContainer) patchValiditySection(validityContainer, state.eval);
}

// ── Main renderBoard (dual-panel) ──────────────────────────────────────────

/**
 * Render or patch the full board with side-by-side panels.
 * @param {HTMLElement} root
 * @param {{ ours: Object, opponent: Object }} states
 * @param {{ ours: Object, opponent: Object }} callbackSets
 */
export function renderBoard(root, states, callbackSets, options = {}) {
  const isFirstRender = !qs(root, '#tab-bar');

  if (isFirstRender) {
    root.innerHTML = '';

    // ── Tabs ──────────────────────────────────────────────────────────────
    const tabBar = document.createElement('div');
    tabBar.className = 'tab-bar';
    tabBar.id = 'tab-bar';

    function makeTabGroup(label, tabId, isActive) {
      const group = document.createElement('div');
      group.className = `tab-group${isActive ? ' active' : ''}`;
      group.dataset.tab = tabId;

      const btn = document.createElement('button');
      btn.className = `tab-btn${isActive ? ' active' : ''}`;
      btn.dataset.tab = tabId;
      btn.textContent = label;
      btn.tabIndex = -1;

      const refreshBtn = document.createElement('button');
      refreshBtn.className = 'tab-refresh-btn';
      refreshBtn.dataset.tabRefresh = tabId;
      refreshBtn.title = `Clear ${label} fields`;
      refreshBtn.textContent = '↻';
      refreshBtn.tabIndex = -1;

      group.append(btn, refreshBtn);
      return group;
    }

    const argGroup = makeTabGroup('Argument', 'argument', true);
    const visGroup = makeTabGroup('Visuals', 'visuals', false);
    const notesGroup = makeTabGroup('Notes', 'notes', false);

    tabBar.append(argGroup, visGroup, notesGroup);
    root.appendChild(tabBar);

    // ── Argument tab content ──────────────────────────────────────────────
    const argContent = document.createElement('div');
    argContent.className = 'tab-content active';
    argContent.id = 'tab-argument';

    const dualPanel = document.createElement('div');
    dualPanel.className = 'dual-panel';

    const oursPanel = createSidePanel('ours', states.ours, callbackSets.ours);
    oursPanel._callbacks = callbackSets.ours;
    const opponentPanel = createSidePanel('opponent', states.opponent, callbackSets.opponent);
    opponentPanel._callbacks = callbackSets.opponent;

    dualPanel.append(oursPanel, opponentPanel);
    argContent.appendChild(dualPanel);

    // ── Argument-tab Notepad ─────────────────────────────────────────────
    const argNotes = document.createElement('div');
    argNotes.className = 'notes-panel arg-notepad';

    const argNotepadTitle = document.createElement('div');
    argNotepadTitle.className = 'notes-section-title';
    argNotepadTitle.textContent = 'Notepad';
    argNotes.appendChild(argNotepadTitle);

    const argToolbar = document.createElement('div');
    argToolbar.className = 'rich-toolbar';

    const argActions = [
      { cmd: 'bold', icon: 'B', title: 'Bold', cls: 'rich-btn-bold' },
      { cmd: 'italic', icon: 'I', title: 'Italic', cls: 'rich-btn-italic' },
      { cmd: 'underline', icon: 'U', title: 'Underline', cls: 'rich-btn-underline' },
      { cmd: 'strikeThrough', icon: 'S', title: 'Strikethrough', cls: 'rich-btn-strike' },
      { sep: true },
      { cmd: 'insertUnorderedList', icon: '•', title: 'Bullet list' },
      { cmd: 'insertOrderedList', icon: '1.', title: 'Numbered list' },
      { sep: true },
      { cmd: 'formatBlock', value: 'H3', icon: 'H', title: 'Heading' },
      { cmd: 'formatBlock', value: 'BLOCKQUOTE', icon: '"', title: 'Quote' },
      { sep: true },
      { cmd: 'removeFormat', icon: '⌧', title: 'Clear formatting' },
    ];

    argActions.forEach(a => {
      if (a.sep) {
        const sep = document.createElement('span');
        sep.className = 'rich-sep';
        argToolbar.appendChild(sep);
        return;
      }
      const btn = document.createElement('button');
      btn.className = `rich-btn${a.cls ? ' ' + a.cls : ''}`;
      btn.textContent = a.icon;
      btn.title = a.title;
      btn.tabIndex = -1;
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        document.execCommand(a.cmd, false, a.value || null);
      });
      argToolbar.appendChild(btn);
    });

    argNotes.appendChild(argToolbar);

    const argEditor = document.createElement('div');
    argEditor.className = 'notes-editor';
    argEditor.contentEditable = 'true';
    argEditor.spellcheck = true;
    argEditor.dataset.placeholder = 'Take notes here…';

    argNotes.appendChild(argEditor);
    argContent.appendChild(argNotes);

    root.appendChild(argContent);

    // ── Visuals tab content ───────────────────────────────────────────────
    const visContent = document.createElement('div');
    visContent.className = 'tab-content';
    visContent.id = 'tab-visuals';
    visContent.appendChild(createVisualsPanel());
    root.appendChild(visContent);

    // ── Notes tab content ────────────────────────────────────────────────
    const notesContent = document.createElement('div');
    notesContent.className = 'tab-content';
    notesContent.id = 'tab-notes';

    // ── Two-column area ──────────────────────────────────────────────────
    const notesColumns = document.createElement('div');
    notesColumns.className = 'notes-columns';

    // Left: Conversation chain
    const convoCol = document.createElement('div');
    convoCol.className = 'convo-chain';

    const convoTitle = document.createElement('div');
    convoTitle.className = 'notes-section-title';
    convoTitle.textContent = 'Conversation Chain';
    convoCol.appendChild(convoTitle);

    const convoList = document.createElement('div');
    convoList.className = 'convo-list';
    convoCol.appendChild(convoList);

    // Start with 2 entries (ours, opponent)
    function createConvoEntry(side) {
      const entry = document.createElement('div');
      entry.className = `convo-entry convo-${side}`;
      const label = document.createElement('span');
      label.className = 'convo-label';
      label.textContent = side === 'ours' ? 'Host' : 'Guest';
      const textarea = document.createElement('textarea');
      textarea.className = 'convo-input';
      textarea.placeholder = side === 'ours' ? 'Host point…' : 'Guest response…';
      textarea.rows = 1;
      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      });
      entry.append(label, textarea);
      return entry;
    }

    let convoSide = 'ours';
    for (let i = 0; i < 4; i++) {
      convoList.appendChild(createConvoEntry(convoSide));
      convoSide = convoSide === 'ours' ? 'opponent' : 'ours';
    }

    const addConvoBtn = document.createElement('button');
    addConvoBtn.className = 'add-premise-btn';
    addConvoBtn.textContent = '+ Add Exchange';
    addConvoBtn.tabIndex = -1;
    addConvoBtn.addEventListener('click', () => {
      const entries = convoList.querySelectorAll('.convo-entry');
      const lastSide = entries.length > 0
        ? (entries[entries.length - 1].classList.contains('convo-ours') ? 'opponent' : 'ours')
        : 'ours';
      convoList.appendChild(createConvoEntry(lastSide));
    });
    convoCol.appendChild(addConvoBtn);

    // Right: Q&A box
    const qaCol = document.createElement('div');
    qaCol.className = 'qa-box';

    const qaTitle = document.createElement('div');
    qaTitle.className = 'notes-section-title';
    qaTitle.textContent = 'Quick Q & A';
    qaCol.appendChild(qaTitle);

    const questionEntry = document.createElement('div');
    questionEntry.className = 'convo-entry convo-ours';
    const qLabel = document.createElement('span');
    qLabel.className = 'convo-label';
    qLabel.textContent = 'Q';
    const qInput = document.createElement('textarea');
    qInput.className = 'convo-input';
    qInput.placeholder = 'Host question…';
    qInput.rows = 1;
    qInput.addEventListener('input', () => {
      qInput.style.height = 'auto';
      qInput.style.height = qInput.scrollHeight + 'px';
    });
    questionEntry.append(qLabel, qInput);

    const answerEntry = document.createElement('div');
    answerEntry.className = 'convo-entry convo-opponent';
    const aLabel = document.createElement('span');
    aLabel.className = 'convo-label';
    aLabel.textContent = 'A';
    const aInput = document.createElement('textarea');
    aInput.className = 'convo-input';
    aInput.placeholder = 'Guest answer…';
    aInput.rows = 1;
    aInput.addEventListener('input', () => {
      aInput.style.height = 'auto';
      aInput.style.height = aInput.scrollHeight + 'px';
    });
    answerEntry.append(aLabel, aInput);

    qaCol.append(questionEntry, answerEntry);

    notesColumns.append(convoCol, qaCol);
    notesContent.appendChild(notesColumns);

    // ── Notepad ──────────────────────────────────────────────────────────
    const notesPanel = document.createElement('div');
    notesPanel.className = 'notes-panel';

    const notepadTitle = document.createElement('div');
    notepadTitle.className = 'notes-section-title';
    notepadTitle.textContent = 'Notepad';
    notesPanel.appendChild(notepadTitle);

    // Rich text toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'rich-toolbar';

    const actions = [
      { cmd: 'bold', icon: 'B', title: 'Bold', cls: 'rich-btn-bold' },
      { cmd: 'italic', icon: 'I', title: 'Italic', cls: 'rich-btn-italic' },
      { cmd: 'underline', icon: 'U', title: 'Underline', cls: 'rich-btn-underline' },
      { cmd: 'strikeThrough', icon: 'S', title: 'Strikethrough', cls: 'rich-btn-strike' },
      { sep: true },
      { cmd: 'insertUnorderedList', icon: '•', title: 'Bullet list' },
      { cmd: 'insertOrderedList', icon: '1.', title: 'Numbered list' },
      { sep: true },
      { cmd: 'formatBlock', value: 'H3', icon: 'H', title: 'Heading' },
      { cmd: 'formatBlock', value: 'BLOCKQUOTE', icon: '"', title: 'Quote' },
      { sep: true },
      { cmd: 'removeFormat', icon: '⌧', title: 'Clear formatting' },
    ];

    actions.forEach(a => {
      if (a.sep) {
        const sep = document.createElement('span');
        sep.className = 'rich-sep';
        toolbar.appendChild(sep);
        return;
      }
      const btn = document.createElement('button');
      btn.className = `rich-btn${a.cls ? ' ' + a.cls : ''}`;
      btn.textContent = a.icon;
      btn.title = a.title;
      btn.tabIndex = -1;
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        document.execCommand(a.cmd, false, a.value || null);
      });
      toolbar.appendChild(btn);
    });

    notesPanel.appendChild(toolbar);

    // Contenteditable notepad
    const notesEditor = document.createElement('div');
    notesEditor.className = 'notes-editor';
    notesEditor.contentEditable = 'true';
    notesEditor.spellcheck = true;
    notesEditor.dataset.placeholder = 'Take notes here…';

    notesPanel.appendChild(notesEditor);
    notesContent.appendChild(notesPanel);
    root.appendChild(notesContent);

    // Tab switching
    tabBar.addEventListener('click', e => {
      // Handle refresh button
      const refreshBtn = e.target.closest('.tab-refresh-btn');
      if (refreshBtn) {
        const tabId = refreshBtn.dataset.tabRefresh;
        if (tabId === 'argument' && options.onResetArgument) {
          options.onResetArgument();
          const argNotepad = qs(root, '#tab-argument .notes-editor');
          if (argNotepad) argNotepad.innerHTML = '';
        } else if (tabId === 'visuals') {
          refreshVisuals();
        } else {
          const tabContent = qs(root, `#tab-${tabId}`);
          if (tabContent) {
            tabContent.querySelectorAll('textarea, input[type="text"]').forEach(el => {
              el.value = '';
              el.style.height = '';
            });
            tabContent.querySelectorAll('.notes-editor').forEach(el => {
              el.innerHTML = '';
            });
          }
        }
        return;
      }

      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tabBar.querySelectorAll('.tab-group').forEach(g => g.classList.remove('active'));
      btn.classList.add('active');
      btn.closest('.tab-group').classList.add('active');
      const tab = btn.dataset.tab;
      qs(root, '#tab-argument').classList.toggle('active', tab === 'argument');
      qs(root, '#tab-visuals').classList.toggle('active', tab === 'visuals');
      qs(root, '#tab-notes').classList.toggle('active', tab === 'notes');
    });

    return;
  }

  // ── Patch ───────────────────────────────────────────────────────────────
  const dualPanel = qs(root, '.dual-panel');
  const oursPanel = qs(root, '.side-panel.side-ours');
  const opponentPanel = qs(root, '.side-panel.side-opponent');

  // If premise IDs don't match (e.g. after reset), rebuild the panels
  const oursFirstId = oursPanel && oursPanel.querySelector('[data-premise-id]');
  const stateFirstId = states.ours.premises[0]?.id;
  if (dualPanel && oursFirstId && stateFirstId && oursFirstId.dataset.premiseId !== stateFirstId) {
    dualPanel.innerHTML = '';
    const newOurs = createSidePanel('ours', states.ours, callbackSets.ours);
    newOurs._callbacks = callbackSets.ours;
    const newOpp = createSidePanel('opponent', states.opponent, callbackSets.opponent);
    newOpp._callbacks = callbackSets.opponent;
    dualPanel.append(newOurs, newOpp);
    return;
  }

  if (oursPanel) patchSidePanel(oursPanel, states.ours);
  if (opponentPanel) patchSidePanel(opponentPanel, states.opponent);
}
