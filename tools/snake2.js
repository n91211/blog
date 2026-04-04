/* ============================================================
   snake2.js — Two-player Snake game (Snake2)
   P1: W/A/S/D  |  P2: Arrow keys or O/K/L/;
   Pixel-dot art, site-theme colours, no D-pad on PC.
   ============================================================ */

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const COLS    = 20;
  const ROWS    = 20;
  const INIT_MS = 200;   // initial tick interval (ms)
  const MIN_MS  = 133;   // speed cap: ~1.5× faster
  const MS_STEP = 3;     // ms reduction per food eaten
  const LS_KEY  = 'snake2-highscore';
  const GAP     = 2;     // px gap between cells for dot-art look

  // Touch device detection (used for layout & controls)
  const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;

  // ── Site-theme colour palette ──────────────────────────────
  function palette() {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      bg:        dark ? '#0e0e0e' : '#e8e2d0',
      cell:      dark ? '#1a1a18' : '#d4cfbe',  // subtle grid cell bg
      dot:       dark ? '#252520' : '#c8c3b0',  // corner dots
      text:      dark ? '#d8d4c0' : '#2a2724',
      muted:     '#888070',
      p1:        '#44cc99',   // teal
      p1h:       '#22aa77',   // head (darker)
      p2:        '#ee8844',   // orange
      p2h:       '#cc6622',   // head (darker)
      food:      '#dd4444',
      foodShine: '#ff7777',
      overlay:   dark ? 'rgba(14,14,14,0.80)' : 'rgba(232,226,208,0.85)',
    };
  }

  // ── State ──────────────────────────────────────────────────
  let cellSize, canvas, ctx;
  let p1, p2, food;
  let intervalMs, timer;
  let score, highScore;
  let gameState;  // 'ready' | 'running' | 'over'
  let container;
  let initialized = false;

  // ── ToolRegistry entry ────────────────────────────────────
  window.ToolRegistry = window.ToolRegistry || {};
  window.ToolRegistry['snake'] = {
    init(el) {
      container = el;

      // Reset tool-ui defaults so game can control layout
      el.style.cssText += ';flex-direction:column;align-items:stretch;'
        + 'justify-content:flex-start;padding:0;min-height:auto;';

      highScore = parseInt(localStorage.getItem(LS_KEY) || '0', 10);

      buildDOM(el);
      calcSize();
      resetGame();
      drawFrame();

      if (!initialized) {
        window.addEventListener('resize', onResize);
        document.addEventListener('keydown', onKey);
        initialized = true;
      }
    },
  };

  // ── DOM construction ──────────────────────────────────────
  function buildDOM(el) {
    const wrap = document.createElement('div');
    wrap.className = IS_TOUCH ? 'snake2-wrap snake2-touch' : 'snake2-wrap snake2-pc';

    const canvasArea = document.createElement('div');
    canvasArea.className = 'snake2-canvas-area';

    canvas = document.createElement('canvas');
    canvas.addEventListener('click', onCanvasClick);
    canvasArea.appendChild(canvas);
    ctx = canvas.getContext('2d');

    if (IS_TOUCH) {
      // Mobile: orientation-responsive — CSS handles row/column switch
      wrap.appendChild(makeDpad('P1', 'p1', handleP1));
      wrap.appendChild(canvasArea);
      wrap.appendChild(makeDpad('P2', 'p2', handleP2));

      // Lock viewport: prevent page scroll/zoom while touching the game
      wrap.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    } else {
      // PC: canvas only
      wrap.appendChild(canvasArea);
    }

    el.appendChild(wrap);
  }

  // D-pad: numpad layout  . ↑ .  /  ← . →  /  . ↓ .
  function makeDpad(label, playerClass, handler) {
    const pad = document.createElement('div');
    pad.className = `snake2-dpad snake2-dpad-${playerClass}`;

    const title = document.createElement('span');
    title.className = 'snake2-dpad-label';
    title.textContent = label;
    pad.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'snake2-dpad-grid';

    [
      { cls: 'dpad-up',    ch: '▲', dx:  0, dy: -1 },
      { cls: 'dpad-left',  ch: '◀', dx: -1, dy:  0 },
      { cls: 'dpad-right', ch: '▶', dx:  1, dy:  0 },
      { cls: 'dpad-down',  ch: '▼', dx:  0, dy:  1 },
    ].forEach(({ cls, ch, dx, dy }) => {
      const btn = document.createElement('button');
      btn.className = `snake2-btn ${cls}`;
      btn.textContent = ch;
      btn.setAttribute('aria-label', cls.replace('dpad-', ''));
      btn.setAttribute('tabindex', '-1');
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        handler(dx, dy);
      }, { passive: false });
      btn.addEventListener('mousedown', () => handler(dx, dy));
      grid.appendChild(btn);
    });

    pad.appendChild(grid);
    return pad;
  }

  // ── Canvas sizing ─────────────────────────────────────────
  // D-pad dimensions for each orientation
  // Numpad grid: 3×3 cells of 40px + 2×4px gaps = 128px; + label 20px + padding 12px ≈ 160px tall / 136px wide
  const DPAD_STACKED_H  = 160;  // portrait: dpad above/below canvas
  const DPAD_SIDE_W     = 144;  // landscape: dpad left/right of canvas

  function calcSize() {
    let avail;

    if (IS_TOUCH) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isLandscape = vw > vh;

      if (isLandscape) {
        // Side-by-side: canvas is height-constrained, flanked by dpads
        const canvasW = vw - DPAD_SIDE_W * 2 - 16;
        const canvasH = vh - 8;
        avail = Math.min(canvasW, canvasH);
      } else {
        // Stacked: canvas is below/above dpads, width-constrained
        const canvasH = vh - DPAD_STACKED_H * 2 - 8;
        const canvasW = vw - 8;
        avail = Math.min(canvasW, canvasH);
      }
      avail = Math.max(160, avail);
    } else {
      // PC: fill tool-ui container (minus small padding)
      const cw  = container.getBoundingClientRect().width || 560;
      const maxH = Math.min(window.innerHeight * 0.72, 540);
      avail = Math.min(cw - 16, maxH);
    }

    cellSize = Math.max(8, Math.floor(avail / COLS));
    canvas.width  = cellSize * COLS;
    canvas.height = cellSize * ROWS;
  }

  function onResize() { calcSize(); drawFrame(); }

  // ── Game reset ────────────────────────────────────────────
  function resetGame() {
    score      = 0;
    intervalMs = INIT_MS;
    gameState  = 'ready';

    p1 = {
      body:  [{ x: 4, y: 10 }, { x: 3, y: 10 }, { x: 2, y: 10 }],
      dir:   { x: 1, y: 0 },
      next:  { x: 1, y: 0 },
      alive: true,
    };
    p2 = {
      body:  [{ x: 15, y: 10 }, { x: 16, y: 10 }, { x: 17, y: 10 }],
      dir:   { x: -1, y: 0 },
      next:  { x: -1, y: 0 },
      alive: true,
    };

    spawnFood();
    stopTimer();
  }

  function spawnFood() {
    const occ = new Set([...p1.body, ...p2.body].map(c => `${c.x},${c.y}`));
    let x, y, tries = 0;
    do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
    } while (occ.has(`${x},${y}`) && ++tries < 400);
    if (tries >= 400) return;  // grid full — skip food placement
    food = { x, y };
  }

  // ── Game loop ─────────────────────────────────────────────
  function startGame() {
    gameState = 'running';
    stopTimer();
    timer = setInterval(tick, intervalMs);
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function tick() {
    move(p1);
    move(p2);
    checkCollisions();
    if (gameState === 'running') drawFrame();
  }

  function move(snake) {
    if (!snake.alive) return;
    snake.dir = snake.next;
    const h = snake.body[0];
    snake.body.unshift({ x: h.x + snake.dir.x, y: h.y + snake.dir.y });
    if (snake.body[0].x === food.x && snake.body[0].y === food.y) {
      score++;
      spawnFood();
      speedUp();
    } else {
      snake.body.pop();
    }
  }

  function speedUp() {
    intervalMs = Math.max(MIN_MS, intervalMs - MS_STEP);
    stopTimer();
    if (gameState === 'running') timer = setInterval(tick, intervalMs);
  }

  function checkCollisions() {
    kill(p1, p2);
    kill(p2, p1);
    if (!p1.alive || !p2.alive) {
      gameState = 'over';
      stopTimer();
      if (score > highScore) {
        highScore = score;
        localStorage.setItem(LS_KEY, String(highScore));
      }
      drawFrame();
    }
  }

  function kill(snake, other) {
    if (!snake.alive) return;
    const { x, y } = snake.body[0];
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) { snake.alive = false; return; }
    for (let i = 1; i < snake.body.length; i++) {
      if (x === snake.body[i].x && y === snake.body[i].y) { snake.alive = false; return; }
    }
    for (const seg of other.body) {
      if (x === seg.x && y === seg.y) { snake.alive = false; return; }
    }
  }

  // ── Input ─────────────────────────────────────────────────
  function isActive() { return canvas && document.body.contains(canvas); }

  // Reject only exact reversal of currently moving direction
  function setDir1(dx, dy) {
    if (dx !== -p1.dir.x || dy !== -p1.dir.y) p1.next = { x: dx, y: dy };
  }
  function setDir2(dx, dy) {
    if (dx !== -p2.dir.x || dy !== -p2.dir.y) p2.next = { x: dx, y: dy };
  }

  function tryStart(wasOver) {
    if (wasOver) { resetGame(); drawFrame(); }
    startGame();
  }

  function onKey(e) {
    if (!isActive()) return;
    const k      = e.key;
    const wasOver = gameState === 'over';
    const idle   = gameState === 'ready' || wasOver;

    if (idle) {
      const valid = ['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','o','k','l',';'];
      if (valid.includes(k)) tryStart(wasOver);
      else return;
    }

    if      (k === 'w') { setDir1( 0,-1); e.preventDefault(); }
    else if (k === 's') { setDir1( 0, 1); e.preventDefault(); }
    else if (k === 'a') { setDir1(-1, 0); e.preventDefault(); }
    else if (k === 'd') { setDir1( 1, 0); e.preventDefault(); }

    if      (k === 'ArrowUp')    { setDir2( 0,-1); e.preventDefault(); }
    else if (k === 'ArrowDown')  { setDir2( 0, 1); e.preventDefault(); }
    else if (k === 'ArrowLeft')  { setDir2(-1, 0); e.preventDefault(); }
    else if (k === 'ArrowRight') { setDir2( 1, 0); e.preventDefault(); }

    // O=up K=left L=down ;=right  (WASD analog for right hand)
    if      (k === 'o') { setDir2( 0,-1); e.preventDefault(); }
    else if (k === 'l') { setDir2( 0, 1); e.preventDefault(); }
    else if (k === 'k') { setDir2(-1, 0); e.preventDefault(); }
    else if (k === ';') { setDir2( 1, 0); e.preventDefault(); }
  }

  function handleP1(dx, dy) {
    if (!isActive()) return;
    if (gameState !== 'running') tryStart(gameState === 'over');
    setDir1(dx, dy);
  }
  function handleP2(dx, dy) {
    if (!isActive()) return;
    if (gameState !== 'running') tryStart(gameState === 'over');
    setDir2(dx, dy);
  }

  function onCanvasClick() {
    if (gameState === 'ready') startGame();
    else if (gameState === 'over') { resetGame(); drawFrame(); }
  }

  // ── Rendering ─────────────────────────────────────────────
  // Pixel-perfect coordinate helper
  function r(n) { return Math.round(n); }

  // Cell rectangle (with GAP inset for dot-art look)
  function cr(gx, gy) {
    return {
      x: gx * cellSize + GAP,
      y: gy * cellSize + GAP,
      w: cellSize - GAP * 2,
      h: cellSize - GAP * 2,
    };
  }

  function drawFrame() {
    const pal = palette();
    const W   = canvas.width;
    const H   = canvas.height;
    const cs  = cellSize;

    // ── Background: draw each cell as a faint dot-grid ─────
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = pal.cell;
    for (let gx = 0; gx < COLS; gx++) {
      for (let gy = 0; gy < ROWS; gy++) {
        const { x, y, w, h } = cr(gx, gy);
        ctx.fillRect(r(x), r(y), r(w), r(h));
      }
    }

    // ── Food ───────────────────────────────────────────────
    drawFood(pal);

    // ── Snakes ─────────────────────────────────────────────
    drawSnake(p1, pal.p1, pal.p1h, pal);
    drawSnake(p2, pal.p2, pal.p2h, pal);

    // ── HUD ────────────────────────────────────────────────
    drawHUD(pal, W, H);

    // ── Overlays ───────────────────────────────────────────
    if (gameState === 'ready') drawReadyOverlay(pal, W, H);
    if (gameState === 'over')  drawGameOverOverlay(pal, W, H);
  }

  // Draw snake body using pixel-rectangle segments
  function drawSnake(snake, bodyCol, headCol, pal) {
    if (!snake.body.length) return;

    // Body segments (tail → neck)
    ctx.fillStyle = bodyCol;
    for (let i = snake.body.length - 1; i >= 1; i--) {
      const { x, y, w, h } = cr(snake.body[i].x, snake.body[i].y);
      ctx.fillRect(r(x), r(y), r(w), r(h));
      // Bridge the gap to the next segment
      bridgeGap(snake.body[i], snake.body[i - 1], bodyCol);
    }

    // Bridge head → neck
    if (snake.body.length > 1) {
      bridgeGap(snake.body[0], snake.body[1], bodyCol);
    }

    // Head cell
    const { x: hx, y: hy, w: hw, h: hh } = cr(snake.body[0].x, snake.body[0].y);
    ctx.fillStyle = headCol;
    ctx.fillRect(r(hx), r(hy), r(hw), r(hh));

    // Pixel eyes
    drawEyes(hx, hy, hw, hh, snake.dir);

    // Dead overlay
    if (!snake.alive) {
      ctx.fillStyle = pal.overlay;
      snake.body.forEach(seg => {
        const c = cr(seg.x, seg.y);
        ctx.fillRect(r(c.x), r(c.y), r(c.w), r(c.h));
      });
    }
  }

  // Fill the GAP-wide strip between two adjacent grid cells
  function bridgeGap(a, b, col) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return; // only adjacent cells

    const { x, y, w, h } = cr(a.x, a.y);
    ctx.fillStyle = col;

    if (dx === 1)       ctx.fillRect(r(x + w),       r(y), GAP * 2, r(h));
    else if (dx === -1) ctx.fillRect(r(x - GAP * 2), r(y), GAP * 2, r(h));
    if (dy === 1)       ctx.fillRect(r(x), r(y + h),       r(w), GAP * 2);
    else if (dy === -1) ctx.fillRect(r(x), r(y - GAP * 2), r(w), GAP * 2);
  }

  function drawEyes(hx, hy, hw, hh, dir) {
    const es = Math.max(2, Math.floor(cellSize / 7));  // eye square size
    const q  = Math.floor(hw / 4);

    let e1x, e1y, e2x, e2y;

    if (dir.x === 1) {         // right
      e1x = hx + hw - es - 1; e1y = hy + q;
      e2x = hx + hw - es - 1; e2y = hy + hh - q - es;
    } else if (dir.x === -1) { // left
      e1x = hx + 1;           e1y = hy + q;
      e2x = hx + 1;           e2y = hy + hh - q - es;
    } else if (dir.y === -1) { // up
      e1x = hx + q;           e1y = hy + 1;
      e2x = hx + hw - q - es; e2y = hy + 1;
    } else {                   // down
      e1x = hx + q;           e1y = hy + hh - es - 1;
      e2x = hx + hw - q - es; e2y = hy + hh - es - 1;
    }

    // White sclera
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(r(e1x), r(e1y), es, es);
    ctx.fillRect(r(e2x), r(e2y), es, es);

    // Dark pupil (offset towards movement direction)
    const ps = Math.max(1, es - 1);
    ctx.fillStyle = '#111111';
    ctx.fillRect(r(e1x + dir.x), r(e1y + dir.y), ps, ps);
    ctx.fillRect(r(e2x + dir.x), r(e2y + dir.y), ps, ps);
  }

  function drawFood(pal) {
    const cs = cellSize;
    const s  = Math.max(4, Math.floor(cs * 0.5));
    const ox = r(food.x * cs + Math.floor((cs - s) / 2));
    const oy = r(food.y * cs + Math.floor((cs - s) / 2));

    // Main square dot
    ctx.fillStyle = pal.food;
    ctx.fillRect(ox, oy, s, s);

    // Shine pixel (top-left corner)
    if (s >= 6) {
      ctx.fillStyle = pal.foodShine;
      const shine = Math.max(1, Math.floor(s / 4));
      ctx.fillRect(ox + 1, oy + 1, shine, shine);
    }

    // Shadow pixel (bottom-right corner)
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const sh = Math.max(1, Math.floor(s / 3));
    ctx.fillRect(ox + s - sh, oy + s - sh, sh, sh);
  }

  function drawHUD(pal, W, H) {
    const fs = Math.max(8, Math.floor(cellSize * 0.65));
    ctx.font         = `${fs}px 'Neo둥근모', monospace`;
    ctx.textBaseline = 'top';

    // Score (top-left)
    ctx.fillStyle = pal.muted;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${score}`, 4, 4);

    // Best (top-right)
    ctx.textAlign = 'right';
    ctx.fillText(`BEST ${highScore}`, W - 4, 4);

    // Player labels (bottom corners)
    ctx.textBaseline = 'bottom';
    ctx.fillStyle    = pal.p1;
    ctx.textAlign    = 'left';
    ctx.fillText('P1', 4, H - 3);

    ctx.fillStyle = pal.p2;
    ctx.textAlign = 'right';
    ctx.fillText('P2', W - 4, H - 3);

    ctx.textBaseline = 'alphabetic';
  }

  function overlayBg(pal, W, H) {
    ctx.fillStyle = pal.overlay;
    ctx.fillRect(0, 0, W, H);
  }

  function drawReadyOverlay(pal, W, H) {
    overlayBg(pal, W, H);
    const fs = Math.max(10, cellSize);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    ctx.font      = `${r(fs * 1.6)}px 'Neo둥근모', monospace`;
    ctx.fillStyle = pal.text;
    ctx.fillText('SNAKE2', W / 2, H / 2 - fs * 1.5);

    ctx.font      = `${r(fs * 0.72)}px 'Neo둥근모', monospace`;
    ctx.fillStyle = pal.muted;

    if (IS_TOUCH) {
      ctx.fillText('D-pad를 눌러 시작', W / 2, H / 2);
    } else {
      ctx.fillText('키를 눌러 시작', W / 2, H / 2 - fs * 0.2);
      ctx.fillStyle = pal.p1;
      ctx.fillText('P1  W A S D', W / 2, H / 2 + fs * 1.0);
      ctx.fillStyle = pal.p2;
      ctx.fillText('P2  방향키  /  O K L ;', W / 2, H / 2 + fs * 1.85);
    }

    ctx.textBaseline = 'alphabetic';
  }

  function drawGameOverOverlay(pal, W, H) {
    overlayBg(pal, W, H);
    const fs = Math.max(10, cellSize);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    ctx.font      = `${r(fs * 1.4)}px 'Neo둥근모', monospace`;
    ctx.fillStyle = pal.food;
    ctx.fillText('GAME OVER', W / 2, H / 2 - fs * 1.3);

    ctx.font      = `${r(fs * 0.78)}px 'Neo둥근모', monospace`;
    ctx.fillStyle = pal.text;
    ctx.fillText(`SCORE  ${score}`, W / 2, H / 2);
    ctx.fillText(`BEST   ${highScore}`, W / 2, H / 2 + fs * 0.95);

    const loser = !p1.alive && !p2.alive ? '동시 충돌'
      : !p1.alive ? 'P1 탈락' : 'P2 탈락';
    ctx.font      = `${r(fs * 0.62)}px 'Neo둥근모', monospace`;
    ctx.fillStyle = pal.muted;
    ctx.fillText(loser, W / 2, H / 2 + fs * 2.1);
    ctx.fillText('키 / D-pad로 재시작', W / 2, H / 2 + fs * 2.95);

    ctx.textBaseline = 'alphabetic';
  }

})();
