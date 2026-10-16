'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// Helpers de dibujo para las skins. (px, py) es la esquina en píxeles.
function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

// Skins visuales. colors: índice 0 = null, 1–7 = I O T S Z J L (mismo índice
// que PIECES y board). boardBg: null = usa el fondo CSS del tema. grid: null =
// usa --grid del tema. drawBlock dibuja un bloque ya con globalAlpha aplicado.
const SKINS = {
  retro: {
    name: 'Retro',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#8fb4f5', '#ffb74d'],
    boardBg: null,
    grid: null,
    drawBlock(context, px, py, size, color) {
      context.fillStyle = color;
      context.fillRect(px + 1, py + 1, size - 2, size - 2);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px + 1, py + 1, size - 2, 4);
    },
  },
  neon: {
    name: 'Neon',
    colors: [null, '#00f0ff', '#fff200', '#d400ff', '#39ff14', '#ff1744', '#2979ff', '#ff9100'],
    boardBg: '#000000',
    grid: '#101018',
    drawBlock(context, px, py, size, color) {
      context.shadowColor = color;
      context.shadowBlur = size * 0.5;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(px + 3, py + 3, size - 6, size - 6);
      context.fillStyle = color;
      context.globalAlpha *= 0.35;
      context.fillRect(px + 4, py + 4, size - 8, size - 8);
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
    },
  },
  pastel: {
    name: 'Pastel',
    colors: [null, '#a8e6ef', '#fff1a8', '#d9b8e8', '#b9e4c9', '#f7b6b6', '#b8cff7', '#ffd5a8'],
    boardBg: null,
    grid: null,
    drawBlock(context, px, py, size, color) {
      const r = size * 0.25;
      roundRectPath(context, px + 2, py + 2, size - 4, size - 4, r);
      context.fillStyle = color;
      context.fill();
      context.strokeStyle = 'rgba(0,0,0,0.12)';
      context.lineWidth = 1;
      context.stroke();
      roundRectPath(context, px + 5, py + 4, size - 10, size * 0.3, r * 0.6);
      context.fillStyle = 'rgba(255,255,255,0.35)';
      context.fill();
    },
  },
  pixel: {
    name: 'Pixel art',
    colors: [null, '#1fb5c9', '#e8c02a', '#9446b0', '#4caf50', '#d84343', '#3f6fd8', '#ef8a1f'],
    boardBg: null,
    grid: null,
    drawBlock(context, px, py, size, color) {
      const p = Math.max(2, Math.floor(size / 10)); // tamaño de "pixel"
      context.fillStyle = color;
      context.fillRect(px, py, size, size);
      // bisel: claro arriba/izquierda, oscuro abajo/derecha
      context.fillStyle = 'rgba(255,255,255,0.45)';
      context.fillRect(px, py, size - p, p);
      context.fillRect(px, py, p, size - p);
      context.fillStyle = 'rgba(0,0,0,0.4)';
      context.fillRect(px + p, py + size - p, size - p, p);
      context.fillRect(px + size - p, py + p, p, size - p);
      // textura: patrón de puntos en damero dentro del bloque
      context.fillStyle = 'rgba(0,0,0,0.18)';
      for (let yy = 2 * p; yy < size - 2 * p; yy += 2 * p)
        for (let xx = 2 * p + ((yy / (2 * p)) % 2) * p; xx < size - 2 * p; xx += 2 * p)
          context.fillRect(px + xx, py + yy, p, p);
      // brillo de esquina
      context.fillStyle = 'rgba(255,255,255,0.6)';
      context.fillRect(px + p, py + p, p, p);
    },
  },
};
const DEFAULT_SKIN = 'retro';

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
const pauseMenu = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const menuRestartBtn = document.getElementById('menu-restart-btn');
const controlsBtn = document.getElementById('controls-btn');
const menuControls = document.getElementById('menu-controls');
const startLevelSel = document.getElementById('start-level');
const START_LEVEL_KEY = 'tetris-start-level';
const MAX_START_LEVEL = 10;
let gridColor = '#22222e';
const skinSelect = document.getElementById('skin-select');
const SKIN_KEY = 'tetris-skin';
let skin = SKINS[DEFAULT_SKIN];

let board, current, next, holdType, holdUsed, score, lines, level, startLevel = 1, gameStartLevel, paused, gameOver, lastTime, dropAccum, dropInterval, animId, started = false, combo, maxCombo, pendingRecord;
// heldKeys: teclas pulsadas ahora mismo; blockedKeys: teclas ya pulsadas al cerrar el menú,
// ignoradas hasta su keyup para evitar movimientos accidentales al reanudar.
const heldKeys = new Set();
let blockedKeys = new Set();

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
    level = Math.max(gameStartLevel, Math.floor(lines / 10) + 1);
    dropInterval = speedFor(level);
    updateHUD();
  }
}

function speedFor(lv) {
  return Math.max(100, 1000 - (lv - 1) * 90);
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
  context.save();
  context.globalAlpha = alpha ?? 1;
  skin.drawBlock(context, x * size, y * size, size, skin.colors[colorIndex]);
  context.restore(); // restablece alpha, sombras y trazos de la skin
}

// Pinta el fondo propio de la skin (si lo tiene) tras limpiar el canvas.
function fillSkinBg(context) {
  if (!skin.boardBg) return;
  context.fillStyle = skin.boardBg;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
}

function drawGrid() {
  ctx.strokeStyle = skin.grid || gridColor;
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
  fillSkinBg(ctx);
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
  fillSkinBg(context);
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
  overlay.classList.toggle('is-paused', mode === 'pausa');
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
    closeMenu();
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    setControlsVisible(false);
    showOverlay('pausa');
    resumeBtn.focus();
  }
}

// Oculta el overlay, quita el foco de sus controles y bloquea las teclas aún pulsadas.
function closeMenu() {
  overlay.classList.add('hidden');
  overlay.classList.remove('is-paused');
  if (overlay.contains(document.activeElement)) document.activeElement.blur();
  blockedKeys = new Set(heldKeys);
}

function setControlsVisible(show) {
  menuControls.classList.toggle('hidden', !show);
  controlsBtn.setAttribute('aria-expanded', String(show));
  controlsBtn.textContent = show ? 'Ocultar controles' : 'Ver controles';
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
  gameStartLevel = startLevel; // fijo durante la partida; cambiar el selector afecta a la siguiente
  level = gameStartLevel;
  paused = false;
  gameOver = false;
  dropInterval = speedFor(level);
  dropAccum = 0;
  holdType = null;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  closeMenu();
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  // Si el selector de skin conserva el foco (p. ej. se cerró sin cambiar), las
  // teclas de juego no deben cambiar la skin: se le quita el foco y van al juego.
  if (!paused && e.target === skinSelect && (e.code.startsWith('Arrow') || e.code === 'Space')) {
    e.preventDefault();
    skinSelect.blur();
  }
  heldKeys.add(e.code);
  // sin teclas de juego en la pantalla de inicio ni mientras se escribe el nombre
  if (!started || e.target instanceof HTMLInputElement) return;
  if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault();
    if (!e.repeat) togglePause();
    return;
  }
  if (paused) {
    // Menú abierto: las flechas no deben desplazar la página (salvo en el selector).
    if (e.code.startsWith('Arrow') && e.target.tagName !== 'SELECT') e.preventDefault();
    return;
  }
  if (gameOver || blockedKeys.has(e.code)) return;
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

document.addEventListener('keyup', e => {
  heldKeys.delete(e.code);
  blockedKeys.delete(e.code);
});

window.addEventListener('blur', () => {
  heldKeys.clear();
  blockedKeys.clear();
});

restartBtn.addEventListener('click', init);
recordSave.addEventListener('click', saveRecord);
recordName.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); saveRecord(); }
});
resetRecordsBtn.addEventListener('click', resetRecords);

menuRestartBtn.addEventListener('click', init);
resumeBtn.addEventListener('click', () => { if (paused) togglePause(); });
controlsBtn.addEventListener('click', () => {
  setControlsVisible(menuControls.classList.contains('hidden'));
});

function parseStartLevel(value) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n >= 1 && n <= MAX_START_LEVEL ? n : 1;
}

startLevelSel.addEventListener('change', () => {
  startLevel = parseStartLevel(startLevelSel.value);
  try { localStorage.setItem(START_LEVEL_KEY, String(startLevel)); } catch (e) { /* localStorage no disponible */ }
});

for (let lv = 1; lv <= MAX_START_LEVEL; lv++) startLevelSel.add(new Option(String(lv), String(lv)));
try { startLevel = parseStartLevel(localStorage.getItem(START_LEVEL_KEY)); } catch (e) { startLevel = 1; }
startLevelSel.value = String(startLevel);

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

// Cambia la skin activa y redibuja todo (también en pausa / game over).
function applySkin(name) {
  if (!Object.prototype.hasOwnProperty.call(SKINS, name)) name = DEFAULT_SKIN;
  skin = SKINS[name];
  document.documentElement.dataset.skin = name;
  skinSelect.value = name;
  if (current) {
    draw();
    drawNext();
    drawHold();
  }
}

for (const [key, s] of Object.entries(SKINS)) skinSelect.add(new Option(s.name, key));

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
  try { localStorage.setItem(SKIN_KEY, skinSelect.value); } catch (e) { /* localStorage no disponible */ }
  skinSelect.blur(); // devuelve las flechas / Space al juego
});

let savedSkin = null;
try { savedSkin = localStorage.getItem(SKIN_KEY); } catch (e) { /* ignorar */ }
applySkin(savedSkin);


// Al cargar no arranca la partida: se muestra la pantalla de inicio con los records.
showStart();
