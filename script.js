/* ============================================================
   script.js — 위래의 창고
   ============================================================ */

// ── Tag color maps ──────────────────────────────────────────

const GENRE_CLASS = {
  '판타지':   'tag-fantasy',
  'SF':       'tag-sf',
  '호러':     'tag-horror',
  '미스터리': 'tag-mystery',
  '스릴러':   'tag-thriller',
  '로맨스':   'tag-romance',
  '장르소설': 'tag-genre',
};

const TYPE_CLASS = {
  '단편':     'tag-short',
  '초단편':   'tag-flash',
  '경장편':   'tag-novella',
  '소설집':   'tag-coll',
  '웹소설':   'tag-web',
  '웹툰':     'tag-toon',
  '채팅소설': 'tag-chat',
};

// Filter button border class map (matches CSS .flt-* rules)
const FILTER_CLASS = {
  '판타지':   'flt-fantasy',
  'SF':       'flt-sf',
  '호러':     'flt-horror',
  '미스터리': 'flt-mystery',
  '스릴러':   'flt-thriller',
  '로맨스':   'flt-romance',
  '장르소설': 'flt-genre',
  '웹소설':   'flt-web',
  '웹툰':     'flt-toon',
  '채팅소설': 'flt-chat',
  '단편':     'flt-short',
  '초단편':   'flt-flash',
  '경장편':   'flt-novella',
  '소설집':   'flt-coll',
};

// ── Utilities ───────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function splitGenres(genreStr) {
  return genreStr.split('/').map(g => g.trim()).filter(Boolean);
}

function makeTag(label, classMap) {
  const span = document.createElement('span');
  span.className = 'tag ' + (classMap[label] || '');
  span.textContent = label;
  return span;
}

// ── Build filter list dynamically from data ─────────────────

// Preferred display order
const GENRE_ORDER = ['판타지', 'SF', '호러', '미스터리', '스릴러', '로맨스'];
const TYPE_ORDER  = ['초단편', '단편', '경장편', '소설집', '웹소설', '웹툰', '채팅소설'];

function buildFilterList() {
  const genreSet = new Set();
  const typeSet  = new Set();

  WORKS.forEach(w => {
    splitGenres(w.genre).forEach(g => genreSet.add(g));
    typeSet.add(w.type);
  });

  const genres = GENRE_ORDER.filter(g => genreSet.has(g));
  const types  = TYPE_ORDER.filter(t => typeSet.has(t));

  return ['전체', ...genres, ...types];
}

// ── Filter state ────────────────────────────────────────────

let currentFilter = '전체';

function matchesFilter(work) {
  if (currentFilter === '전체') return true;
  // genre match
  if (splitGenres(work.genre).includes(currentFilter)) return true;
  // type match
  if (work.type === currentFilter) return true;
  return false;
}

// ── Render filter buttons ───────────────────────────────────

function makeFilterBtn(label, container) {
  const btn = document.createElement('button');
  const fc  = FILTER_CLASS[label] || '';
  btn.className = 'filter-btn' + (fc ? ' ' + fc : '') + (label === currentFilter ? ' active' : '');
  btn.textContent = label;
  btn.addEventListener('click', () => {
    if (currentFilter === label) return;
    currentFilter = label;
    container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderWorks();
  });
  return btn;
}

function renderFilterButtons() {
  const container = document.getElementById('filterButtons');
  if (!container) return;

  // 데이터에서 실제 존재하는 장르/형식 추출
  const genreSet = new Set();
  const typeSet  = new Set();
  WORKS.forEach(w => {
    splitGenres(w.genre).forEach(g => genreSet.add(g));
    typeSet.add(w.type);
  });

  const genres = GENRE_ORDER.filter(g => genreSet.has(g));
  const types  = TYPE_ORDER.filter(t => typeSet.has(t));

  // 전체 버튼
  container.appendChild(makeFilterBtn('전체', container));

  // 장르 섹션
  const genreLabel = document.createElement('div');
  genreLabel.className = 'filter-section-label';
  genreLabel.textContent = '장르';
  container.appendChild(genreLabel);
  genres.forEach(label => container.appendChild(makeFilterBtn(label, container)));

  // 형식 섹션
  const typeLabel = document.createElement('div');
  typeLabel.className = 'filter-section-label';
  typeLabel.textContent = '형식';
  container.appendChild(typeLabel);
  types.forEach(label => container.appendChild(makeFilterBtn(label, container)));
}

// ── Render works grid ───────────────────────────────────────

function renderWorks() {
  const grid = document.getElementById('worksGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const visible = WORKS.filter(matchesFilter).reverse();

  if (visible.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'font-size:13px; color:var(--muted); padding:0.5rem 0;';
    empty.textContent = '해당 항목의 작품이 없습니다.';
    grid.appendChild(empty);
    return;
  }

  visible.forEach(work => {
    const idx  = WORKS.indexOf(work);
    const card = document.createElement('div');
    card.className = 'work-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', work.title + ' 상세 보기');

    // Cover wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'card-cover-wrapper';

    if (work.featured) {
      const badge = document.createElement('div');
      badge.className = 'featured-badge';
      badge.textContent = '★ 대표작';
      wrapper.appendChild(badge);
    }

    const img = document.createElement('img');
    img.className = 'card-cover';
    img.src = work.cover;
    img.alt = work.title;
    img.loading = 'lazy';

    const fallback = document.createElement('div');
    fallback.className = 'card-cover-fallback';
    fallback.textContent = work.title;

    img.addEventListener('error', function () {
      this.style.display = 'none';
      fallback.style.display = 'flex';
    });

    wrapper.appendChild(img);
    wrapper.appendChild(fallback);
    card.appendChild(wrapper);

    // Title
    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = work.title;
    card.appendChild(title);

    // Meta
    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.textContent = work.date;
    card.appendChild(meta);

    // Tags: genres + type
    const tagsEl = document.createElement('div');
    tagsEl.className = 'card-tags';

    splitGenres(work.genre).forEach(g => {
      tagsEl.appendChild(makeTag(g, GENRE_CLASS));
    });
    tagsEl.appendChild(makeTag(work.type, TYPE_CLASS));

    card.appendChild(tagsEl);

    // Click / keyboard
    card.addEventListener('click', () => openDetail(idx));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(idx); }
    });

    grid.appendChild(card);
  });
}

// ── Detail panel ────────────────────────────────────────────

function openDetail(idx) {
  const work    = WORKS[idx];
  const content = document.getElementById('detailContent');
  if (!content) return;

  // Title
  let html = `<div class="detail-title">${esc(work.title)}</div>`;

  // Tags in detail panel
  html += `<div class="detail-tags">`;
  splitGenres(work.genre).forEach(g => {
    const cls = GENRE_CLASS[g] || '';
    html += `<span class="tag ${cls}">${esc(g)}</span>`;
  });
  const tcls = TYPE_CLASS[work.type] || '';
  html += `<span class="tag ${tcls}">${esc(work.type)}</span>`;
  html += `</div>`;

  // Info rows
  const rows = [
    ['출간일', work.date],
    ['지면',   work.venue],
    ['출판사', work.publisher],
  ];

  html += `<dl class="detail-info">`;
  rows.forEach(([label, val]) => {
    html += `<div class="detail-row"><dt>${esc(label)}</dt><dd>${esc(val)}</dd></div>`;
  });
  html += `</dl>`;

  if (work.note) {
    html += `<p class="detail-note">${esc(work.note)}</p>`;
  }

  if (work.link) {
    html += `<a href="${esc(work.link)}" target="_blank" rel="noopener noreferrer" class="detail-link">→ 읽으러 가기</a>`;
  }

  content.innerHTML = html;

  const overlay = document.getElementById('detailOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('detailClose')?.focus();
}

function closeDetail() {
  document.getElementById('detailOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('detailClose')?.addEventListener('click', closeDetail);
document.getElementById('detailOverlay')?.addEventListener('click', function (e) {
  if (e.target === this) closeDetail();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

// ── History ─────────────────────────────────────────────────

const HISTORY = {
  awards: [
    { year: '2008', text: '문학광장 문장 장르란 월장원 (「아래에서」)', link: null },
    { year: '2014', text: '제1회 큐빅노트 공모전 수상 (「동전 마법」)', link: 'http://onujupub.tistory.com/40' },
    { year: '2019', text: '브릿G 제4회 작가 프로젝트 수상 (「우리」)', link: null },
    { year: '2023', text: '제11회 SF어워드 중단편 부문 수상 (「두 발로 걷는 남자 괴담」)', link: 'https://ridibooks.com/books/5267000001' },
    { year: '2022', text: '브릿G 제2회 종말문학공모전 수상 (「죽이는 것이 더 낫다」)', link: null },
    { year: '2024', text: '제12회 SF어워드 중단편 부문 수상 (「마젠타 C. 세레스의 사랑과 혁명」)', link: null },
  ],
  reviews: [
    { year: '2022', text: '심사위원단 · 제2회 종말문학공모전 심사평 — 「죽이는 것이 더 낫다」', link: 'https://britg.kr/award/apocalypse2/' },
    { year: '2022', text: '김보영 · 알라딘 MD 추천 — 「백관의 왕이 이르니」', link: 'https://www.aladin.co.kr/m/mproduct.aspx?ItemId=305628114' },
    { year: '2023', text: '심완선 · 한국일보 \'낯설지만 매혹적인\' — 「백관의 왕이 이르니」', link: 'https://m.hankookilbo.com/News/Read/A2023042517390002717' },
    { year: '2023', text: '곽재식 · 크로스로드 SF Review — 「두 발로 걷는 남자 괴담」', link: 'https://crossroads.apctp.org/cop/bbs/000000000000/selectArticleDetail.do?nttId=4029' },
    { year: '2024', text: '심사위원단 · 제11회 SF어워드 중단편 심사평 — 「두 발로 걷는 남자 괴담」', link: 'https://sfaward.kr/113' },
    { year: '2024', text: '곽재식 · 크로스로드 SF Review — 「백관의 왕이 이르니」', link: 'https://crossroads.apctp.org/cop/bbs/000000000000/selectArticleDetail.do?nttId=4189' },
    { year: '2025', text: '심사위원단 · 제12회 SF어워드 중단편 심사평 — 「마젠타 C. 세레스의 사랑과 혁명」', link: 'https://sfaward.kr/134' },
  ],
  interviews: [
    { year: '2022', text: '브릿G — [브릿G 숏터뷰] 네 번째 게스트: 위래 작가 편!', link: 'https://britg.kr/158195/' },
    { year: '2024', text: '서울신문 오경진 — 장르소설은 허깨비? 가짜라 더 아름다워', link: 'https://amp.seoul.co.kr/news/newsView.php?id=20240105016001&cp=go&section=noise1&wlog_tag1=mb_pn_from_section' },
    { year: '2026', text: 'CEO저널 — 위래 웹소설 작가 [문화IN]', link: 'https://www.ceojhn.com/news/articleView.html?idxno=9326' },
  ],
  lectures: [
    { year: '2022', text: '청강대학교 일일 판타지 강연', link: null },
    { year: '2024', text: '과학문화전문인력 양성과정 웹소설 부문', link: null },
    { year: '2024', text: '스테디오 SF 웹소설 창작 전략 강의', link: null },
    { year: '2025', text: '청강대학교 웹툰웹소설콘텐츠학과 웹소설장면설계와연출 출강', link: null },
    { year: '2025', text: 'HUSS 테이크오프 페스타 릴레이 특강', link: null },
    { year: '2025', text: '「귀신새 우는 소리」 앤솔로지 북토크', link: null },
    { year: '2026', text: '청강대학교 웹툰웹소설콘텐츠학과 웹소설장면설계와연출 출강', link: null },
  ],
  affiliations: [
    { year: '', text: '괴이학회', link: null },
    { year: '', text: '환상해역', link: null },
    { year: '', text: '웹소설작가연합', link: null },
    { year: '', text: '한국과학소설작가연대', link: null },
    { year: '', text: '작가노조', link: null },
    { year: '', text: '청강대학교 만화컨텐츠스쿨', link: null },
  ],
};

const HISTORY_TABS = [
  { key: 'awards',       label: '수상' },
  { key: 'reviews',      label: '리뷰' },
  { key: 'interviews',   label: '인터뷰' },
  { key: 'lectures',     label: '강의' },
  { key: 'affiliations', label: '소속' },
];

let currentHistoryTab = 'awards';

function renderHistoryTabs() {
  const tabsEl    = document.getElementById('historyTabs');
  const contentEl = document.getElementById('historyContent');
  if (!tabsEl || !contentEl) return;

  HISTORY_TABS.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'history-tab' + (tab.key === currentHistoryTab ? ' active' : '');
    btn.textContent = tab.label;
    btn.addEventListener('click', () => {
      currentHistoryTab = tab.key;
      tabsEl.querySelectorAll('.history-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderHistoryContent();
    });
    tabsEl.appendChild(btn);
  });

  renderHistoryContent();
}

function renderHistoryContent() {
  const contentEl = document.getElementById('historyContent');
  if (!contentEl) return;

  const items = (HISTORY[currentHistoryTab] || []).slice().reverse();

  if (items.length === 0) {
    contentEl.innerHTML = '<p class="history-empty">항목을 업데이트 중입니다.</p>';
    return;
  }

  let html = '<table class="history-table">';
  items.forEach(item => {
    html += '<tr>';
    html += `<td>${esc(item.year)}</td>`;
    html += `<td>${esc(item.text)}`;
    if (item.link) {
      html += ` <a href="${esc(item.link)}" target="_blank" rel="noopener noreferrer" class="history-link">↗</a>`;
    }
    html += '</td></tr>';
  });
  html += '</table>';
  contentEl.innerHTML = html;
}

// ── Email copy ───────────────────────────────────────────────

function copyEmail(btn) {
  navigator.clipboard.writeText('wirae@hotmail.com').then(() => {
    const orig = btn.textContent;
    btn.textContent = '✅';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
}

// ── Init ─────────────────────────────────────────────────────

renderFilterButtons();
renderWorks();
renderHistoryTabs();
