'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#8fb4f5', // J - azul pálido
  '#ffb74d', // L - orange
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const recordForm = document.getElementById('record-form');
const recordName = document.getElementById('record-name');
const recordSave = document.getElementById('record-save');
const recordsSection = document.getElementById('records');
const recordsBody = document.getElementById('records-body');
const recordsEmpty = document.getElementById('records-empty');
const recordsStats = document.getElementById('records-stats');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const RECORDS_KEY = 'tetris-records';
const MAX_RECORDS = 5;
const themeBtn = document.getElementById('theme-toggle');
const THEME_KEY = 'tetris-theme';
let gridColor = '#22222e';

let board, current, next, holdType, holdUsed, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, started = false, combo, maxCombo, pendingRecord;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  return createPiece(Math.floor(Math.random() * 7) + 1);
}

function createPiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  // combo: piezas consecutivas que limpian al menos una línea
  combo = cleared ? combo + 1 : 0;
  maxCombo = Math.max(maxCombo, combo);
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

// piece: pieza que entra desde el hold; si se omite, se toma `next`.
function spawn(piece) {
  if (piece) {
    current = piece;
  } else {
    current = next;
    next = randomPiece();
  }
  holdUsed = false;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
  drawHold();
}

// Guarda la pieza actual en el hold (o la intercambia). Una vez por pieza.
function holdPiece() {
  if (holdUsed) return;
  const prev = holdType;
  holdType = current.type;
  spawn(prev ? createPiece(prev) : undefined);
  holdUsed = true;
  drawHold();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawPreview(context, shape, alpha) {
  const NB = 30;
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  if (!shape) return;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(context, offX + c, offY + r, shape[r][c], NB, alpha);
}

function drawNext() {
  drawPreview(nextCtx, next.shape);
}

function drawHold() {
  drawPreview(holdCtx, holdType && PIECES[holdType], holdUsed ? 0.3 : 1);
}

// ---- Records (localStorage) ----
function defaultRecords() {
  return { top: [], bestCombo: 0, maxLines: 0 };
}

function validNum(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
}

// Lee y valida los records; datos corruptos o ausentes → valores por defecto.
function loadRecords() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(RECORDS_KEY)); } catch (e) { /* corrupto o sin acceso */ }
  const rec = defaultRecords();
  if (!data || typeof data !== 'object') return rec;
  if (Array.isArray(data.top)) {
    rec.top = data.top
      .filter(e => e && typeof e.name === 'string' && validNum(e.score) !== null &&
        validNum(e.lines) !== null && validNum(e.level) !== null)
      .map(e => ({ name: e.name.slice(0, 12), score: validNum(e.score), lines: validNum(e.lines), level: validNum(e.level) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RECORDS);
  }
  rec.bestCombo = validNum(data.bestCombo) ?? 0;
  rec.maxLines = validNum(data.maxLines) ?? 0;
  return rec;
}

function saveRecords(rec) {
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(rec)); } catch (e) { /* localStorage no disponible */ }
}

function qualifies(rec, s) {
  return s > 0 && (rec.top.length < MAX_RECORDS || s > rec.top[rec.top.length - 1].score);
}

// Pinta la tabla con nodos DOM (textContent): nunca innerHTML con nombres de usuario.
// highlightIndex: posición de la entrada recién guardada (o -1).
function renderRecords(highlightIndex = -1) {
  const rec = loadRecords();
  recordsBody.replaceChildren();
  rec.top.forEach((e, i) => {
    const tr = document.createElement('tr');
    if (i === highlightIndex) tr.classList.add('highlight');
    for (const v of [i + 1, e.name, e.score.toLocaleString(), e.lines, e.level]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    recordsBody.appendChild(tr);
  });
  recordsEmpty.classList.toggle('hidden', rec.top.length > 0);
  recordsStats.textContent = `Mejor combo: ${rec.bestCombo} · Líneas máx.: ${rec.maxLines}`;
}

function saveRecord() {
  if (!pendingRecord) return;
  const rec = loadRecords();
  const entry = { name: recordName.value.trim().slice(0, 12) || 'Jugador', score, lines, level };
  rec.top.push(entry);
  rec.top.sort((a, b) => b.score - a.score);
  rec.top = rec.top.slice(0, MAX_RECORDS);
  saveRecords(rec);
  pendingRecord = false;
  recordForm.classList.add('hidden');
  recordName.blur();
  renderRecords(rec.top.indexOf(entry));
}

function resetRecords() {
  resetRecordsBtn.blur();
  if (!confirm('¿Borrar todos los records?')) return;
  try { localStorage.removeItem(RECORDS_KEY); } catch (e) { /* ignorar */ }
  renderRecords();
}

// Configura las secciones del overlay según el modo: 'inicio', 'gameover' o 'pausa'.
function showOverlay(mode) {
  const withRecords = mode !== 'pausa';
  recordsSection.classList.toggle('hidden', !withRecords);
  resetRecordsBtn.classList.toggle('hidden', !withRecords);
  restartBtn.classList.toggle('hidden', mode === 'pausa');
  recordForm.classList.toggle('hidden', !(mode === 'gameover' && pendingRecord));
  restartBtn.textContent = mode === 'inicio' ? 'Jugar' : 'Reiniciar';
  if (withRecords) renderRecords();
  overlay.classList.remove('hidden');
}

function showStart() {
  overlayTitle.textContent = 'TETRIS';
  overlayScore.textContent = '';
  showOverlay('inicio');
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  const rec = loadRecords();
  rec.bestCombo = Math.max(rec.bestCombo, maxCombo);
  rec.maxLines = Math.max(rec.maxLines, lines);
  saveRecords(rec);
  pendingRecord = qualifies(rec, score);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()} · Combo máx.: ${maxCombo}`;
  recordName.value = '';
  showOverlay('gameover');
  if (pendingRecord) recordName.focus();
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    showOverlay('pausa');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
      if (gameOver) return;
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  started = true;
  restartBtn.blur(); // evita que Space reactive el botón durante la partida
  board = createBoard();
  combo = 0;
  maxCombo = 0;
  pendingRecord = false;
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  holdType = null;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  // sin teclas de juego en la pantalla de inicio ni mientras se escribe el nombre
  if (!started || e.target instanceof HTMLInputElement) return;
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      holdPiece();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
recordSave.addEventListener('click', saveRecord);
recordName.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); saveRecord(); }
});
resetRecordsBtn.addEventListener('click', resetRecords);

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const light = theme === 'light';
  themeBtn.textContent = light ? '☾ Modo oscuro' : '☀ Modo claro';
  themeBtn.setAttribute('aria-pressed', String(light));
  gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid').trim() || gridColor;
  if (current) draw();
}

themeBtn.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* localStorage no disponible */ }
  themeBtn.blur(); // evita que Space/Enter reactiven el botón durante la partida
});

let savedTheme = null;
try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) { /* ignorar */ }
applyTheme(savedTheme === 'light' ? 'light' : 'dark');

// Al cargar no arranca la partida: se muestra la pantalla de inicio con los records.
showStart();
