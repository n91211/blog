/* ============================================================
   work.js — 위래의 누리집 작업 페이지
   ============================================================ */

const TOOLS = [
  {
    id:       'ascii576',
    title:    'ASKII64',
    tagClass: 'tag-ascii',
    tagLabel: '16-bit',
    desc:     '사진을 끌어다 놓으면 아스키 아트를 생성합니다. 1:1 비율은 가로 128자 세로 64줄, 2:3 비율은 가로 128자 세로 96줄, 3:2 비율은 가로 192자 세로 64줄입니다. 가로 글자 수가 픽셀 수의 두 배인 것은 Neo둥근모 기준 종횡비 보정 때문입니다. 해당 아스키 아트는 고정폭 폰트를 필수로 사용해야 하며, <pre> 태그, 코드 블록, 플레인 텍스트 등 공백과 줄바꿈을 유지하는 환경이어야 합니다. 가변폭 폰트 환경(메모장 등)에서는 정상적으로 표시되지 않습니다.',
    script:   'tools/ascii576.js',
  },
];

window.ToolRegistry = window.ToolRegistry || {};

let currentTool = TOOLS[0].id;
const loadedScripts = new Set();

// ── Script loader ─────────────────────────────────────────

function loadToolScript(src, callback) {
  if (loadedScripts.has(src)) {
    callback();
    return;
  }
  const s = document.createElement('script');
  s.src = src;
  s.onload = () => {
    loadedScripts.add(src);
    callback();
  };
  s.onerror = () => {
    const ui = document.getElementById('tool-ui-' + currentTool);
    if (ui) ui.textContent = '도구를 불러오지 못했습니다.';
  };
  document.body.appendChild(s);
}

// ── Tabs ──────────────────────────────────────────────────

function renderToolTabs() {
  const tabsEl    = document.getElementById('toolTabs');
  const contentEl = document.getElementById('toolContent');
  if (!tabsEl || !contentEl) return;

  TOOLS.forEach(tool => {
    const btn = document.createElement('button');
    btn.className = 'tool-tab' + (tool.id === currentTool ? ' active' : '');
    btn.textContent = tool.title;
    btn.addEventListener('click', () => {
      currentTool = tool.id;
      tabsEl.querySelectorAll('.tool-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderToolContent();
    });
    tabsEl.appendChild(btn);
  });

  renderToolContent();
}

// ── Content area ──────────────────────────────────────────

function renderToolContent() {
  const contentEl = document.getElementById('toolContent');
  if (!contentEl) return;

  const tool = TOOLS.find(t => t.id === currentTool);
  if (!tool) return;

  contentEl.innerHTML = '';

  const desc = document.createElement('p');
  desc.className = 'tool-desc';
  desc.textContent = tool.desc;
  contentEl.appendChild(desc);

  const ui = document.createElement('div');
  ui.className = 'tool-ui';
  ui.id = 'tool-ui-' + tool.id;
  contentEl.appendChild(ui);

  if (tool.script) {
    loadToolScript(tool.script, () => {
      const handler = window.ToolRegistry[tool.id];
      if (handler?.init) handler.init(ui);
    });
  }
}

// ── Init ──────────────────────────────────────────────────

renderToolTabs();
