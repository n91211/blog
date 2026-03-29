# CLAUDE.md — 위래의 누리집 (my-blog)

## 언어 설정

항상 한국어로 답변할 것.

## 프로젝트 개요

- **사이트명:** 위래의 누리집
- **성격:** 순수 정적 사이트 — 서버·빌드 도구 없음, 브라우저 JS만 사용
- **배포:** 파일 그대로 서빙 (Node.js는 `screenshot.js` 전용 개발 도구)

## 파일 구조

```
index.html     — 소개 페이지 (about / history / works 섹션)
novel.html     — 문서 페이지 (준비 중)
work.html      — 작업 페이지 (도구 모음)
style.css      — 전체 공통 스타일
script.js      — index.html 전용 스크립트
work.js        — 작업 페이지 탭/콘텐츠 렌더링, ToolRegistry 동적 로드
data/works.js  — 작품 목록 데이터
tools/         — 도구별 JS 파일 (각각 ToolRegistry에 등록)
fonts/         — 로컬 폰트 파일
images/        — 이미지 에셋
```

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

## 스타일 지침

- CSS 변수(`--color-*`, `--font-*` 등) 활용 — 하드코딩 색상값 지양
- 모바일 대응: `style.css` 하단 미디어 쿼리 섹션에 작성
- 한국어 기본 폰트: `fonts/` 폴더 내 로컬 폰트 우선 사용
