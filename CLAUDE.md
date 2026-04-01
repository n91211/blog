# CLAUDE.md — 위래의 blog

## 프로젝트 개요

- **사이트명:** 위래의 blog
- **성격:** 순수 정적 사이트 — 브라우저 JS만 사용
- **배포:** 파일 그대로 서빙. Node.js는 `build-docs.js`/`watch-docs.js` 전용 개발 도구
- **내비게이션:** 소개(`index.html`) / 기록(`log.html`) / 작업(`work.html`)

## 파일 구조

```
index.html       — 소개 페이지 (about / history / works 섹션)
log.html         — 기록 페이지 (일기 / 리뷰 / 소설 / 작법 탭)
work.html        — 작업 페이지 (도구 모음)
style.css        — 전체 공통 스타일
theme.js         — 다크/라이트 테마 토글 (반드시 <head>에서 로드 — FOUC 방지)
script.js        — index.html 전용 스크립트
log.js           — log.html 전용 스크립트
work.js          — 작업 페이지 탭/콘텐츠 렌더링, ToolRegistry 동적 로드
data/works.js    — 작품 목록 데이터
data/history.js  — 수상·발표 이력 데이터
data/docs.js     — 기록 데이터 (자동 생성 — 직접 편집 금지)
docs/            — 기록 원본 txt 파일 (카테고리 서브폴더)
build-docs.js    — docs/ → data/docs.js 빌드 스크립트
watch-docs.js    — docs/ 감시 후 자동 빌드
tools/           — 도구별 JS 파일 (각각 ToolRegistry에 등록)
fonts/           — 로컬 폰트 파일
images/          — 이미지 에셋
```

## 기록 추가 방법

1. `docs/카테고리/제목.txt` 파일 작성 (카테고리: 일기 / 리뷰 / 소설 / 작법)
2. `npm run b` 실행 → `data/docs.js` 자동 생성
3. 파일의 날짜는 txt 파일의 수정 시각(`mtime`) 기준

## 도구 추가 방법

1. `tools/새도구.js` 작성 — 반드시 `window.ToolRegistry['도구id'] = { init(el) { … } }` 형태로 등록
2. `work.js`의 `TOOLS` 배열에 항목 추가:
   ```js
   { id: '도구id', title: '표시명', tagClass: 'tag-xxx', tagLabel: '태그', desc: '설명', script: 'tools/새도구.js' }
   ```
3. 필요한 경우 `style.css`에 `.tag-xxx` 스타일 추가

## 현재 도구

| id | 표시명 | 파일 | 설명 |
|----|--------|------|------|
| `ascii576` | ASKII64 | `tools/ascii576.js` | 이미지 드래그&드롭 → 아스키 아트 생성 |

### ASKII64 주의사항

- 출력 글자가 픽셀 수의 2배인 것은 **Neo둥근모 기준 종횡비 보정** 때문 (의도된 동작)
- 비율: 1:1(64×64px → 128×64자), 2:3(64×96px → 128×96자), 3:2(96×64px → 192×64자)
- 고정폭 폰트 + 공백 보존 환경 필수 (`<pre>`, 코드 블록 등); 메모장 등 가변폭 환경에서는 깨짐

## 커밋 후 메모리 갱신 규칙

커밋을 완료한 직후, `C:/Users/Wirae/.claude/projects/C--Users-Wirae/memory/project_myblog.md`의 **최근 커밋 로그** 섹션을 아래 규칙으로 갱신할 것.

1. 섹션이 없으면 파일 맨 아래에 `## 최근 커밋 로그` 헤더와 함께 추가한다.
2. 새 커밋 요약을 한 줄(`- YYYY-MM-DD: <내용>`)로 섹션 **맨 아래**에 추가한다.
3. 섹션 내 항목이 4개 이상이 되면 **가장 오래된 항목(맨 위 줄)을 삭제**한다.
4. 결과적으로 섹션에는 항상 최신 3개 항목만 남는다.

## 스타일 지침

- CSS 변수(`--color-*`, `--font-*` 등) 활용 — 하드코딩 색상값 지양
- 모바일 대응: `style.css` 하단 미디어 쿼리 섹션에 작성
- 한국어 기본 폰트: `fonts/` 폴더 내 로컬 폰트 우선 사용
