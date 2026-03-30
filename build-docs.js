/* ============================================================
   build-docs.js — 위래의 누리집 기록 인덱스 생성기
   사용법: npm run b
   결과:  data/docs.js (log.html에서 자동 로드)

   txt 파일 형식:
     파일 이름 = 글 제목 (확장자 제외)
     파일 생성 날짜 = 날짜 (자동)
     파일 내용 전체 = 본문
   ============================================================ */

const fs    = require('fs');
const path  = require('path');
const iconv = require('iconv-lite');

function readText(filePath) {
  const buf = fs.readFileSync(filePath);
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return buf.toString('utf-8');
  } catch {
    return iconv.decode(buf, 'EUC-KR');
  }
}

const DOCS_DIR = path.join(__dirname, 'docs');
const OUTPUT   = path.join(__dirname, 'data', 'docs.js');

const CATEGORIES = ['일기', '리뷰', '소설', '작법'];

const docs = [];

CATEGORIES.forEach(category => {
  const catDir = path.join(DOCS_DIR, category);
  if (!fs.existsSync(catDir)) return;

  const files = fs.readdirSync(catDir)
    .filter(f => f.endsWith('.txt'))
    .sort();

  files.forEach(file => {
    const filePath = path.join(catDir, file);
    const stat     = fs.statSync(filePath);
    const title    = path.basename(file, '.txt');
    const date     = stat.mtime.toISOString().slice(0, 10);
    const body     = readText(filePath).replace(/\r\n/g, '\n').trimEnd();

    docs.push({ category, title, date, body });
  });
});

// 날짜 내림차순 정렬
docs.sort((a, b) => b.date.localeCompare(a.date));

const output =
`/* ============================================================
   data/docs.js — 위래의 누리집 기록 데이터
   ※ 이 파일은 build-docs.js가 자동 생성합니다. 직접 편집하지 마세요.
   ============================================================ */

window.DOCS = ${JSON.stringify(docs, null, 2)};
`;

fs.writeFileSync(OUTPUT, output, 'utf-8');

console.log(`완료: ${docs.length}개 기록`);
docs.forEach(d => console.log(`  [${d.category}] ${d.date}  ${d.title}`));
