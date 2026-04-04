/* ============================================================
   snake2.js — Two-player Snake game (Snake2)
   P1: W/A/S/D  |  P2: Arrow keys or O/K/L/;
   ============================================================ */

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const COLS        = 20;
  const ROWS        = 20;
  const INIT_MS     = 200;   // initial interval (ms)
  const MIN_MS      = 133;   // max speed (200 * 2/3 ≈ 133, ~1.5× faster)
  const MS_STEP     = 3;     // ms reduction per food eaten
  const LS_KEY      = 'snake2-highscore';

  // Player colors (dot art: body color, head color, eye color)
  const P1_COLOR    = '#44ddaa';  // teal-green
  const P1_HEAD     = '#22bb88';
  const P2_COLOR    = '#ff8844';  // orange
  const P2_HEAD     = '#dd5522';
  const FOOD_COLOR  = '#ff4455';
  const FOOD_SHINE  = '#ff99aa';

  // ── State ──────────────────────────────────────────────────
  let cellSize, canvas, ctx, wrap;
  let p1, p2, food;
  let intervalMs, timer;
  let score, highScore;
  let gameState;  // 'ready' | 'running' | 'over'
  let container;
  let initialized = false;  // guard against duplicate event listeners

  // ── Init ───────────────────────────────────────────────────
  window.ToolRegistry = window.ToolRegistry || {};
  window.ToolRegistry['snake'] = {
    init(el) {
      container = el;

      // Override tool-ui default flex centering
      el.style.flexDirection  = 'column';
      el.style.alignItems     = 'stretch';
      el.style.justifyContent = 'flex-start';
      el.style.padding        = '0';
      el.style.minHeight      = 'auto';

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

  // ── DOM construction ───────────────────────────────────────
  function buildDOM(el) {
    // Wrapper: [dpad-p1] [canvas] [dpad-p2]
    wrap = document.createElement('div');
    wrap.className = 'snake2-wrap';

    const p1Dpad = makeDpad('P1', handleP1);
    const p2Dpad = makeDpad('P2', handleP2);

    const canvasArea = document.createElement('div');
    canvasArea.className = 'snake2-canvas-area';

    canvas = document.createElement('canvas');
    canvasArea.appendChild(canvas);
    ctx = canvas.getContext('2d');

    // Desktop: [p1dpad][canvas][p2dpad] in a flex row
    wrap.appendChild(p1Dpad);
    wrap.appendChild(canvasArea);
    wrap.appendChild(p2Dpad);

    // For mobile portrait: move dpads below canvas
    // We duplicate via a row div only visible in column layout
    const dpadRowMobile = document.createElement('div');
    dpadRowMobile.className = 'snake2-dpad-row snake2-mobile-dpad';
    dpadRowMobile.appendChild(makeDpad('P1m', handleP1));
    dpadRowMobile.appendChild(makeDpad('P2m', handleP2));

    el.appendChild(wrap);
    el.appendChild(dpadRowMobile);

    // Show correct dpad layout based on orientation/width
    updateDpadVisibility();

    canvas.addEventListener('click', onCanvasClick);
  }

  function makeDpad(id, handler) {
    const pad = document.createElement('div');
    pad.className = 'snake2-dpad';

    const dirs = [
      { cls: 'dpad-up',    label: '▲', dir: 'up'    },
      { cls: 'dpad-left',  label: '◄', dir: 'left'  },
      { cls: 'dpad-right', label: '►', dir: 'right' },
      { cls: 'dpad-down',  label: '▼', dir: 'down'  },
    ];

    dirs.forEach(({ cls, label, dir }) => {
      const btn = document.createElement('button');
      btn.className = cls;
      btn.textContent = label;
      btn.setAttribute('aria-label', dir);
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        handler(dir);
      }, { passive: false });
      btn.addEventListener('mousedown', () => handler(dir));
      pad.appendChild(btn);
    });

    return pad;
  }

  function updateDpadVisibility() {
    if (!wrap) return;
    const isMobilePortrait = window.innerWidth <= 720 ||
      (window.innerWidth < 900 && window.innerHeight > window.innerWidth);

    const sideDpads  = wrap.querySelectorAll('.snake2-dpad');
    const mobileRow  = container.querySelector('.snake2-mobile-dpad');

    sideDpads.forEach(d => {
      d.style.display = isMobilePortrait ? 'none' : 'grid';
    });
    if (mobileRow) {
      mobileRow.style.display = isMobilePortrait ? 'flex' : 'none';
    }
  }

  // ── Size calculation ───────────────────────────────────────
  function calcSize() {
    // Available width: container width minus side dpads (if visible)
    const isMobile = window.innerWidth <= 720 ||
      (window.innerWidth < 900 && window.innerHeight > window.innerWidth);

    let availW, availH;

    if (isMobile) {
      // Portrait mobile: use most of the viewport width
      availW = Math.min(window.innerWidth - 24, 360);
      availH = availW;
    } else {
      // Desktop / landscape: subtract dpad space (2 × ~160px) from container
      const containerW = container.getBoundingClientRect().width || 600;
      availW = containerW - 160 * 2 - 24;
      availH = Math.min(window.innerHeight * 0.6, 440);
    }

    cellSize = Math.floor(Math.min(availW, availH) / COLS);
    if (cellSize < 10) cellSize = 10;

    canvas.width  = cellSize * COLS;
    canvas.height = cellSize * ROWS;
  }

  function onResize() {
    calcSize();
    updateDpadVisibility();
    drawFrame();
  }

  // ── Game reset ─────────────────────────────────────────────
  function resetGame() {
    score      = 0;
    intervalMs = INIT_MS;
    gameState  = 'ready';

    // P1 starts on left side, heading right
    p1 = {
      body: [
        { x: 4, y: 10 },
        { x: 3, y: 10 },
        { x: 2, y: 10 },
      ],
      dir:  { x: 1, y: 0 },
      next: { x: 1, y: 0 },
      alive: true,
    };

    // P2 starts on right side, heading left
    p2 = {
      body: [
        { x: 15, y: 10 },
        { x: 16, y: 10 },
        { x: 17, y: 10 },
      ],
      dir:  { x: -1, y: 0 },
      next: { x: -1, y: 0 },
      alive: true,
    };

    spawnFood();
    stopTimer();
  }

  function spawnFood() {
    const occupied = new Set();
    [...p1.body, ...p2.body].forEach(c => occupied.add(`${c.x},${c.y}`));

    let x, y;
    do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
    } while (occupied.has(`${x},${y}`));

    food = { x, y };
  }

  // ── Game loop ──────────────────────────────────────────────
  function startGame() {
    gameState = 'running';
    stopTimer();
    timer = setInterval(tick, intervalMs);
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function tick() {
    moveSnake(p1);
    moveSnake(p2);
    checkCollisions();
    if (gameState === 'running') drawFrame();
  }

  function moveSnake(snake) {
    if (!snake.alive) return;

    // Commit queued direction
    snake.dir = snake.next;

    const head = snake.body[0];
    const nx   = head.x + snake.dir.x;
    const ny   = head.y + snake.dir.y;

    snake.body.unshift({ x: nx, y: ny });

    // Check if ate food
    if (nx === food.x && ny === food.y) {
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
    checkSnakeDeath(p1, p2);
    checkSnakeDeath(p2, p1);

    if (!p1.alive || !p2.alive) {
      gameOver();
    }
  }

  function checkSnakeDeath(snake, other) {
    if (!snake.alive) return;
    const head = snake.body[0];

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      snake.alive = false;
      return;
    }

    // Self collision (skip head itself at index 0)
    for (let i = 1; i < snake.body.length; i++) {
      if (head.x === snake.body[i].x && head.y === snake.body[i].y) {
        snake.alive = false;
        return;
      }
    }

    // Other snake collision (full body)
    for (const seg of other.body) {
      if (head.x === seg.x && head.y === seg.y) {
        snake.alive = false;
        return;
      }
    }
  }

  function gameOver() {
    gameState = 'over';
    stopTimer();
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(LS_KEY, String(highScore));
    }
    drawFrame();
  }

  // ── Input ──────────────────────────────────────────────────

  // Check if snake2 canvas is currently visible in the DOM
  function isActive() {
    return canvas && document.body.contains(canvas);
  }

  function setDir1(dx, dy) {
    // Reject if opposite of queued direction (not just current dir)
    if (dx === -p1.next.x && dy === -p1.next.y) return;
    p1.next = { x: dx, y: dy };
  }

  function setDir2(dx, dy) {
    if (dx === -p2.next.x && dy === -p2.next.y) return;
    p2.next = { x: dx, y: dy };
  }

  function tryStart(isOver) {
    if (isOver) { resetGame(); drawFrame(); }
    startGame();
  }

  function onKey(e) {
    if (!isActive()) return;

    const k = e.key;
    const isReady = gameState === 'ready';
    const isOver  = gameState === 'over';

    if (isReady || isOver) {
      const valid = ['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','o','k','l',';'];
      if (valid.includes(k)) { tryStart(isOver); }
      else { return; }
    }

    // P1: WASD
    if      (k === 'w') { setDir1( 0, -1); e.preventDefault(); }
    else if (k === 's') { setDir1( 0,  1); e.preventDefault(); }
    else if (k === 'a') { setDir1(-1,  0); e.preventDefault(); }
    else if (k === 'd') { setDir1( 1,  0); e.preventDefault(); }

    // P2: Arrow keys
    if      (k === 'ArrowUp')    { setDir2( 0, -1); e.preventDefault(); }
    else if (k === 'ArrowDown')  { setDir2( 0,  1); e.preventDefault(); }
    else if (k === 'ArrowLeft')  { setDir2(-1,  0); e.preventDefault(); }
    else if (k === 'ArrowRight') { setDir2( 1,  0); e.preventDefault(); }

    // P2: O(up) K(left) L(down) ;(right)
    if      (k === 'o') { setDir2( 0, -1); e.preventDefault(); }
    else if (k === 'l') { setDir2( 0,  1); e.preventDefault(); }
    else if (k === 'k') { setDir2(-1,  0); e.preventDefault(); }
    else if (k === ';') { setDir2( 1,  0); e.preventDefault(); }
  }

  function handleP1(dir) {
    if (!isActive()) return;
    if (gameState === 'ready' || gameState === 'over') tryStart(gameState === 'over');
    if (dir === 'up')    setDir1( 0, -1);
    if (dir === 'down')  setDir1( 0,  1);
    if (dir === 'left')  setDir1(-1,  0);
    if (dir === 'right') setDir1( 1,  0);
  }

  function handleP2(dir) {
    if (!isActive()) return;
    if (gameState === 'ready' || gameState === 'over') tryStart(gameState === 'over');
    if (dir === 'up')    setDir2( 0, -1);
    if (dir === 'down')  setDir2( 0,  1);
    if (dir === 'left')  setDir2(-1,  0);
    if (dir === 'right') setDir2( 1,  0);
  }

  function onCanvasClick() {
    if (gameState === 'ready') { startGame(); return; }
    if (gameState === 'over')  { resetGame(); drawFrame(); }
  }

  // ── Rendering ──────────────────────────────────────────────
  function drawFrame() {
    const cs = cellSize;
    const W  = canvas.width;
    const H  = canvas.height;

    // Background
    ctx.clearRect(0, 0, W, H);
    drawGrid(W, H, cs);

    // Food
    drawFood(food.x, food.y, cs);

    // Snakes
    drawSnake(p1, P1_COLOR, P1_HEAD, cs);
    drawSnake(p2, P2_COLOR, P2_HEAD, cs);

    // HUD
    drawHUD(W);

    // Overlays
    if (gameState === 'ready') drawReadyOverlay(W, H);
    if (gameState === 'over')  drawGameOverOverlay(W, H);
  }

  function drawGrid(W, H, cs) {
    // Subtle grid dots
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        ctx.beginPath();
        ctx.arc(x * cs + cs / 2, y * cs + cs / 2, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawSnake(snake, bodyColor, headColor, cs) {
    const body = snake.body;
    if (body.length === 0) return;

    const r = cs * 0.38;  // dot radius

    // Draw body segments (back to front, so head is on top)
    for (let i = body.length - 1; i >= 1; i--) {
      const seg  = body[i];
      const next = body[i - 1];

      ctx.fillStyle = bodyColor;

      // Draw a pill connecting this segment to the next
      drawSegmentPill(seg, next, bodyColor, r, cs);
    }

    // Draw each body dot
    for (let i = body.length - 1; i >= 1; i--) {
      const seg = body[i];
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(seg.x * cs + cs / 2, seg.y * cs + cs / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw head
    const head = body[0];
    const hx   = head.x * cs + cs / 2;
    const hy   = head.y * cs + cs / 2;
    const hr   = cs * 0.44;

    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    drawEyes(hx, hy, snake.dir, cs);

    // Dead overlay
    if (!snake.alive) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      body.forEach(seg => {
        ctx.beginPath();
        ctx.arc(seg.x * cs + cs / 2, seg.y * cs + cs / 2, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  function drawSegmentPill(a, b, color, r, cs) {
    // Fill a rectangle between two adjacent segment centers to smooth the body
    const ax = a.x * cs + cs / 2;
    const ay = a.y * cs + cs / 2;
    const bx = b.x * cs + cs / 2;
    const by = b.y * cs + cs / 2;

    ctx.fillStyle = color;
    ctx.beginPath();
    // Rect covering the gap
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    if (dx > dy) {
      // Horizontal
      ctx.rect(Math.min(ax, bx), ay - r, dx, r * 2);
    } else {
      // Vertical
      ctx.rect(ax - r, Math.min(ay, by), r * 2, dy);
    }
    ctx.fill();
  }

  function drawEyes(hx, hy, dir, cs) {
    const er  = cs * 0.10;  // eye radius
    const off = cs * 0.15;  // offset from center

    // Eye positions depend on movement direction
    let ex1, ey1, ex2, ey2;

    if (dir.x === 1) {        // right
      ex1 = hx + off; ey1 = hy - off;
      ex2 = hx + off; ey2 = hy + off;
    } else if (dir.x === -1) { // left
      ex1 = hx - off; ey1 = hy - off;
      ex2 = hx - off; ey2 = hy + off;
    } else if (dir.y === -1) { // up
      ex1 = hx - off; ey1 = hy - off;
      ex2 = hx + off; ey2 = hy - off;
    } else {                   // down
      ex1 = hx - off; ey1 = hy + off;
      ex2 = hx + off; ey2 = hy + off;
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(ex1, ey1, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex2, ey2, er, 0, Math.PI * 2); ctx.fill();

    // Pupils
    ctx.fillStyle = '#222222';
    const pr = er * 0.55;
    ctx.beginPath(); ctx.arc(ex1 + dir.x * er * 0.3, ey1 + dir.y * er * 0.3, pr, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex2 + dir.x * er * 0.3, ey2 + dir.y * er * 0.3, pr, 0, Math.PI * 2); ctx.fill();
  }

  function drawFood(fx, fy, cs) {
    const cx = fx * cs + cs / 2;
    const cy = fy * cs + cs / 2;
    const r  = cs * 0.32;

    // Apple body
    ctx.fillStyle = FOOD_COLOR;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Shine dot
    ctx.fillStyle = FOOD_SHINE;
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Stem
    ctx.strokeStyle = '#228833';
    ctx.lineWidth   = Math.max(1, cs * 0.07);
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.3, cy - r * 1.4);
    ctx.stroke();
  }

  function drawHUD(W) {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const fg     = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)';
    const fs     = Math.max(10, cellSize * 0.6);

    ctx.font      = `bold ${fs}px monospace`;
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${score}`, 6, fs + 2);

    ctx.textAlign = 'right';
    ctx.fillText(`BEST ${highScore}`, W - 6, fs + 2);

    // Player labels
    ctx.font      = `${Math.max(9, fs * 0.8)}px monospace`;
    ctx.fillStyle = P1_COLOR;
    ctx.textAlign = 'left';
    ctx.fillText('P1', 6, canvas.height - 6);

    ctx.fillStyle = P2_COLOR;
    ctx.textAlign = 'right';
    ctx.fillText('P2', W - 6, canvas.height - 6);
  }

  function drawReadyOverlay(W, H) {
    drawOverlayBg(W, H);
    const fs = Math.max(14, cellSize);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    ctx.font      = `bold ${fs * 1.4}px monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SNAKE2', W / 2, H / 2 - fs * 1.2);

    ctx.font      = `${fs * 0.75}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('키를 누르거나 D-pad를 눌러 시작', W / 2, H / 2);

    ctx.font      = `${fs * 0.6}px monospace`;
    ctx.fillStyle = P1_COLOR;
    ctx.fillText('P1: W A S D', W / 2, H / 2 + fs * 1.1);
    ctx.fillStyle = P2_COLOR;
    ctx.fillText('P2: 방향키  또는  O K L ;', W / 2, H / 2 + fs * 1.8);

    ctx.textBaseline = 'alphabetic';
  }

  function drawGameOverOverlay(W, H) {
    drawOverlayBg(W, H);
    const fs = Math.max(14, cellSize);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    ctx.font      = `bold ${fs * 1.4}px monospace`;
    ctx.fillStyle = '#ff4455';
    ctx.fillText('GAME OVER', W / 2, H / 2 - fs * 1.2);

    ctx.font      = `${fs * 0.85}px monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`점수: ${score}`, W / 2, H / 2);
    ctx.fillText(`최고: ${highScore}`, W / 2, H / 2 + fs * 1.0);

    // Loser label
    const loser = !p1.alive && !p2.alive ? '동시 충돌!'
      : !p1.alive ? 'P1 탈락'
      : 'P2 탈락';

    ctx.font      = `${fs * 0.7}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(loser, W / 2, H / 2 + fs * 2.1);

    ctx.font      = `${fs * 0.65}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('키 또는 D-pad를 눌러 재시작', W / 2, H / 2 + fs * 3.1);

    ctx.textBaseline = 'alphabetic';
  }

  function drawOverlayBg(W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 0, W, H);
  }

})();
