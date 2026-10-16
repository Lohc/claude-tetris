# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Tetris en JavaScript vanilla + Canvas 2D. Sin dependencias, sin `package.json`, sin build, sin tests ni linter. El README está en español; mantener ese idioma en textos de UI y documentación.

## Ejecutar

Abrir `index.html` directamente o servir estático:

```bash
python -m http.server 8000   # luego http://localhost:8000
```

La verificación es manual en el navegador.

## Arquitectura

- `index.html`: canvas `#board` (300×600), canvas `#next-canvas`, HUD (`#score`, `#lines`, `#level`) y un único `#overlay` reutilizado para PAUSA y GAME OVER (alternado con la clase `hidden`). En pausa el overlay lleva además la clase `is-paused`, que muestra `#pause-menu` (Reanudar, Reiniciar, Ver controles, `<select id="start-level">`) y oculta `#restart-btn` (solo para GAME OVER).
- `game.js`: toda la lógica, script clásico con `'use strict'` (no módulo). Estado global mutable en una sola línea `let board, current, next, score, ...`; `init()` lo reinicia todo y también es el handler del botón de reinicio.
- `style.css`: tema oscuro; solo presentación.

Invariantes clave en `game.js`:

- `board` es `ROWS × COLS`; cada celda es `0` o un índice de color 1–7. Ese mismo índice indexa `COLORS` y es el valor dentro de las matrices de `PIECES` (`PIECES[0]`/`COLORS[0]` son `null`).
- Toda validación de posición pasa por `collide(shape, ox, oy)`; movimiento, rotación (`tryRotate` con kicks ±1/±2), ghost y drops la reutilizan.
- Fijar pieza siempre va por `lockPiece()` → `merge()` → `clearLines()` → `spawn()`. `spawn()` detecta game over si la nueva pieza colisiona al aparecer.
- Nivel y velocidad: `init()` copia `startLevel` (1–10, persistido en `localStorage` `tetris-start-level`) a `gameStartLevel` y arranca con `level = gameStartLevel`; después solo se recalculan en `clearLines()`: `level = max(gameStartLevel, floor(lines/10)+1)`, `dropInterval = speedFor(level) = max(100, 1000 − (level−1)·90)`.
- El loop (`requestAnimationFrame`) guarda el id en `animId`; pausa y game over lo cancelan, reanudar reinicia `lastTime` para evitar un salto de `dt`.
- Pausa: `P`/`Escape` llaman a `togglePause()` (ignorando `e.repeat`). Con el menú abierto las teclas de juego no se procesan. `closeMenu()` (al reanudar y en `init()`) quita el foco del menú y copia `heldKeys` a `blockedKeys`: esas teclas se ignoran hasta su `keyup`.
- Cambiar `COLS`/`ROWS`/`BLOCK` exige ajustar `width`/`height` del `<canvas id="board">` en `index.html`.
