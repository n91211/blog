/* ============================================================
   theme.js — 위래의 누리집 테마 토글
   ※ <head> 에서 로드해야 깜빡임이 없음
   ============================================================ */
(function () {
  const KEY  = 'wirae-theme';
  const html = document.documentElement;

  function preferred() {
    var stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function apply(theme) {
    html.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
  }

  // 즉시 적용 (flash 방지)
  apply(preferred());

  // 버튼 연결은 DOM 준비 후
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      apply(html.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  });
})();
