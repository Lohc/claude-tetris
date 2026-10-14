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

- `index.html`: canvas `#board` (300×600), canvas `#next-canvas`, HUD (`#score`, `#lines`, `#level`) y un único `#overlay` reutilizado para PAUSA y GAME OVER (alternado con la clase `hidden`).
- `game.js`: toda la lógica, script clásico con `'use strict'` (no módulo). Estado global mutable en una sola línea `let board, current, next, score, ...`; `init()` lo reinicia todo y también es el handler del botón de reinicio.
- `style.css`: tema oscuro; solo presentación.

Invariantes clave en `game.js`:

- `board` es `ROWS × COLS`; cada celda es `0` o un índice de color 1–7. Ese mismo índice indexa `COLORS` y es el valor dentro de las matrices de `PIECES` (`PIECES[0]`/`COLORS[0]` son `null`).
- Toda validación de posición pasa por `collide(shape, ox, oy)`; movimiento, rotación (`tryRotate` con kicks ±1/±2), ghost y drops la reutilizan.
- Fijar pieza siempre va por `lockPiece()` → `merge()` → `clearLines()` → `spawn()`. `spawn()` detecta game over si la nueva pieza colisiona al aparecer.
- Nivel y velocidad se recalculan solo en `clearLines()`: `level = floor(lines/10)+1`, `dropInterval = max(100, 1000 − (level−1)·90)`.
- El loop (`requestAnimationFrame`) guarda el id en `animId`; pausa y game over lo cancelan, reanudar reinicia `lastTime` para evitar un salto de `dt`.
- Cambiar `COLS`/`ROWS`/`BLOCK` exige ajustar `width`/`height` del `<canvas id="board">` en `index.html`.
