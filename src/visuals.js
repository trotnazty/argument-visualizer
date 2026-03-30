/**
 * visuals.js — Standalone visual tools for debate hosts.
 * Each visual is an independent, interactive editor (not derived from premises).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const W = 600;
const H = 360;

const DIAGRAM_TYPES = [
  { id: 'venn', label: 'Venn Diagram' },
  { id: 'argument-map', label: 'Argument Map' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'flowchart', label: 'Flowchart' },
  { id: 'strength', label: 'Strength Meter' },
  { id: 'circular', label: 'Circular Argument' },
  { id: 'is-ought', label: 'Is–Ought' },
];

// ── SVG Helpers ────────────────────────────────────────────────────────────

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

function freshSvg(container) {
  container.innerHTML = '';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'visual-svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  container.appendChild(svg);
  return svg;
}

// ── Persistent state store ─────────────────────────────────────────────────
const savedStates = {};

function getOrCreateState(key, factory) {
  if (!savedStates[key]) savedStates[key] = factory();
  return savedStates[key];
}

function autoGrowTextarea(cls, placeholder, value, onInput) {
  const ta = document.createElement('textarea');
  ta.className = cls;
  ta.placeholder = placeholder;
  if (value) ta.value = value;
  ta.rows = 1;
  ta.addEventListener('input', e => {
    onInput(e.target.value);
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  });
  return ta;
}

function estimateTextHeight(text, widthPx, fontSizePx) {
  const sz = parseFloat(fontSizePx) || 12;
  const charsPerLine = Math.max(1, Math.floor(widthPx / (sz * 0.62)));
  const lines = Math.ceil((text || '').length / charsPerLine) || 1;
  return Math.max(parseFloat(fontSizePx) * 1.3, lines * sz * 1.35);
}

function svgWrappedText(svg, { x, y, width, text, color, fontSize, fontWeight, fontFamily, align, rectEl }) {
  const sz = fontSize || '12';
  const h = estimateTextHeight(text, width, sz);

  if (rectEl) {
    const oldH = parseFloat(rectEl.getAttribute('height'));
    if (h > oldH) {
      const oldY = parseFloat(rectEl.getAttribute('y'));
      const growth = h - oldH;
      rectEl.setAttribute('height', h + 8);
      rectEl.setAttribute('y', oldY - growth / 2);
    }
  }

  const fo = document.createElementNS(SVG_NS, 'foreignObject');
  fo.setAttribute('x', x - width / 2);
  fo.setAttribute('y', y - h / 2);
  fo.setAttribute('width', width);
  fo.setAttribute('height', h);
  const XHTML = 'http://www.w3.org/1999/xhtml';
  const div = document.createElementNS(XHTML, 'div');
  div.setAttribute('xmlns', XHTML);
  div.setAttribute('style', `
    width:${width}px;height:${h}px;display:flex;align-items:center;justify-content:${align || 'center'};
    text-align:center;color:${color || 'var(--text)'};font-size:${sz}px;
    font-weight:${fontWeight || 'normal'};font-family:${fontFamily || 'var(--font-mono)'};
    word-wrap:break-word;overflow-wrap:break-word;overflow:hidden;line-height:1.3;
    pointer-events:none;
  `);
  div.textContent = text;
  fo.appendChild(div);
  svg.appendChild(fo);
}

// ── Venn Diagram Editor ────────────────────────────────────────────────────

function createVennEditor(container) {
  const state = getOrCreateState('venn', () => ({
    circles: [
      { label: '', cx: W * 0.38, cy: H * 0.45, r: 100 },
      { label: '', cx: W * 0.62, cy: H * 0.45, r: 100 },
    ],
  }));

  const controls = document.createElement('div');
  controls.className = 'visual-controls';

  const addBtn = document.createElement('button');
  addBtn.className = 'visual-ctrl-btn';
  addBtn.textContent = '+ Add Circle';
  addBtn.addEventListener('click', () => {
    if (state.circles.length >= 4) return;
    state.circles.push({
      label: '',
      cx: W * 0.5,
      cy: H * 0.5,
      r: 90,
    });
    renderVenn(container.querySelector('.diagram-canvas'), state);
    renderVennInputs(inputList, state, container.querySelector('.diagram-canvas'));
  });

  const removeBtn = document.createElement('button');
  removeBtn.className = 'visual-ctrl-btn danger';
  removeBtn.textContent = '- Remove Last';
  removeBtn.addEventListener('click', () => {
    if (state.circles.length <= 1) return;
    state.circles.pop();
    renderVenn(container.querySelector('.diagram-canvas'), state);
    renderVennInputs(inputList, state, container.querySelector('.diagram-canvas'));
  });

  controls.append(addBtn, removeBtn);

  const inputList = document.createElement('div');
  inputList.className = 'visual-inputs';

  const canvas = document.createElement('div');
  canvas.className = 'diagram-canvas';

  container.append(controls, inputList, canvas);

  renderVennInputs(inputList, state, canvas);
  renderVenn(canvas, state);
}

function renderVennInputs(inputList, state, canvas) {
  inputList.innerHTML = '';
  const colors = ['var(--accent)', 'var(--green)', 'var(--red)', 'var(--yellow)'];
  state.circles.forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'visual-input-row';

    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    swatch.style.background = colors[i];

    const ta = autoGrowTextarea('visual-text-input', `Set ${String.fromCharCode(65 + i)}`, c.label, v => {
      c.label = v;
      renderVenn(canvas, state);
    });

    row.append(swatch, ta);
    inputList.appendChild(row);
  });
}

function renderVenn(container, state) {
  const canvas = container.closest('.diagram-canvas') || container;
  const svg = freshSvg(canvas);
  const colors = ['var(--accent)', 'var(--green)', 'var(--red)', 'var(--yellow)'];

  // Positions based on count
  const count = state.circles.length;
  let positions;
  if (count === 1) {
    positions = [{ cx: W / 2, cy: H / 2 }];
  } else if (count === 2) {
    const off = 65;
    positions = [
      { cx: W / 2 - off, cy: H / 2 },
      { cx: W / 2 + off, cy: H / 2 },
    ];
  } else if (count === 3) {
    const off = 55;
    positions = [
      { cx: W / 2, cy: H / 2 - off * 0.7 },
      { cx: W / 2 - off, cy: H / 2 + off * 0.5 },
      { cx: W / 2 + off, cy: H / 2 + off * 0.5 },
    ];
  } else {
    const off = 60;
    positions = [
      { cx: W / 2 - off, cy: H / 2 - off * 0.5 },
      { cx: W / 2 + off, cy: H / 2 - off * 0.5 },
      { cx: W / 2 - off, cy: H / 2 + off * 0.5 },
      { cx: W / 2 + off, cy: H / 2 + off * 0.5 },
    ];
  }

  state.circles.forEach((c, i) => {
    const pos = positions[i] || { cx: W / 2, cy: H / 2 };
    svg.appendChild(svgEl('circle', {
      cx: pos.cx, cy: pos.cy, r: c.r,
      fill: colors[i], 'fill-opacity': 0.13,
      stroke: colors[i], 'stroke-width': 2.5,
    }));

    // Label centered in circle
    svgWrappedText(svg, {
      x: pos.cx, y: pos.cy, width: c.r * 1.4, height: c.r * 1.2,
      text: c.label || `Set ${String.fromCharCode(65 + i)}`,
      color: colors[i], fontSize: '14', fontWeight: '600', fontFamily: 'var(--font-ui)',
    });
  });
}

// ── Argument Map Editor ────────────────────────────────────────────────────

function createArgumentMapEditor(container) {
  const state = getOrCreateState('argument-map', () => ({
    nodes: [
      { id: 'n1', label: '', type: 'support', x: W * 0.25, y: 50 },
      { id: 'n2', label: '', type: 'support', x: W * 0.75, y: 50 },
      { id: 'nc', label: '', type: 'conclusion', x: W * 0.5, y: H - 70 },
    ],
  }));

  const controls = document.createElement('div');
  controls.className = 'visual-controls';

  const addSupport = document.createElement('button');
  addSupport.className = 'visual-ctrl-btn';
  addSupport.textContent = '+ Support';
  addSupport.addEventListener('click', () => {
    const id = 'n' + Date.now();
    state.nodes.splice(state.nodes.length - 1, 0, {
      id, label: '', type: 'support',
      x: W * (0.2 + Math.random() * 0.6), y: 50,
    });
    renderMapInputs(inputList, state, canvas);
    renderArgumentMap(canvas, state);
  });

  const addAttack = document.createElement('button');
  addAttack.className = 'visual-ctrl-btn';
  addAttack.textContent = '+ Attack';
  addAttack.addEventListener('click', () => {
    const id = 'n' + Date.now();
    state.nodes.splice(state.nodes.length - 1, 0, {
      id, label: '',
      type: 'attack',
      x: W * (0.2 + Math.random() * 0.6), y: 50,
    });
    renderMapInputs(inputList, state, canvas);
    renderArgumentMap(canvas, state);
  });

  controls.append(addSupport, addAttack);

  const inputList = document.createElement('div');
  inputList.className = 'visual-inputs';

  const canvas = document.createElement('div');
  canvas.className = 'diagram-canvas';

  container.append(controls, inputList, canvas);

  renderMapInputs(inputList, state, canvas);
  renderArgumentMap(canvas, state);
}

function renderMapInputs(inputList, state, canvas) {
  inputList.innerHTML = '';
  let premIdx = 0, objIdx = 0;
  state.nodes.forEach((n) => {
    const row = document.createElement('div');
    row.className = 'visual-input-row';

    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    swatch.style.background = n.type === 'conclusion' ? 'var(--accent)'
      : n.type === 'attack' ? 'var(--red)' : 'var(--green)';

    let placeholder;
    if (n.type === 'conclusion') placeholder = 'Conclusion';
    else if (n.type === 'attack') placeholder = `Objection ${++objIdx}`;
    else placeholder = `Premise ${++premIdx}`;

    const input = autoGrowTextarea('visual-text-input', placeholder, n.label, v => {
      n.label = v;
      renderArgumentMap(canvas, state);
    });

    row.append(swatch, input);

    if (n.type !== 'conclusion') {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'visual-ctrl-btn danger small';
      removeBtn.textContent = '\u00d7';
      removeBtn.addEventListener('click', () => {
        state.nodes = state.nodes.filter(x => x.id !== n.id);
        renderMapInputs(inputList, state, canvas);
        renderArgumentMap(canvas, state);
      });
      row.appendChild(removeBtn);
    }

    inputList.appendChild(row);
  });
}

function renderArgumentMap(canvas, state) {
  const svg = freshSvg(canvas);

  // Arrowhead markers
  const defs = svgEl('defs', {});
  ['green', 'red'].forEach(c => {
    const marker = svgEl('marker', {
      id: `arrow-${c}`, markerWidth: 10, markerHeight: 7,
      refX: 10, refY: 3.5, orient: 'auto',
    });
    marker.appendChild(svgEl('polygon', {
      points: '0 0, 10 3.5, 0 7',
      fill: `var(--${c})`,
    }));
    defs.appendChild(marker);
  });
  svg.appendChild(defs);

  const conclusion = state.nodes.find(n => n.type === 'conclusion');
  const premises = state.nodes.filter(n => n.type !== 'conclusion');
  const count = premises.length;

  // Layout premises evenly across top
  premises.forEach((p, i) => {
    p.x = (W / (count + 1)) * (i + 1);
    p.y = 55;
  });
  if (conclusion) {
    conclusion.x = W / 2;
    conclusion.y = H - 65;
  }

  // Draw edges
  if (conclusion) {
    premises.forEach(p => {
      const color = p.type === 'attack' ? 'red' : 'green';
      svg.appendChild(svgEl('line', {
        x1: p.x, y1: p.y + 24,
        x2: conclusion.x, y2: conclusion.y - 24,
        stroke: `var(--${color})`,
        'stroke-width': 2,
        'stroke-dasharray': p.type === 'attack' ? '6,4' : 'none',
        'marker-end': `url(#arrow-${color})`,
      }));
    });
  }

  // Draw nodes
  let premIdx = 0, objIdx = 0;
  state.nodes.forEach(n => {
    const isConc = n.type === 'conclusion';
    const border = isConc ? 'var(--accent)' : n.type === 'attack' ? 'var(--red)' : 'var(--green)';
    const nodeW = isConc ? 160 : 130;

    const rect = svgEl('rect', {
      x: n.x - nodeW / 2, y: n.y - 20, width: nodeW, height: 40, rx: 8,
      fill: 'var(--surface-2)', stroke: border, 'stroke-width': 2,
    });
    svg.appendChild(rect);

    let fallback;
    if (isConc) fallback = 'Conclusion';
    else if (n.type === 'attack') fallback = `Objection ${++objIdx}`;
    else fallback = `Premise ${++premIdx}`;
    const label = n.label || fallback;
    svgWrappedText(svg, {
      x: n.x, y: n.y, width: nodeW - 8,
      text: label, fontSize: '12', fontFamily: 'var(--font-mono)', rectEl: rect,
    });
  });
}

// ── Timeline Editor ────────────────────────────────────────────────────────

function createTimelineEditor(container) {
  const state = getOrCreateState('timeline', () => ({
    events: [
      { label: '', pos: 0.15 },
      { label: '', pos: 0.5 },
      { label: '', pos: 0.85 },
    ],
  }));

  const controls = document.createElement('div');
  controls.className = 'visual-controls';

  const addBtn = document.createElement('button');
  addBtn.className = 'visual-ctrl-btn';
  addBtn.textContent = '+ Add Event';
  addBtn.addEventListener('click', () => {
    // Place new event at rightmost open spot
    const maxPos = state.events.reduce((m, e) => Math.max(m, e.pos), 0);
    const newPos = Math.min(maxPos + 0.12, 0.95);
    state.events.push({ label: '', pos: newPos });
    sortEvents(state);
    renderTimelineInputs(inputList, state, canvas);
    renderTimeline(canvas, state, inputList);
  });

  const hint = document.createElement('span');
  hint.className = 'visual-hint';
  hint.textContent = 'Drag dots to reorder';

  controls.append(addBtn, hint);

  const inputList = document.createElement('div');
  inputList.className = 'visual-inputs';

  const canvas = document.createElement('div');
  canvas.className = 'diagram-canvas';

  container.append(controls, inputList, canvas);

  renderTimelineInputs(inputList, state, canvas);
  renderTimeline(canvas, state, inputList);
}

function sortEvents(state) {
  state.events.sort((a, b) => a.pos - b.pos);
}

function renderTimelineInputs(inputList, state, canvas) {
  inputList.innerHTML = '';
  state.events.forEach((ev, i) => {
    const row = document.createElement('div');
    row.className = 'visual-input-row';

    const num = document.createElement('span');
    num.className = 'color-swatch';
    num.style.background = 'var(--accent)';
    num.textContent = i + 1;
    num.style.color = '#fff';
    num.style.fontSize = '10px';
    num.style.display = 'flex';
    num.style.alignItems = 'center';
    num.style.justifyContent = 'center';

    const input = autoGrowTextarea('visual-text-input', `Event ${i + 1}`, ev.label, v => {
      ev.label = v;
      renderTimeline(canvas, state, inputList);
    });

    row.append(num, input);

    if (state.events.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'visual-ctrl-btn danger small';
      removeBtn.textContent = '\u00d7';
      removeBtn.addEventListener('click', () => {
        state.events.splice(i, 1);
        renderTimelineInputs(inputList, state, canvas);
        renderTimeline(canvas, state, inputList);
      });
      row.appendChild(removeBtn);
    }

    inputList.appendChild(row);
  });
}

function renderTimeline(canvas, state, inputList) {
  const svg = freshSvg(canvas);
  const events = state.events;
  const count = events.length;
  if (count === 0) return;

  const padX = 60;
  const lineY = H / 2;
  const startX = padX;
  const endX = W - padX;
  const span = endX - startX;

  // Main timeline line
  svg.appendChild(svgEl('line', {
    x1: startX - 20, y1: lineY, x2: endX + 20, y2: lineY,
    stroke: 'var(--border)', 'stroke-width': 2,
  }));

  // Arrow at end
  svg.appendChild(svgEl('polygon', {
    points: `${endX + 20},${lineY} ${endX + 12},${lineY - 5} ${endX + 12},${lineY + 5}`,
    fill: 'var(--border)',
  }));

  // Compute display positions with minimum spacing so dots never overlap
  const minGap = 28; // minimum pixels between adjacent points
  const rawXs = events.map(ev => startX + span * ev.pos);
  const displayXs = [...rawXs];
  // Push overlapping points apart (greedy left-to-right)
  for (let j = 1; j < displayXs.length; j++) {
    if (displayXs[j] - displayXs[j - 1] < minGap) {
      displayXs[j] = displayXs[j - 1] + minGap;
    }
  }
  // If we pushed past the right edge, compress back from the right
  if (displayXs.length > 0 && displayXs[displayXs.length - 1] > endX) {
    displayXs[displayXs.length - 1] = endX;
    for (let j = displayXs.length - 2; j >= 0; j--) {
      if (displayXs[j + 1] - displayXs[j] < minGap) {
        displayXs[j] = displayXs[j + 1] - minGap;
      }
    }
  }

  events.forEach((ev, i) => {
    const x = displayXs[i];
    const above = i % 2 === 0;

    // Group all elements for this event so we can move them together
    const group = document.createElementNS(SVG_NS, 'g');

    // Tick mark
    group.appendChild(svgEl('line', {
      x1: 0, y1: lineY - 8, x2: 0, y2: lineY + 8,
      stroke: 'var(--accent)', 'stroke-width': 2,
    }));

    // Connector line
    const labelY = above ? lineY - 50 : lineY + 50;
    group.appendChild(svgEl('line', {
      x1: 0, y1: above ? lineY - 8 : lineY + 8,
      x2: 0, y2: above ? labelY + 14 : labelY - 14,
      stroke: 'var(--border)', 'stroke-width': 1, 'stroke-dasharray': '3,3',
    }));

    // Label
    const label = ev.label || `Event ${i + 1}`;
    svgWrappedText(group, {
      x: 0, y: labelY, width: 100, height: 40,
      text: label, fontSize: '12', fontWeight: '500', fontFamily: 'var(--font-mono)',
    });

    // Index badge
    const badgeY = above ? labelY - 18 : labelY + 18;
    group.appendChild(svgEl('circle', {
      cx: 0, cy: badgeY, r: 10,
      fill: 'var(--accent)', 'fill-opacity': 0.2,
      stroke: 'var(--accent)', 'stroke-width': 1,
    }));
    const badge = svgEl('text', {
      x: 0, y: badgeY,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      fill: 'var(--accent)', 'font-size': '10', 'font-weight': '700',
      'font-family': 'var(--font-mono)',
    });
    badge.textContent = i + 1;
    group.appendChild(badge);

    // Draggable dot — larger invisible hit area + visible dot
    const hitArea = svgEl('circle', {
      cx: 0, cy: lineY, r: 16,
      fill: 'transparent',
      cursor: 'grab',
    });
    const dot = svgEl('circle', {
      cx: 0, cy: lineY, r: 6,
      fill: 'var(--accent)',
      cursor: 'grab',
    });
    group.appendChild(hitArea);
    group.appendChild(dot);

    // Position the whole group
    group.setAttribute('transform', `translate(${x}, 0)`);
    svg.appendChild(group);

    // Drag handling — updates the group transform directly, no full re-render
    function startDrag(e) {
      e.preventDefault();
      e.stopPropagation();
      const svgRect = svg.getBoundingClientRect();
      const svgW = svgRect.width;
      const scale = W / svgW;

      // Disable pointer events on all OTHER groups during drag
      const allGroups = svg.querySelectorAll('g');
      allGroups.forEach(g => { if (g !== group) g.style.pointerEvents = 'none'; });
      dot.setAttribute('cursor', 'grabbing');
      hitArea.setAttribute('cursor', 'grabbing');

      function onMove(moveEvt) {
        moveEvt.preventDefault();
        const clientX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
        const svgX = (clientX - svgRect.left) * scale;
        const newPos = Math.max(0, Math.min(1, (svgX - startX) / span));
        ev.pos = newPos;
        // Move just this group — no full re-render
        const newX = startX + span * newPos;
        group.setAttribute('transform', `translate(${newX}, 0)`);
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
        // Re-enable pointer events
        allGroups.forEach(g => { g.style.pointerEvents = ''; });
        // Sort and do a full re-render now that drag is done
        sortEvents(state);
        renderTimeline(canvas, state, inputList);
        renderTimelineInputs(inputList, state, canvas);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    }

    hitArea.addEventListener('mousedown', startDrag);
    hitArea.addEventListener('touchstart', startDrag, { passive: false });
    dot.addEventListener('mousedown', startDrag);
    dot.addEventListener('touchstart', startDrag, { passive: false });
  });
}

// ── Comparison Table Editor ─────────────────────────────────────────────────

function createComparisonEditor(container) {
  const state = getOrCreateState('comparison', () => ({
    colA: '',
    colB: '',
    rows: [
      { a: '', b: '' },
      { a: '', b: '' },
      { a: '', b: '' },
    ],
  }));

  const controls = document.createElement('div');
  controls.className = 'visual-controls';

  const addBtn = document.createElement('button');
  addBtn.className = 'visual-ctrl-btn';
  addBtn.textContent = '+ Add Row';
  addBtn.addEventListener('click', () => {
    state.rows.push({ a: '', b: '' });
    renderComparisonTable(tableWrap, state);
  });
  controls.append(addBtn);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'comparison-wrap';

  container.append(controls, tableWrap);
  renderComparisonTable(tableWrap, state);
}

function renderComparisonTable(wrap, state) {
  wrap.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'comparison-table';

  // Header
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  const thNum = document.createElement('th');
  thNum.textContent = '#';
  headRow.appendChild(thNum);

  [state, 'colA', 'colB'].slice(1).forEach((key, ci) => {
    const th = document.createElement('th');
    const colVal = ci === 0 ? state.colA : state.colB;
    const placeholder = ci === 0 ? 'Our Position' : "Guest's Position";
    const inp = autoGrowTextarea('comparison-header-input', placeholder, colVal, v => {
      if (ci === 0) state.colA = v;
      else state.colB = v;
    });
    th.appendChild(inp);
    headRow.appendChild(th);
  });

  const thAct = document.createElement('th');
  thAct.textContent = '';
  headRow.appendChild(thAct);
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  state.rows.forEach((row, i) => {
    const tr = document.createElement('tr');

    const tdNum = document.createElement('td');
    tdNum.className = 'comparison-num';
    tdNum.textContent = i + 1;
    tr.appendChild(tdNum);

    ['a', 'b'].forEach(key => {
      const td = document.createElement('td');
      const inp = autoGrowTextarea('comparison-cell-input', 'Enter point\u2026', row[key], v => { row[key] = v; });
      td.appendChild(inp);
      tr.appendChild(td);
    });

    const tdAct = document.createElement('td');
    if (state.rows.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'visual-ctrl-btn danger small';
      removeBtn.textContent = '\u00d7';
      removeBtn.addEventListener('click', () => {
        state.rows.splice(i, 1);
        renderComparisonTable(wrap, state);
      });
      tdAct.appendChild(removeBtn);
    }
    tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}

// ── Flowchart Editor ───────────────────────────────────────────────────────

function createFlowchartEditor(container) {
  const state = getOrCreateState('flowchart', () => ({
    nodes: [
      { id: 'f1', label: '', type: 'condition' },
      { id: 'f2', label: '', type: 'yes' },
      { id: 'f3', label: '', type: 'no' },
    ],
  }));

  const controls = document.createElement('div');
  controls.className = 'visual-controls';

  const addCond = document.createElement('button');
  addCond.className = 'visual-ctrl-btn';
  addCond.textContent = '+ Condition';
  addCond.addEventListener('click', () => {
    state.nodes.push({ id: 'f' + Date.now(), label: '', type: 'condition' });
    renderFlowInputs(inputList, state, canvas);
    renderFlowchart(canvas, state);
  });

  const addYes = document.createElement('button');
  addYes.className = 'visual-ctrl-btn';
  addYes.textContent = '+ Then';
  addYes.addEventListener('click', () => {
    state.nodes.push({ id: 'f' + Date.now(), label: '', type: 'yes' });
    renderFlowInputs(inputList, state, canvas);
    renderFlowchart(canvas, state);
  });

  const addNo = document.createElement('button');
  addNo.className = 'visual-ctrl-btn';
  addNo.textContent = '+ Else';
  addNo.addEventListener('click', () => {
    state.nodes.push({ id: 'f' + Date.now(), label: '', type: 'no' });
    renderFlowInputs(inputList, state, canvas);
    renderFlowchart(canvas, state);
  });

  controls.append(addCond, addYes, addNo);

  const inputList = document.createElement('div');
  inputList.className = 'visual-inputs';

  const canvas = document.createElement('div');
  canvas.className = 'diagram-canvas';

  container.append(controls, inputList, canvas);
  renderFlowInputs(inputList, state, canvas);
  renderFlowchart(canvas, state);
}

function renderFlowInputs(inputList, state, canvas) {
  inputList.innerHTML = '';
  state.nodes.forEach((n, i) => {
    const row = document.createElement('div');
    row.className = 'visual-input-row';

    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    swatch.style.background = n.type === 'condition' ? 'var(--yellow)'
      : n.type === 'yes' ? 'var(--green)' : 'var(--red)';

    const typeLabel = document.createElement('span');
    typeLabel.className = 'flow-type-label';
    typeLabel.textContent = n.type === 'condition' ? 'IF' : n.type === 'yes' ? 'THEN' : 'ELSE';

    const input = autoGrowTextarea('visual-text-input',
      n.type === 'condition' ? 'If…' : n.type === 'yes' ? 'Then…' : 'Else…',
      n.label, v => {
        n.label = v;
        renderFlowchart(canvas, state);
      });

    row.append(swatch, typeLabel, input);

    if (state.nodes.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'visual-ctrl-btn danger small';
      removeBtn.textContent = '\u00d7';
      removeBtn.addEventListener('click', () => {
        state.nodes = state.nodes.filter(x => x.id !== n.id);
        renderFlowInputs(inputList, state, canvas);
        renderFlowchart(canvas, state);
      });
      row.appendChild(removeBtn);
    }

    inputList.appendChild(row);
  });
}

function renderFlowchart(canvas, state) {
  const svg = freshSvg(canvas);
  const nodes = state.nodes;
  if (nodes.length === 0) return;

  // Defs for arrowheads
  const defs = svgEl('defs', {});
  ['yellow', 'green', 'red'].forEach(c => {
    const marker = svgEl('marker', {
      id: `flow-arrow-${c}`, markerWidth: 10, markerHeight: 7,
      refX: 10, refY: 3.5, orient: 'auto',
    });
    marker.appendChild(svgEl('polygon', {
      points: '0 0, 10 3.5, 0 7',
      fill: `var(--${c})`,
    }));
    defs.appendChild(marker);
  });
  svg.appendChild(defs);

  // Layout: conditions centered, then/else branch left/right below
  const conditions = nodes.filter(n => n.type === 'condition');
  const yesNodes = nodes.filter(n => n.type === 'yes');
  const noNodes = nodes.filter(n => n.type === 'no');

  const condY = 40;
  const branchY = 160;
  const rowGap = 70;

  // Draw conditions in a vertical chain
  conditions.forEach((n, i) => {
    const cy = condY + i * rowGap;
    n._x = W / 2;
    n._y = cy;

    // Diamond shape
    const size = 30;
    const points = `${n._x},${cy - size} ${n._x + size * 1.8},${cy} ${n._x},${cy + size} ${n._x - size * 1.8},${cy}`;
    svg.appendChild(svgEl('polygon', {
      points,
      fill: 'var(--surface-2)', stroke: 'var(--yellow)', 'stroke-width': 2,
    }));

    const condLabel = n.label || 'If…';
    svgWrappedText(svg, {
      x: n._x, y: cy, width: 80,
      text: condLabel, fontSize: '11', fontFamily: 'var(--font-mono)',
    });

    // Connect to next condition
    if (i < conditions.length - 1) {
      svg.appendChild(svgEl('line', {
        x1: n._x, y1: cy + 30,
        x2: n._x, y2: cy + rowGap - 30,
        stroke: 'var(--yellow)', 'stroke-width': 1.5,
        'marker-end': 'url(#flow-arrow-yellow)',
      }));
    }
  });

  // Last condition branches out
  const lastCond = conditions[conditions.length - 1];
  const branchStartY = lastCond ? lastCond._y + 30 : condY;

  // Yes branch (left side)
  yesNodes.forEach((n, i) => {
    const x = W * 0.25;
    const y = branchStartY + 60 + i * 55;
    n._x = x;
    n._y = y;

    const yesRect = svgEl('rect', {
      x: x - 70, y: y - 18, width: 140, height: 36, rx: 8,
      fill: 'var(--surface-2)', stroke: 'var(--green)', 'stroke-width': 2,
    });
    svg.appendChild(yesRect);

    const yesText = n.label || 'Then…';
    svgWrappedText(svg, {
      x: x, y: y, width: 130,
      text: yesText, fontSize: '11', fontFamily: 'var(--font-mono)', rectEl: yesRect,
    });

    if (i === 0 && lastCond) {
      // Connector from condition
      svg.appendChild(svgEl('line', {
        x1: lastCond._x - 30, y1: lastCond._y,
        x2: x, y2: y - 18,
        stroke: 'var(--green)', 'stroke-width': 1.5,
        'marker-end': 'url(#flow-arrow-green)',
      }));
      // "Yes" label
      const midX = (lastCond._x - 30 + x) / 2;
      const midY = (lastCond._y + y - 18) / 2;
      const yesLabel = svgEl('text', {
        x: midX - 8, y: midY - 4,
        fill: 'var(--green)', 'font-size': '10', 'font-weight': '700',
        'font-family': 'var(--font-ui)',
      });
      yesLabel.textContent = 'YES';
      svg.appendChild(yesLabel);
    } else if (i > 0) {
      svg.appendChild(svgEl('line', {
        x1: x, y1: y - 55 + 18,
        x2: x, y2: y - 18,
        stroke: 'var(--green)', 'stroke-width': 1.5,
        'marker-end': 'url(#flow-arrow-green)',
      }));
    }
  });

  // No branch (right side)
  noNodes.forEach((n, i) => {
    const x = W * 0.75;
    const y = branchStartY + 60 + i * 55;
    n._x = x;
    n._y = y;

    const noRect = svgEl('rect', {
      x: x - 70, y: y - 18, width: 140, height: 36, rx: 8,
      fill: 'var(--surface-2)', stroke: 'var(--red)', 'stroke-width': 2,
    });
    svg.appendChild(noRect);

    const noText = n.label || 'Else…';
    svgWrappedText(svg, {
      x: x, y: y, width: 130,
      text: noText, fontSize: '11', fontFamily: 'var(--font-mono)', rectEl: noRect,
    });

    if (i === 0 && lastCond) {
      svg.appendChild(svgEl('line', {
        x1: lastCond._x + 30, y1: lastCond._y,
        x2: x, y2: y - 18,
        stroke: 'var(--red)', 'stroke-width': 1.5,
        'marker-end': 'url(#flow-arrow-red)',
      }));
      const midX = (lastCond._x + 30 + x) / 2;
      const midY = (lastCond._y + y - 18) / 2;
      const noLabel = svgEl('text', {
        x: midX + 8, y: midY - 4,
        fill: 'var(--red)', 'font-size': '10', 'font-weight': '700',
        'font-family': 'var(--font-ui)',
      });
      noLabel.textContent = 'NO';
      svg.appendChild(noLabel);
    } else if (i > 0) {
      svg.appendChild(svgEl('line', {
        x1: x, y1: y - 55 + 18,
        x2: x, y2: y - 18,
        stroke: 'var(--red)', 'stroke-width': 1.5,
        'marker-end': 'url(#flow-arrow-red)',
      }));
    }
  });
}

// ── Strength Meter Editor ──────────────────────────────────────────────────

function createStrengthEditor(container) {
  const state = getOrCreateState('strength', () => ({
    axes: [
      { label: 'Evidence', value: 3 },
      { label: 'Relevance', value: 4 },
      { label: 'Credibility', value: 2 },
      { label: 'Consistency', value: 5 },
      { label: 'Completeness', value: 3 },
    ],
  }));

  const controls = document.createElement('div');
  controls.className = 'visual-controls';

  const addBtn = document.createElement('button');
  addBtn.className = 'visual-ctrl-btn';
  addBtn.textContent = '+ Add Axis';
  addBtn.addEventListener('click', () => {
    if (state.axes.length >= 8) return;
    const extraLabels = ['Clarity', 'Precision', 'Depth'];
    const idx = state.axes.length - 5;
    state.axes.push({ label: extraLabels[idx] || `Axis ${state.axes.length + 1}`, value: 3 });
    renderStrengthInputs(inputList, state, canvas);
    renderStrengthMeter(canvas, state);
  });

  const removeBtn = document.createElement('button');
  removeBtn.className = 'visual-ctrl-btn danger';
  removeBtn.textContent = '- Remove Last';
  removeBtn.addEventListener('click', () => {
    if (state.axes.length <= 3) return;
    state.axes.pop();
    renderStrengthInputs(inputList, state, canvas);
    renderStrengthMeter(canvas, state);
  });

  controls.append(addBtn, removeBtn);

  const inputList = document.createElement('div');
  inputList.className = 'visual-inputs';

  const canvas = document.createElement('div');
  canvas.className = 'diagram-canvas';

  container.append(controls, inputList, canvas);
  renderStrengthInputs(inputList, state, canvas);
  renderStrengthMeter(canvas, state);
}

function renderStrengthInputs(inputList, state, canvas) {
  inputList.innerHTML = '';
  state.axes.forEach((axis, i) => {
    const row = document.createElement('div');
    row.className = 'visual-input-row strength-row';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'strength-label';
    labelSpan.textContent = axis.label;
    labelSpan.style.flex = '1';

    const range = document.createElement('input');
    range.type = 'range';
    range.className = 'strength-range';
    range.min = 1;
    range.max = 5;
    range.value = axis.value;

    const valLabel = document.createElement('span');
    valLabel.className = 'strength-value';
    valLabel.textContent = axis.value;

    range.addEventListener('input', e => {
      axis.value = parseInt(e.target.value, 10);
      valLabel.textContent = axis.value;
      renderStrengthMeter(canvas, state);
    });

    row.append(labelSpan, range, valLabel);
    inputList.appendChild(row);
  });
}

function renderStrengthMeter(canvas, state) {
  const svg = freshSvg(canvas);
  const axes = state.axes;
  const count = axes.length;
  if (count < 3) return;

  const cx = W / 2;
  const cy = H / 2;
  const maxR = Math.min(W, H) * 0.35;
  const levels = 5;

  // Grid rings
  for (let l = 1; l <= levels; l++) {
    const r = (maxR / levels) * l;
    const points = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    svg.appendChild(svgEl('polygon', {
      points: points.join(' '),
      fill: 'none',
      stroke: 'var(--border)',
      'stroke-width': l === levels ? 1.5 : 0.5,
      'stroke-dasharray': l === levels ? 'none' : '2,3',
    }));
  }

  // Axis lines
  axes.forEach((_, i) => {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    svg.appendChild(svgEl('line', {
      x1: cx, y1: cy,
      x2: cx + maxR * Math.cos(angle),
      y2: cy + maxR * Math.sin(angle),
      stroke: 'var(--border)', 'stroke-width': 0.5,
    }));
  });

  // Data polygon
  const dataPoints = axes.map((a, i) => {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    const r = (maxR / levels) * a.value;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  });

  svg.appendChild(svgEl('polygon', {
    points: dataPoints.join(' '),
    fill: 'var(--accent)', 'fill-opacity': 0.2,
    stroke: 'var(--accent)', 'stroke-width': 2,
  }));

  // Data points and labels
  axes.forEach((a, i) => {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    const r = (maxR / levels) * a.value;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);

    svg.appendChild(svgEl('circle', {
      cx: px, cy: py, r: 4,
      fill: 'var(--accent)',
    }));

    // Axis label
    const labelR = maxR + 20;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);

    const defaultAxes = ['Evidence', 'Relevance', 'Credibility', 'Consistency', 'Completeness'];
    const raw = a.label || defaultAxes[i] || `Axis ${i + 1}`;
    const label = raw.length > 14 ? raw.slice(0, 12) + '\u2026' : raw;
    const text = svgEl('text', {
      x: lx, y: ly,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      fill: 'var(--text)', 'font-size': '11', 'font-weight': '500',
      'font-family': 'var(--font-ui)',
    });
    text.textContent = label;
    svg.appendChild(text);

    // Value at point
    const valText = svgEl('text', {
      x: px + 8, y: py - 8,
      fill: 'var(--accent)', 'font-size': '10', 'font-weight': '700',
      'font-family': 'var(--font-mono)',
    });
    valText.textContent = a.value;
    svg.appendChild(valText);
  });

  // Center score
  const avg = (axes.reduce((s, a) => s + a.value, 0) / count).toFixed(1);
  const scoreText = svgEl('text', {
    x: cx, y: cy + 4,
    'text-anchor': 'middle',
    fill: 'var(--text)', 'font-size': '18', 'font-weight': '700',
    'font-family': 'var(--font-mono)',
  });
  scoreText.textContent = avg;
  svg.appendChild(scoreText);

  const scoreLabel = svgEl('text', {
    x: cx, y: cy + 18,
    'text-anchor': 'middle',
    fill: 'var(--text-muted)', 'font-size': '9',
    'font-family': 'var(--font-ui)',
  });
  scoreLabel.textContent = '/ 5';
  svg.appendChild(scoreLabel);
}

// ── Circular Argument Editor ────────────────────────────────────────────────

function createCircularEditor(container) {
  const state = getOrCreateState('circular', () => ({
    left: '',
    right: '',
  }));

  const inputList = document.createElement('div');
  inputList.className = 'visual-inputs';

  const canvas = document.createElement('div');
  canvas.className = 'diagram-canvas';

  container.append(inputList, canvas);

  renderCircularInputs(inputList, state, canvas);
  renderCircular(canvas, state);
}

function renderCircularInputs(inputList, state, canvas) {
  inputList.innerHTML = '';

  const leftRow = document.createElement('div');
  leftRow.className = 'visual-input-row';
  const leftSwatch = document.createElement('span');
  leftSwatch.className = 'color-swatch';
  leftSwatch.style.background = 'var(--accent)';
  const leftInput = autoGrowTextarea('visual-text-input', 'Claim A (left side)', state.left, v => {
    state.left = v;
    renderCircular(canvas, state);
  });
  leftRow.append(leftSwatch, leftInput);

  const rightRow = document.createElement('div');
  rightRow.className = 'visual-input-row';
  const rightSwatch = document.createElement('span');
  rightSwatch.className = 'color-swatch';
  rightSwatch.style.background = 'var(--yellow)';
  const rightInput = autoGrowTextarea('visual-text-input', 'Claim B (right side)', state.right, v => {
    state.right = v;
    renderCircular(canvas, state);
  });
  rightRow.append(rightSwatch, rightInput);

  inputList.append(leftRow, rightRow);
}

function renderCircular(canvas, state) {
  const svg = freshSvg(canvas);
  const cx = W / 2;
  const cy = H / 2;
  const r = 100;

  // Defs for arrowheads
  const defs = svgEl('defs', {});
  const marker = svgEl('marker', {
    id: 'circ-arrow', markerWidth: 10, markerHeight: 7,
    refX: 10, refY: 3.5, orient: 'auto',
  });
  marker.appendChild(svgEl('polygon', {
    points: '0 0, 10 3.5, 0 7',
    fill: 'var(--red)',
  }));
  defs.appendChild(marker);
  svg.appendChild(defs);

  // Main circle (dashed to emphasize the loop)
  svg.appendChild(svgEl('circle', {
    cx, cy, r,
    fill: 'none',
    stroke: 'var(--border)',
    'stroke-width': 1.5,
    'stroke-dasharray': '6,4',
    'fill-opacity': 0,
  }));

  // Top curved arrow (left → right, going over the top)
  const arrowOffset = 8;
  svg.appendChild(svgEl('path', {
    d: `M ${cx - r + 15},${cy - arrowOffset} A ${r - arrowOffset} ${r - arrowOffset} 0 0 1 ${cx + r - 15},${cy - arrowOffset}`,
    fill: 'none',
    stroke: 'var(--red)',
    'stroke-width': 2.5,
    'marker-end': 'url(#circ-arrow)',
  }));

  // Bottom curved arrow (right → left, going under the bottom)
  svg.appendChild(svgEl('path', {
    d: `M ${cx + r - 15},${cy + arrowOffset} A ${r - arrowOffset} ${r - arrowOffset} 0 0 1 ${cx - r + 15},${cy + arrowOffset}`,
    fill: 'none',
    stroke: 'var(--red)',
    'stroke-width': 2.5,
    'marker-end': 'url(#circ-arrow)',
  }));

  // Left claim box
  const boxW = 140;
  const boxH = 44;
  const leftBoxX = cx - r - boxW - 20;
  const leftRect = svgEl('rect', {
    x: leftBoxX, y: cy - boxH / 2, width: boxW, height: boxH, rx: 8,
    fill: 'var(--surface-2)', stroke: 'var(--accent)', 'stroke-width': 2,
  });
  svg.appendChild(leftRect);

  svgWrappedText(svg, {
    x: leftBoxX + boxW / 2, y: cy, width: boxW - 12,
    text: state.left || 'Claim A',
    color: 'var(--accent)', fontSize: '12', fontWeight: '600', fontFamily: 'var(--font-mono)',
    rectEl: leftRect,
  });

  // Connector: left box → circle
  svg.appendChild(svgEl('line', {
    x1: leftBoxX + boxW, y1: cy,
    x2: cx - r, y2: cy,
    stroke: 'var(--border)', 'stroke-width': 1.5,
  }));

  // Right claim box
  const rightBoxX = cx + r + 20;
  const rightRect = svgEl('rect', {
    x: rightBoxX, y: cy - boxH / 2, width: boxW, height: boxH, rx: 8,
    fill: 'var(--surface-2)', stroke: 'var(--yellow)', 'stroke-width': 2,
  });
  svg.appendChild(rightRect);

  svgWrappedText(svg, {
    x: rightBoxX + boxW / 2, y: cy, width: boxW - 12,
    text: state.right || 'Claim B',
    color: 'var(--yellow)', fontSize: '12', fontWeight: '600', fontFamily: 'var(--font-mono)',
    rectEl: rightRect,
  });

  // Connector: circle → right box
  svg.appendChild(svgEl('line', {
    x1: cx + r, y1: cy,
    x2: rightBoxX, y2: cy,
    stroke: 'var(--border)', 'stroke-width': 1.5,
  }));

  // "Circular Reasoning" label at top
  const topLabel = svgEl('text', {
    x: cx, y: 28,
    'text-anchor': 'middle',
    fill: 'var(--red)', 'font-size': '13', 'font-weight': '700',
    'font-family': 'var(--font-ui)',
  });
  topLabel.textContent = 'Circular Reasoning';
  svg.appendChild(topLabel);

  // "A because B" / "B because A" labels on arrows
  const topMidLabel = svgEl('text', {
    x: cx, y: cy - r - 12,
    'text-anchor': 'middle',
    fill: 'var(--text-muted)', 'font-size': '10', 'font-weight': '500',
    'font-family': 'var(--font-ui)',
  });
  topMidLabel.textContent = 'A because B';
  svg.appendChild(topMidLabel);

  const botMidLabel = svgEl('text', {
    x: cx, y: cy + r + 20,
    'text-anchor': 'middle',
    fill: 'var(--text-muted)', 'font-size': '10', 'font-weight': '500',
    'font-family': 'var(--font-ui)',
  });
  botMidLabel.textContent = 'B because A';
  svg.appendChild(botMidLabel);
}

// ── Is–Ought Editor ─────────────────────────────────────────────────────────

function createIsOughtEditor(container) {
  const state = getOrCreateState('is-ought', () => ({
    isStatements: [
      { id: 'is1', text: '' },
    ],
    ought: '',
  }));

  const controls = document.createElement('div');
  controls.className = 'visual-controls';

  const addBtn = document.createElement('button');
  addBtn.className = 'visual-ctrl-btn';
  addBtn.textContent = '+ Add "Is" Statement';
  addBtn.addEventListener('click', () => {
    if (state.isStatements.length >= 5) return;
    state.isStatements.push({ id: 'is' + Date.now(), text: '' });
    renderIsOughtInputs(inputList, state, canvas);
    renderIsOught(canvas, state);
  });

  const removeBtn = document.createElement('button');
  removeBtn.className = 'visual-ctrl-btn danger';
  removeBtn.textContent = '- Remove Last';
  removeBtn.addEventListener('click', () => {
    if (state.isStatements.length <= 1) return;
    state.isStatements.pop();
    renderIsOughtInputs(inputList, state, canvas);
    renderIsOught(canvas, state);
  });

  controls.append(addBtn, removeBtn);

  const inputList = document.createElement('div');
  inputList.className = 'visual-inputs';

  const canvas = document.createElement('div');
  canvas.className = 'diagram-canvas';

  container.append(controls, inputList, canvas);

  renderIsOughtInputs(inputList, state, canvas);
  renderIsOught(canvas, state);
}

function renderIsOughtInputs(inputList, state, canvas) {
  inputList.innerHTML = '';

  state.isStatements.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'visual-input-row';

    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    swatch.style.background = 'var(--green)';

    const label = document.createElement('span');
    label.className = 'flow-type-label';
    label.textContent = 'IS';

    const input = autoGrowTextarea('visual-text-input', `Fact ${i + 1} (what is the case)`, s.text, v => {
      s.text = v;
      renderIsOught(canvas, state);
    });

    row.append(swatch, label, input);
    inputList.appendChild(row);
  });

  // Ought input
  const oughtRow = document.createElement('div');
  oughtRow.className = 'visual-input-row';

  const oughtSwatch = document.createElement('span');
  oughtSwatch.className = 'color-swatch';
  oughtSwatch.style.background = 'var(--accent)';

  const oughtLabel = document.createElement('span');
  oughtLabel.className = 'flow-type-label';
  oughtLabel.textContent = 'OUGHT';

  const oughtInput = autoGrowTextarea('visual-text-input', 'Therefore we ought to…', state.ought, v => {
    state.ought = v;
    renderIsOught(canvas, state);
  });

  oughtRow.append(oughtSwatch, oughtLabel, oughtInput);
  inputList.appendChild(oughtRow);
}

function renderIsOught(canvas, state) {
  const svg = freshSvg(canvas);
  const statements = state.isStatements;
  const count = statements.length;

  // Layout: IS boxes on the left, gap in the middle, OUGHT box on the right
  const isZoneX = 30;
  const isZoneW = 200;
  const gapX = W * 0.42;
  const gapW = 50;
  const oughtX = W * 0.58;

  // "IS" zone header
  const isHeader = svgEl('text', {
    x: isZoneX + isZoneW / 2, y: 28,
    'text-anchor': 'middle',
    fill: 'var(--green)', 'font-size': '14', 'font-weight': '700',
    'font-family': 'var(--font-ui)',
  });
  isHeader.textContent = 'IS (Descriptive)';
  svg.appendChild(isHeader);

  // "OUGHT" zone header
  const oughtHeader = svgEl('text', {
    x: oughtX + (W - oughtX - 30) / 2, y: 28,
    'text-anchor': 'middle',
    fill: 'var(--accent)', 'font-size': '14', 'font-weight': '700',
    'font-family': 'var(--font-ui)',
  });
  oughtHeader.textContent = 'OUGHT (Prescriptive)';
  svg.appendChild(oughtHeader);

  // IS statement boxes
  const boxH = 36;
  const startY = 50;
  const gapBetween = 10;
  const totalIsH = count * boxH + (count - 1) * gapBetween;
  const isStartY = Math.max(startY, (H - totalIsH) / 2);

  statements.forEach((s, i) => {
    const y = isStartY + i * (boxH + gapBetween);
    const rect = svgEl('rect', {
      x: isZoneX, y, width: isZoneW, height: boxH, rx: 8,
      fill: 'var(--surface-2)', stroke: 'var(--green)', 'stroke-width': 2,
    });
    svg.appendChild(rect);

    svgWrappedText(svg, {
      x: isZoneX + isZoneW / 2, y: y + boxH / 2, width: isZoneW - 16,
      text: s.text || `Fact ${i + 1}`,
      color: 'var(--text)', fontSize: '11', fontFamily: 'var(--font-mono)',
      rectEl: rect,
    });

    // Arrow from IS box toward the gap
    svg.appendChild(svgEl('line', {
      x1: isZoneX + isZoneW, y1: y + boxH / 2,
      x2: gapX - 4, y2: y + boxH / 2,
      stroke: 'var(--green)', 'stroke-width': 1.5,
      'stroke-dasharray': '4,3',
    }));
  });

  // The GAP — Hume's Guillotine
  // Jagged/lightning bolt line to show the logical gap
  const guillotineX = gapX + gapW / 2;
  const zigPoints = [];
  const zigStep = 12;
  const zigAmp = 10;
  for (let y = 40; y <= H - 20; y += zigStep) {
    const xOff = (Math.floor((y - 40) / zigStep) % 2 === 0) ? -zigAmp : zigAmp;
    zigPoints.push(`${guillotineX + xOff},${y}`);
  }
  svg.appendChild(svgEl('polyline', {
    points: zigPoints.join(' '),
    fill: 'none',
    stroke: 'var(--red)',
    'stroke-width': 2.5,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  }));

  // Gap label
  const gapLabel = svgEl('text', {
    x: guillotineX, y: H - 8,
    'text-anchor': 'middle',
    fill: 'var(--red)', 'font-size': '10', 'font-weight': '700',
    'font-family': 'var(--font-ui)',
  });
  gapLabel.textContent = "Hume's Guillotine";
  svg.appendChild(gapLabel);

  // OUGHT box on the right
  const oughtBoxW = W - oughtX - 30;
  const oughtBoxH = 50;
  const oughtBoxY = (H - oughtBoxH) / 2;

  const oughtRect = svgEl('rect', {
    x: oughtX, y: oughtBoxY, width: oughtBoxW, height: oughtBoxH, rx: 8,
    fill: 'var(--surface-2)', stroke: 'var(--accent)', 'stroke-width': 2,
  });
  svg.appendChild(oughtRect);

  svgWrappedText(svg, {
    x: oughtX + oughtBoxW / 2, y: oughtBoxY + oughtBoxH / 2, width: oughtBoxW - 16,
    text: state.ought || 'We ought to…',
    color: 'var(--text)', fontSize: '12', fontWeight: '600', fontFamily: 'var(--font-mono)',
    rectEl: oughtRect,
  });

  // Dashed arrow from gap to ought (showing the questionable leap)
  const defs = svgEl('defs', {});
  const marker = svgEl('marker', {
    id: 'ought-arrow', markerWidth: 10, markerHeight: 7,
    refX: 10, refY: 3.5, orient: 'auto',
  });
  marker.appendChild(svgEl('polygon', {
    points: '0 0, 10 3.5, 0 7',
    fill: 'var(--red)',
  }));
  defs.appendChild(marker);
  svg.appendChild(defs);

  svg.appendChild(svgEl('line', {
    x1: gapX + gapW, y1: oughtBoxY + oughtBoxH / 2,
    x2: oughtX, y2: oughtBoxY + oughtBoxH / 2,
    stroke: 'var(--red)', 'stroke-width': 2,
    'stroke-dasharray': '6,4',
    'marker-end': 'url(#ought-arrow)',
  }));

  // Question mark over the dashed arrow
  const qMark = svgEl('text', {
    x: (gapX + gapW + oughtX) / 2, y: oughtBoxY + oughtBoxH / 2 - 12,
    'text-anchor': 'middle',
    fill: 'var(--red)', 'font-size': '18', 'font-weight': '700',
    'font-family': 'var(--font-ui)',
  });
  qMark.textContent = '?';
  svg.appendChild(qMark);
}

// ── Editor Registry ────────────────────────────────────────────────────────

const editors = {
  'venn': createVennEditor,
  'argument-map': createArgumentMapEditor,
  'timeline': createTimelineEditor,
  'comparison': createComparisonEditor,
  'flowchart': createFlowchartEditor,
  'strength': createStrengthEditor,
  'circular': createCircularEditor,
  'is-ought': createIsOughtEditor,
};

// ── Public API ─────────────────────────────────────────────────────────────

export function createVisualsPanel() {
  const panel = document.createElement('div');
  panel.className = 'visuals-panel';
  panel.id = 'visuals-panel';

  // Diagram type selector
  const selector = document.createElement('div');
  selector.className = 'diagram-selector';

  // Editor mount point
  const editorMount = document.createElement('div');
  editorMount.className = 'editor-mount';
  editorMount.id = 'editor-mount';

  DIAGRAM_TYPES.forEach((dt, i) => {
    const btn = document.createElement('button');
    btn.className = `diagram-btn${i === 0 ? ' active' : ''}`;
    btn.dataset.diagramType = dt.id;
    btn.textContent = dt.label;
    btn.addEventListener('click', () => {
      selector.querySelectorAll('.diagram-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      editorMount.innerHTML = '';
      editors[dt.id](editorMount);
    });
    selector.appendChild(btn);
  });

  panel.append(selector, editorMount);

  // Load default editor
  editors[DIAGRAM_TYPES[0].id](editorMount);

  return panel;
}

export function resetVisualsState() {
  for (const key of Object.keys(savedStates)) {
    delete savedStates[key];
  }
}

export { DIAGRAM_TYPES };
