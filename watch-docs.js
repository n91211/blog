/* ============================================================
   watch-docs.js — docs/ 폴더 감시 → 변경 시 자동 빌드
   ============================================================ */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DOCS_DIR    = path.join(__dirname, 'docs');
const BUILD_SCRIPT = path.join(__dirname, 'build-docs.js');

let debounceTimer = null;

function runBuild() {
  try {
    execSync(`node "${BUILD_SCRIPT}"`, { stdio: 'pipe' });
  } catch (e) {
    // 빌드 오류 무시 (파일 저장 중 일시적 오류 등)
  }
}

// 시작 시 1회 빌드
runBuild();

fs.watch(DOCS_DIR, { recursive: true }, (event, filename) => {
  if (!filename || !filename.endsWith('.txt')) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runBuild, 300);
});
