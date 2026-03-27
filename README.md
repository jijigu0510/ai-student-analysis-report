# 부안고등학교 학생부 AI 분석 프로젝트

부안고등학교 전용 학생부 분석 및 합불합 분석 프로그램입니다. 

## 🚀 배포 및 사용 방법

이 프로젝트는 **GitHub Pages**를 통해 간단히 배포할 수 있습니다.

1. GitHub 저장소에 이 폴더의 파일들을 업로드합니다.
2. 저장소 **Settings > Pages**에서 브랜치를 `main`으로 설정하고 저장합니다.
3. 배포된 URL로 접속하여 **Gemini API 키**를 입력하고 사용합니다.

## ✨ 주요 기능

- **개인 분석**: 생활기록부 내용을 바탕으로 대학별 평가 역량(학업/진로/공동체) 심층 분석
- **합불합 분석**: 엑셀 데이터를 활용한 대학별 합불합 통계 및 세부 기록 연동
- **데이터 보관(Persistence)**: 업로드한 엑셀 데이터가 브라우저(`IndexedDB`)에 저장되어 새로고침 후에도 유지됨
- **AI 리포트 생성**: Gemini AI를 활용하여 평가 근거와 종합 평가 제공

---

## 🛠 개발 및 로컬 실행

```bash
npm install
```

## 개발 모드

1. 로컬 서버 띄우기
   - Live Server(권장)
   - 또는 `python -m http.server 5500` 
   - 또는 `npx http-server -p 5500`

2. 브라우저 열기
   - `http://localhost:5500`

## 자동화 스크립트

- `npm run generate:criteria` : `app.js` 하드코드 `universityEvalCriteriaLegacy` 자동 추출 후 `universityEvalCriteria.json` 생성
- `npm run lint` : ESLint 검사
- `npm run lint:fix` : ESLint 자동 수정
- `npm run format` : Prettier 포맷
- `npm run test:e2e` : Playwright E2E 테스트
- `npm run test:e2e:all` : Chromium/Firefox/WebKit 종합 E2E 테스트
- `npm run setup:fixtures` : 고정 테스트 데이터 복사
- `npm run audit` : 취약점 스캔
- `npm run audit:fix` : 취약점 자동 수정

## 추가 안정화 (이미 구현됨)

- `showAppMessage` 로 UI 알림을 표시하고, 닫기/undo(되돌리기) 버튼을 지원
- 알림 이력은 `localStorage`(`appAlertHistory`)에 저장되어 최대 20개 유지
- `universityEvalCriteria.json` 외부 파일 로드 시도 실패 시 내부 fallback 동작
- `generate_universityEvalCriteria.js`로 버전 동기화 자동화

## E2E 테스트 실행 예시

```bash
npm run generate:criteria
python -m http.server 5500
npm run test:e2e
```

## 코드 스타일

- `prettier` 및 `eslint` 설정 추가
- `npm run format` + `npm run lint`로 일관된 코드 스타일 유지
