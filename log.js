/* ============================================================
   log.js — 위래의 누리집 기록 페이지
   ============================================================ */

const DOCS_TABS = ['일기', '리뷰', '소설', '작법'];
const ITEMS_PER_PAGE          = 10;
const ITEMS_EXPANDED_PER_PAGE = 30;

if (typeof window.DOCS === 'undefined') window.DOCS = [];

let currentTab   = null;
let currentIndex = null;
let currentPage  = 0;
let isExpanded   = false;

// ── Init ────────────────────────────────────────────────────

(function init() {
  currentTab = DOCS_TABS.find(t => DOCS.some(d => d.category === t)) || DOCS_TABS[0];
  renderTabs();
  renderList();

  const items = DOCS.filter(d => d.category === currentTab);
  if (items.length > 0) selectDoc(0, items);
})();

// ── Tabs ────────────────────────────────────────────────────

function renderTabs() {
  const tabsEl    = document.getElementById('docsTabs');
  const expandWrap = document.getElementById('docsExpandWrap');
  if (!tabsEl) return;

  DOCS_TABS.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'history-tab' + (tab === currentTab ? ' active' : '');
    btn.textContent = tab;
    btn.addEventListener('click', () => {
      if (currentTab === tab) return;
      currentTab   = tab;
      currentPage  = 0;
      currentIndex = null;
      tabsEl.querySelectorAll('.history-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderList();
      const items = DOCS.filter(d => d.category === currentTab);
      if (items.length > 0) selectDoc(0, items);
      else showEmpty();
    });
    tabsEl.appendChild(btn);
  });

  if (expandWrap) expandWrap.appendChild(buildExpandToggle());
}

// ── Helpers ─────────────────────────────────────────────────

function getPerPage() {
  return isExpanded ? ITEMS_EXPANDED_PER_PAGE : ITEMS_PER_PAGE;
}

function getTotalPages(items) {
  return Math.max(1, Math.ceil(items.length / getPerPage()));
}

function getPageItems(items) {
  const start = currentPage * getPerPage();
  return items.slice(start, start + getPerPage());
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const set = new Set([0, total - 1, current]);
  if (current > 1)        set.add(current - 1);
  if (current < total - 2) set.add(current + 1);

  const sorted = [...set].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…');
    result.push(sorted[i]);
  }
  return result;
}

// ── List ────────────────────────────────────────────────────

function renderList() {
  const listEl    = document.getElementById('docsList');
  const layoutEl  = document.querySelector('.docs-layout');
  const expandBtn = document.querySelector('#docsExpandWrap .docs-expand-btn');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (layoutEl)  layoutEl.classList.toggle('docs-expanded', isExpanded);
  if (expandBtn) expandBtn.textContent = isExpanded ? '▲ 접기' : '▼ 펼치기';

  const items = DOCS.filter(d => d.category === currentTab);

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'docs-list-empty';
    empty.textContent = '글이 없습니다.';
    listEl.appendChild(empty);
    return;
  }

  const totalPages = getTotalPages(items);
  if (currentPage >= totalPages) currentPage = totalPages - 1;

  getPageItems(items).forEach(doc => {
    const absoluteIdx = items.indexOf(doc);
    const item = document.createElement('div');
    item.className = 'docs-list-item' + (absoluteIdx === currentIndex ? ' active' : '');
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    const titleEl = document.createElement('span');
    titleEl.className = 'docs-list-title';
    titleEl.textContent = doc.title;

    const dateEl = document.createElement('span');
    dateEl.className = 'docs-list-date';
    dateEl.textContent = doc.date;

    item.appendChild(titleEl);
    item.appendChild(dateEl);

    item.addEventListener('click', () => selectDoc(absoluteIdx, items));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDoc(absoluteIdx, items); }
    });

    listEl.appendChild(item);
  });

  if (totalPages > 1) listEl.appendChild(buildPagination(totalPages));
}

// ── Pagination ───────────────────────────────────────────────

function buildPagination(totalPages) {
  const nav = document.createElement('div');
  nav.className = 'docs-list-nav';

  const prev = document.createElement('button');
  prev.className = 'docs-nav-btn';
  prev.textContent = '◀';
  prev.disabled = currentPage === 0;
  prev.addEventListener('click', () => { currentPage--; renderList(); });

  const pageNums = document.createElement('span');
  pageNums.className = 'docs-nav-pages';

  getPageNumbers(currentPage, totalPages).forEach(p => {
    if (p === '…') {
      const el = document.createElement('span');
      el.className = 'docs-nav-ellipsis';
      el.textContent = '…';
      pageNums.appendChild(el);
    } else {
      const btn = document.createElement('button');
      btn.className = 'docs-nav-page' + (p === currentPage ? ' active' : '');
      btn.textContent = p + 1;
      btn.addEventListener('click', () => { currentPage = p; renderList(); });
      pageNums.appendChild(btn);
    }
  });

  const next = document.createElement('button');
  next.className = 'docs-nav-btn';
  next.textContent = '▶';
  next.disabled = currentPage === totalPages - 1;
  next.addEventListener('click', () => { currentPage++; renderList(); });

  nav.appendChild(prev);
  nav.appendChild(pageNums);
  nav.appendChild(next);
  return nav;
}

// ── Expand toggle ────────────────────────────────────────────

function buildExpandToggle() {
  const btn = document.createElement('button');
  btn.className = 'docs-expand-btn';
  btn.textContent = isExpanded ? '▲ 접기' : '▼ 펼치기';
  btn.addEventListener('click', () => {
    isExpanded  = !isExpanded;
    currentPage = 0;
    renderList();
  });
  return btn;
}

// ── Select & Viewer ──────────────────────────────────────────

function selectDoc(absoluteIdx, items) {
  currentIndex = absoluteIdx;

  const targetPage = Math.floor(absoluteIdx / getPerPage());
  if (targetPage !== currentPage) {
    currentPage = targetPage;
    renderList();
  } else {
    const pageStart = currentPage * getPerPage();
    document.querySelectorAll('.docs-list-item').forEach((el, i) => {
      el.classList.toggle('active', pageStart + i === absoluteIdx);
    });
  }

  renderViewer(items[absoluteIdx]);
}

function showEmpty() {
  const viewerEl = document.getElementById('docsViewer');
  if (!viewerEl) return;
  viewerEl.innerHTML = '<div class="docs-viewer-empty">글이 없습니다.</div>';
}

function renderViewer(doc) {
  const viewerEl = document.getElementById('docsViewer');
  if (!viewerEl) return;
  viewerEl.innerHTML = '';

  const titleEl = document.createElement('div');
  titleEl.className = 'docs-article-title';
  titleEl.textContent = doc.title;

  const dateEl = document.createElement('div');
  dateEl.className = 'docs-article-date';
  dateEl.textContent = doc.date;

  const bodyEl = document.createElement('div');
  bodyEl.className = 'docs-article-body';
  bodyEl.textContent = doc.body;

  viewerEl.appendChild(titleEl);
  viewerEl.appendChild(dateEl);
  viewerEl.appendChild(bodyEl);
}
