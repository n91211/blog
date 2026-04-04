/* ============================================================
   work.js — 위래의 blog 작업 페이지
   ============================================================ */

const WORK_TABS = ['도구', '오락'];

const WORK_ITEMS = [
  {
    id:       'ascii576',
    tab:      '도구',
    title:    'ASKII64',
    tagClass: 'tag-ascii',
    tagLabel: '16-bit',
    desc:     '사진을 끌어다 놓으면 아스키 아트를 생성합니다. 1:1 비율은 가로 128자 세로 64줄, 2:3 비율은 가로 128자 세로 96줄, 3:2 비율은 가로 192자 세로 64줄입니다. 가로 글자 수가 픽셀 수의 두 배인 것은 Neo둥근모 기준 종횡비 보정 때문입니다. 해당 아스키 아트는 고정폭 폰트를 필수로 사용해야 하며, <pre> 태그, 코드 블록, 플레인 텍스트 등 공백과 줄바꿈을 유지하는 환경이어야 합니다. 가변폭 폰트 환경(메모장 등)에서는 정상적으로 표시되지 않습니다.',
    script:   'tools/ascii576.js',
  },
  {
    id:       'snake',
    tab:      '오락',
    title:    'Snake2',
    tagClass: 'tag-game',
    tagLabel: '2P',
    desc:     '두 마리 뱀을 동시에 조종하는 2인용 스네이크 게임. P1: W/A/S/D, P2: 방향키 또는 O/K/L/;. 모바일 가로모드에서는 화면 좌우 D-pad로 플레이.',
    script:   'tools/snake2.js',
  },
];

window.ToolRegistry = window.ToolRegistry || {};

let currentTab  = WORK_TABS[0];
let currentItem = null;
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
    const ui = document.getElementById('work-ui-' + (currentItem?.id || ''));
    if (ui) ui.textContent = '도구를 불러오지 못했습니다.';
  };
  document.body.appendChild(s);
}

// ── Tabs ──────────────────────────────────────────────────

function renderTabs() {
  const tabsEl = document.getElementById('workTabs');
  if (!tabsEl) return;

  WORK_TABS.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'history-tab' + (tab === currentTab ? ' active' : '');
    btn.textContent = tab;
    btn.addEventListener('click', () => {
      if (currentTab === tab) return;
      currentTab  = tab;
      currentItem = null;
      tabsEl.querySelectorAll('.history-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderList();
      const items = WORK_ITEMS.filter(i => i.tab === currentTab);
      if (items.length > 0) selectItem(items[0]);
      else showEmpty();
    });
    tabsEl.appendChild(btn);
  });
}

// ── List ──────────────────────────────────────────────────

function renderList() {
  const listEl = document.getElementById('workList');
  if (!listEl) return;
  listEl.innerHTML = '';

  const items = WORK_ITEMS.filter(i => i.tab === currentTab);

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'docs-list-empty';
    empty.textContent = '항목이 없습니다.';
    listEl.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'docs-list-item' + (item === currentItem ? ' active' : '');
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    const titleEl = document.createElement('span');
    titleEl.className = 'docs-list-title';
    titleEl.textContent = item.title;

    el.appendChild(titleEl);

    if (item.tagLabel) {
      const tagEl = document.createElement('span');
      tagEl.className = 'docs-list-date';
      tagEl.textContent = item.tagLabel;
      el.appendChild(tagEl);
    }

    el.addEventListener('click', () => selectItem(item));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectItem(item); }
    });

    listEl.appendChild(el);
  });
}

// ── Select & Viewer ───────────────────────────────────────

function selectItem(item) {
  currentItem = item;

  document.querySelectorAll('#workList .docs-list-item').forEach((el, i) => {
    const items = WORK_ITEMS.filter(x => x.tab === currentTab);
    el.classList.toggle('active', items[i] === item);
  });

  renderViewer(item);
}

function showEmpty() {
  const viewerEl = document.getElementById('workViewer');
  if (!viewerEl) return;
  viewerEl.innerHTML = '<div class="docs-viewer-empty">항목이 없습니다.</div>';
}

function renderViewer(item) {
  const viewerEl = document.getElementById('workViewer');
  if (!viewerEl) return;
  viewerEl.innerHTML = '';

  const titleEl = document.createElement('div');
  titleEl.className = 'docs-article-title';
  titleEl.textContent = item.title;
  viewerEl.appendChild(titleEl);

  if (item.tagLabel) {
    const tagEl = document.createElement('div');
    tagEl.className = 'docs-article-date';
    tagEl.textContent = item.tagLabel;
    viewerEl.appendChild(tagEl);
  }

  if (item.desc) {
    const descEl = document.createElement('p');
    descEl.className = 'tool-desc';
    descEl.textContent = item.desc;
    viewerEl.appendChild(descEl);
  }

  if (item.script) {
    const ui = document.createElement('div');
    ui.className = 'tool-ui';
    ui.id = 'work-ui-' + item.id;
    viewerEl.appendChild(ui);

    loadToolScript(item.script, () => {
      const handler = window.ToolRegistry[item.id];
      if (handler?.init) handler.init(ui);
    });
  }
}

// ── Init ──────────────────────────────────────────────────

(function init() {
  renderTabs();
  renderList();
  const items = WORK_ITEMS.filter(i => i.tab === currentTab);
  if (items.length > 0) selectItem(items[0]);
})();
