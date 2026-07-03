/**
 * 대학별 입결 분포도 탭 (admission_dist.js)  v2
 * ─ 지원 대학·전형 ─────────────────────────────────────────────────────────
 *   건국대  : KU자기추천 / 학교추천   → 필드: 학년도·모집단위·모집전형·모집인원·경쟁률·충원인원·50%cut(등급)·70%cut(등급)
 *   경희대  : 학생부교과              → 필드: major·recruit·rate25·rate24·fillRate25·fillRate24·minSatRate·realRate·score50·score70·grade50·grade70·gradeAvg
 *             학생부종합(네오르네상스) → 필드: name(=major)·recruit·rate2025·rate2024·ratio2025·ratio2024·doc·interview·cut50·cut70·avg
 *
 * 실데이터 주입  : window.injectAdmissionData(uniName, typeOrData, data?)
 *                  건국대: injectAdmissionData('건국대', flatArray)
 *                  경희대: injectAdmissionData('경희대', '학생부교과', array)
 *                          injectAdmissionData('경희대', '학생부종합(네오르네상스)', array)
 */

(function () {
  'use strict';

  // ════════════════════════════════════════════════════════════════════════════
  // ██  내장 샘플 데이터
  // ════════════════════════════════════════════════════════════════════════════

  // ── 건국대 데이터 배열 (GAS에서 불러옴, 실패 시 샘플 데이터) ────────────
  let KU_DATA = [];
  const KU_GAS_URL = 'https://script.google.com/macros/s/AKfycbwU6VdOuvZlg6RMInDYmyY-hLLWqZzf3x0BKj3hkOxi8oPq6PDH9EWXcXQiDhIk5UU/exec';

  function getKuSampleData() {
    return [
      // 2025 KU자기추천
      { 학년도: 2025, 모집단위: '의예과', 모집전형: 'KU자기추천', 모집인원: 8, 경쟁률: 42.1, 충원인원: 1, '50%cut(등급)': 1.1, '70%cut(등급)': 1.3 },
      { 학년도: 2025, 모집단위: '수의예과', 모집전형: 'KU자기추천', 모집인원: 10, 경쟁률: 28.7, 충원인원: 2, '50%cut(등급)': 1.4, '70%cut(등급)': 1.7 },
      { 학년도: 2025, 모집단위: '컴퓨터공학부', 모집전형: 'KU자기추천', 모집인원: 32, 경쟁률: 18.3, 충원인원: 4, '50%cut(등급)': 1.6, '70%cut(등급)': 2.0 },
      { 학년도: 2025, 모집단위: '전기전자공학부', 모집전형: 'KU자기추천', 모집인원: 40, 경쟁률: 12.8, 충원인원: 8, '50%cut(등급)': 1.8, '70%cut(등급)': 2.2 },
      { 학년도: 2025, 모집단위: '생명공학과', 모집전형: 'KU자기추천', 모집인원: 22, 경쟁률: 16.5, 충원인원: 6, '50%cut(등급)': 1.9, '70%cut(등급)': 2.3 },
      { 학년도: 2025, 모집단위: '화학공학부', 모집전형: 'KU자기추천', 모집인원: 24, 경쟁률: 11.5, 충원인원: 5, '50%cut(등급)': 2.0, '70%cut(등급)': 2.4 },
      { 학년도: 2025, 모집단위: '수학교육과', 모집전형: 'KU자기추천', 모집인원: 8, 경쟁률: 12.5, 충원인원: 2, '50%cut(등급)': 2.0, '70%cut(등급)': 2.5 },
      { 학년도: 2025, 모집단위: '경영학과', 모집전형: 'KU자기추천', 모집인원: 35, 경쟁률: 14.2, 충원인원: 9, '50%cut(등급)': 2.1, '70%cut(등급)': 2.5 },
      { 학년도: 2025, 모집단위: '기계공학부', 모집전형: 'KU자기추천', 모집인원: 30, 경쟁률: 10.2, 충원인원: 6, '50%cut(등급)': 2.2, '70%cut(등급)': 2.7 },
      { 학년도: 2025, 모집단위: '경제학과', 모집전형: 'KU자기추천', 모집인원: 18, 경쟁률: 11.0, 충원인원: 4, '50%cut(등급)': 2.3, '70%cut(등급)': 2.8 },
      { 학년도: 2025, 모집단위: '심리학과', 모집전형: 'KU자기추천', 모집인원: 14, 경쟁률: 13.7, 충원인원: 3, '50%cut(등급)': 2.4, '70%cut(등급)': 2.9 },
      { 학년도: 2025, 모집단위: '산업공학부', 모집전형: 'KU자기추천', 모집인원: 20, 경쟁률: 9.6, 충원인원: 3, '50%cut(등급)': 2.5, '70%cut(등급)': 3.0 },
      { 학년도: 2025, 모집단위: '행정학과', 모집전형: 'KU자기추천', 모집인원: 15, 경쟁률: 9.3, 충원인원: 3, '50%cut(등급)': 2.6, '70%cut(등급)': 3.1 },
      { 학년도: 2025, 모집단위: '건축학부', 모집전형: 'KU자기추천', 모집인원: 18, 경쟁률: 10.8, 충원인원: 4, '50%cut(등급)': 2.8, '70%cut(등급)': 3.3 },
      { 학년도: 2025, 모집단위: '국어국문학과', 모집전형: 'KU자기추천', 모집인원: 12, 경쟁률: 8.1, 충원인원: 2, '50%cut(등급)': 2.9, '70%cut(등급)': 3.4 },
      // 2024 KU자기추천
      { 학년도: 2024, 모집단위: '의예과', 모집전형: 'KU자기추천', 모집인원: 8, 경쟁률: 39.4, 충원인원: 1, '50%cut(등급)': 1.2, '70%cut(등급)': 1.4 },
      { 학년도: 2024, 모집단위: '수의예과', 모집전형: 'KU자기추천', 모집인원: 10, 경쟁률: 26.3, 충원인원: 2, '50%cut(등급)': 1.5, '70%cut(등급)': 1.8 },
      { 학년도: 2024, 모집단위: '컴퓨터공학부', 모집전형: 'KU자기추천', 모집인원: 30, 경쟁률: 16.7, 충원인원: 3, '50%cut(등급)': 1.7, '70%cut(등급)': 2.1 },
      { 학년도: 2024, 모집단위: '전기전자공학부', 모집전형: 'KU자기추천', 모집인원: 38, 경쟁률: 11.9, 충원인원: 7, '50%cut(등급)': 1.9, '70%cut(등급)': 2.4 },
      { 학년도: 2024, 모집단위: '생명공학과', 모집전형: 'KU자기추천', 모집인원: 20, 경쟁률: 15.2, 충원인원: 5, '50%cut(등급)': 2.0, '70%cut(등급)': 2.5 },
      { 학년도: 2024, 모집단위: '화학공학부', 모집전형: 'KU자기추천', 모집인원: 22, 경쟁률: 10.3, 충원인원: 4, '50%cut(등급)': 2.1, '70%cut(등급)': 2.6 },
      { 학년도: 2024, 모집단위: '경영학과', 모집전형: 'KU자기추천', 모집인원: 33, 경쟁률: 13.5, 충원인원: 8, '50%cut(등급)': 2.2, '70%cut(등급)': 2.6 },
      { 학년도: 2024, 모집단위: '기계공학부', 모집전형: 'KU자기추천', 모집인원: 28, 경쟁률: 9.8, 충원인원: 5, '50%cut(등급)': 2.3, '70%cut(등급)': 2.8 },
      // 2025 학교추천
      { 학년도: 2025, 모집단위: '의예과', 모집전형: '학교추천', 모집인원: 5, 경쟁률: 32.0, 충원인원: 1, '50%cut(등급)': 1.3, '70%cut(등급)': 1.6 },
      { 학년도: 2025, 모집단위: '수의예과', 모집전형: '학교추천', 모집인원: 6, 경쟁률: 22.5, 충원인원: 1, '50%cut(등급)': 1.7, '70%cut(등급)': 2.0 },
      { 학년도: 2025, 모집단위: '컴퓨터공학부', 모집전형: '학교추천', 모집인원: 18, 경쟁률: 10.5, 충원인원: 3, '50%cut(등급)': 2.1, '70%cut(등급)': 2.6 },
      { 학년도: 2025, 모집단위: '전기전자공학부', 모집전형: '학교추천', 모집인원: 20, 경쟁률: 8.1, 충원인원: 4, '50%cut(등급)': 2.3, '70%cut(등급)': 2.8 },
      { 학년도: 2025, 모집단위: '생명공학과', 모집전형: '학교추천', 모집인원: 12, 경쟁률: 11.3, 충원인원: 2, '50%cut(등급)': 2.4, '70%cut(등급)': 2.9 },
      { 학년도: 2025, 모집단위: '화학공학부', 모집전형: '학교추천', 모집인원: 15, 경쟁률: 7.2, 충원인원: 3, '50%cut(등급)': 2.5, '70%cut(등급)': 3.0 },
      { 학년도: 2025, 모집단위: '경영학과', 모집전형: '학교추천', 모집인원: 22, 경쟁률: 9.4, 충원인원: 5, '50%cut(등급)': 2.6, '70%cut(등급)': 3.1 },
      { 학년도: 2025, 모집단위: '기계공학부', 모집전형: '학교추천', 모집인원: 16, 경쟁률: 6.8, 충원인원: 2, '50%cut(등급)': 2.7, '70%cut(등급)': 3.2 },
      { 학년도: 2025, 모집단위: '행정학과', 모집전형: '학교추천', 모집인원: 10, 경쟁률: 7.5, 충원인원: 2, '50%cut(등급)': 3.0, '70%cut(등급)': 3.5 },
      // 2024 학교추천
      { 학년도: 2024, 모집단위: '화학공학부', 모집전형: '학교추천', 모집인원: 14, 경쟁률: 6.8, 충원인원: 2, '50%cut(등급)': 2.6, '70%cut(등급)': 3.1 },
      { 학년도: 2024, 모집단위: '전기전자공학부', 모집전형: '학교추천', 모집인원: 18, 경쟁률: 7.5, 충원인원: 3, '50%cut(등급)': 2.4, '70%cut(등급)': 2.9 },
      { 학년도: 2024, 모집단위: '컴퓨터공학부', 모집전형: '학교추천', 모집인원: 16, 경쟁률: 9.8, 충원인원: 2, '50%cut(등급)': 2.2, '70%cut(등급)': 2.7 },
      { 학년도: 2024, 모집단위: '경영학과', 모집전형: '학교추천', 모집인원: 20, 경쟁률: 8.9, 충원인원: 4, '50%cut(등급)': 2.7, '70%cut(등급)': 3.2 },
    ];
  }

  // ── 경희대 학생부교과 데이터 배열 (GAS, 실패 시 샘플) ──────────────────────────────────────────────
  let KHU_GWAGYO_DATA = [];
  let KHU_GWAGYO_GAS_URL = 'https://script.google.com/macros/s/AKfycbxJ-DN07gFRm1qOB6OeeP65LvJn2ZP9rI_masf04XnKQP-z8QaAbeIWUV4Mn2dZ-6PTKA/exec';

  function getKhuGwagyoSampleData() {
    return [
      { major: '의학과', recruit: 37, rate25: 11.9, rate24: 10.4, fillRate25: '35%', fillRate24: '30%', minSatRate: '67%', realRate: 4.0, score50: 97.47, score70: 97.02, grade50: '1.1', grade70: 1.2, gradeAvg: 1.14 },
      { major: '한의학과(인문)', recruit: 15, rate25: 9.8, rate24: 8.7, fillRate25: '40%', fillRate24: '38%', minSatRate: '60%', realRate: 3.9, score50: 96.90, score70: 96.40, grade50: '1.2', grade70: 1.3, gradeAvg: 1.23 },
      { major: '한의학과(자연)', recruit: 25, rate25: 10.5, rate24: 9.2, fillRate25: '38%', fillRate24: '35%', minSatRate: '63%', realRate: 4.0, score50: 97.10, score70: 96.65, grade50: '1.2', grade70: 1.3, gradeAvg: 1.22 },
      { major: '약학과', recruit: 31, rate25: 14.3, rate24: 12.1, fillRate25: '30%', fillRate24: '28%', minSatRate: '70%', realRate: 4.3, score50: 97.02, score70: 96.50, grade50: '1.3', grade70: 1.4, gradeAvg: 1.32 },
      { major: '간호학과(자연)', recruit: 47, rate25: 8.4, rate24: 7.9, fillRate25: '45%', fillRate24: '42%', minSatRate: '55%', realRate: 3.8, score50: 96.30, score70: 95.70, grade50: '1.4', grade70: 1.6, gradeAvg: 1.48 },
      { major: '치의예과', recruit: 21, rate25: 16.2, rate24: 14.8, fillRate25: '28%', fillRate24: '25%', minSatRate: '72%', realRate: 4.6, score50: 97.50, score70: 97.10, grade50: '1.1', grade70: 1.2, gradeAvg: 1.13 },
      { major: '소프트웨어융합학과', recruit: 23, rate25: 9.7, rate24: 8.5, fillRate25: '32%', fillRate24: '30%', minSatRate: '58%', realRate: 4.1, score50: 95.50, score70: 94.80, grade50: '1.6', grade70: 1.8, gradeAvg: 1.68 },
      { major: '컴퓨터공학과', recruit: 62, rate25: 11.2, rate24: 10.1, fillRate25: '33%', fillRate24: '31%', minSatRate: '60%', realRate: 4.2, score50: 95.20, score70: 94.50, grade50: '1.7', grade70: 1.9, gradeAvg: 1.79 },
      { major: '전자공학과', recruit: 57, rate25: 7.8, rate24: 7.2, fillRate25: '37%', fillRate24: '35%', minSatRate: '53%', realRate: 3.6, score50: 94.80, score70: 94.00, grade50: '1.8', grade70: 2.0, gradeAvg: 1.87 },
      { major: '경영학과', recruit: 85, rate25: 6.5, rate24: 6.1, fillRate25: '48%', fillRate24: '45%', minSatRate: '50%', realRate: 3.3, score50: 94.50, score70: 93.60, grade50: '1.9', grade70: 2.2, gradeAvg: 2.01 },
      { major: '경제학과', recruit: 55, rate25: 5.9, rate24: 5.5, fillRate25: '50%', fillRate24: '48%', minSatRate: '45%', realRate: 3.1, score50: 93.80, score70: 92.90, grade50: '2.0', grade70: 2.3, gradeAvg: 2.12 },
      { major: '행정학과', recruit: 38, rate25: 5.3, rate24: 5.0, fillRate25: '52%', fillRate24: '50%', minSatRate: '42%', realRate: 2.9, score50: 93.20, score70: 92.30, grade50: '2.2', grade70: 2.5, gradeAvg: 2.31 },
      { major: '사학과', recruit: 24, rate25: 4.8, rate24: 4.5, fillRate25: '55%', fillRate24: '53%', minSatRate: '38%', realRate: 2.7, score50: 92.50, score70: 91.60, grade50: '2.4', grade70: 2.7, gradeAvg: 2.51 },
      { major: '국어국문학과', recruit: 30, rate25: 4.5, rate24: 4.2, fillRate25: '58%', fillRate24: '55%', minSatRate: '35%', realRate: 2.6, score50: 92.00, score70: 91.00, grade50: '2.5', grade70: 2.8, gradeAvg: 2.62 },
      { major: '체육학과', recruit: 27, rate25: 8.9, rate24: 8.1, fillRate25: '42%', fillRate24: '40%', minSatRate: '55%', realRate: 3.8, score50: 90.00, score70: 88.50, grade50: '2.8', grade70: 3.2, gradeAvg: 2.95 },
    ];
  }

  // ── 경희대 학생부종합(네오르네상스) 데이터 배열 (GAS, 실패 시 샘플) ────────────────
  let KHU_JONGHAP_DATA = [];
  const KHU_JONGHAP_GAS_URL = 'https://script.google.com/macros/s/AKfycbwMJQN_ecpVwtY1jLWKS3amK_6XC0IRdbcOv1ZDIbqnlKa6l6Bc0MRtix05FWenUbki/exec';

  function getKhuJonghapSampleData() {
    return [
      { name: '의학과', recruit: 12, rate2025: 32.1, rate2024: 29.4, ratio2025: 18.5, ratio2024: 16.2, doc: 87.5, interview: 88.3, cut50: 1.0, cut70: 1.1, avg: 1.05 },
      { name: '치의예과', recruit: 8, rate2025: 28.7, rate2024: 26.1, ratio2025: 20.1, ratio2024: 18.5, doc: 88.1, interview: 87.6, cut50: 1.1, cut70: 1.2, avg: 1.13 },
      { name: '한의학과(자연)', recruit: 10, rate2025: 18.5, rate2024: 16.9, ratio2025: 22.3, ratio2024: 20.1, doc: 85.3, interview: 86.2, cut50: 1.2, cut70: 1.4, avg: 1.28 },
      { name: '한의학과(인문)', recruit: 8, rate2025: 15.2, rate2024: 13.8, ratio2025: 25.0, ratio2024: 22.5, doc: 84.9, interview: 85.7, cut50: 1.2, cut70: 1.4, avg: 1.30 },
      { name: '약학과', recruit: 9, rate2025: 22.4, rate2024: 20.1, ratio2025: 19.8, ratio2024: 17.6, doc: 86.7, interview: 86.9, cut50: 1.3, cut70: 1.5, avg: 1.38 },
      { name: '간호학과(자연)', recruit: 16, rate2025: 12.3, rate2024: 11.2, ratio2025: 28.5, ratio2024: 26.3, doc: 82.4, interview: 83.1, cut50: 1.5, cut70: 1.8, avg: 1.63 },
      { name: '소프트웨어융합학과', recruit: 18, rate2025: 14.8, rate2024: 13.5, ratio2025: 24.2, ratio2024: 22.1, doc: 83.1, interview: 82.7, cut50: 1.7, cut70: 2.0, avg: 1.83 },
      { name: '컴퓨터공학과', recruit: 30, rate2025: 16.7, rate2024: 15.2, ratio2025: 22.8, ratio2024: 20.9, doc: 82.8, interview: 82.5, cut50: 1.9, cut70: 2.2, avg: 2.02 },
      { name: '전자공학과', recruit: 28, rate2025: 11.5, rate2024: 10.8, ratio2025: 26.4, ratio2024: 24.7, doc: 81.5, interview: 81.9, cut50: 2.0, cut70: 2.4, avg: 2.15 },
      { name: '경영학과', recruit: 40, rate2025: 10.2, rate2024: 9.7, ratio2025: 28.1, ratio2024: 26.2, doc: 80.3, interview: 80.8, cut50: 2.2, cut70: 2.6, avg: 2.38 },
      { name: '경제학과', recruit: 30, rate2025: 9.5, rate2024: 8.9, ratio2025: 29.5, ratio2024: 27.8, doc: 79.8, interview: 80.2, cut50: 2.3, cut70: 2.7, avg: 2.48 },
      { name: '행정학과', recruit: 22, rate2025: 8.8, rate2024: 8.2, ratio2025: 31.2, ratio2024: 29.5, doc: 79.2, interview: 79.7, cut50: 2.5, cut70: 2.9, avg: 2.67 },
      { name: '사학과', recruit: 15, rate2025: 7.6, rate2024: 7.1, ratio2025: 33.5, ratio2024: 31.8, doc: 78.5, interview: 79.0, cut50: 2.7, cut70: 3.1, avg: 2.88 },
      { name: '국어국문학과', recruit: 18, rate2025: 7.1, rate2024: 6.8, ratio2025: 34.8, ratio2024: 33.1, doc: 78.0, interview: 78.5, cut50: 2.8, cut70: 3.2, avg: 2.98 },
      { name: '체육학과', recruit: 15, rate2025: 12.6, rate2024: 11.3, ratio2025: 26.7, ratio2024: 24.8, doc: 76.2, interview: 77.1, cut50: 2.9, cut70: 3.4, avg: 3.12 },
    ];
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ██  대학 메타 정의  (전형 목록, 색상 팔레트, 데이터 스키마)
  // ════════════════════════════════════════════════════════════════════════════
  const UNI_META = {
    '건국대': {
      label: '건국대학교',
      colors: { bar: '#c4d600', barLight: '#eaf55d', barDark: '#6f7a00', accent: '#034C2F', line: '#c4d600' },
      schema: 'ku',        // 50%~70% cut floating bar
      hasYear: true,       // 학년도 드롭다운 표시
      types: () => [...new Set(KU_DATA.map(d => d['모집전형']))].sort(),
      data: () => KU_DATA,
    },
    '경희대': {
      label: '경희대학교',
      colors: { bar: '#6366f1', barLight: '#c7d2fe', barDark: '#4f46e5', accent: '#4f46e5', line: '#ef4444' },
      schema: 'khu',       // 전형마다 다름 (khu_gwagyo / khu_jonghap)
      hasYear: false,      // 학년도 드롭다운 숨김 (단일 연도)
      types: () => ['학생부교과', '학생부종합(네오르네상스)'],
      data: (type) => type === '학생부교과' ? KHU_GWAGYO_DATA : KHU_JONGHAP_DATA,
    },
    '광운대': {
      label: '광운대학교',
      colors: { bar: '#8C1515', barLight: '#d43d3d', barDark: '#5c0b0b', accent: '#8C1515', line: '#8C1515' },
      schema: 'kwu',
      hasYear: false,
      types: () => ['학생부종합(면접형)', '학생부종합(서류형)', '학생부교과(지역균형)', '학생부종합(농어촌)'],
      data: (type) => type === '학생부교과(지역균형)' ? KWU_GYOGWA_DATA : (type === '학생부종합(농어촌)' ? KWU_NONGECHON_DATA : (type === '학생부종합(서류형)' ? KWU_SEORYU_DATA : KWU_MYUNJEOP_DATA)),
    },
    '군산대': {
      label: '군산대학교',
      colors: { bar: '#3b82f6', barLight: '#bfdbfe', barDark: '#1d4ed8', accent: '#2563eb', line: '#2563eb' },
      schema: 'kunsan',
      hasYear: true,
      types: () => [...new Set(KUNSAN_DATA.map(d => d.type))].filter(Boolean).sort(),
      data: () => KUNSAN_DATA,
    },
    '동국대': {
      label: '동국대학교',
      colors: { bar: '#E55D28', barLight: '#f4a37e', barDark: '#a33d1a', accent: '#E55D28', line: '#E55D28' },
      schema: 'dgu',
      hasYear: true,
      types: () => [...new Set(DGU_DATA.map(d => d['모집전형']))].filter(Boolean).sort(),
      data: () => DGU_DATA,
    },
    '서강대': {
      label: '서강대학교',
      colors: { bar: '#004ea2', barLight: '#dfa800', barDark: '#002f61', accent: '#dfa800', line: '#004ea2' },
      schema: 'sgu',
      hasYear: false,
      types: () => [...new Set(SGU_DATA.map(d => d['모집전형']))].filter(Boolean).sort(),
      data: (type) => type ? SGU_DATA.filter(d => d['모집전형'] === type) : SGU_DATA,
    },
    '서울시립대': {
      label: '서울시립대학교',
      colors: { bar: '#1a2b50', barLight: '#4a69bd', barDark: '#0d1a32', accent: '#4a69bd', line: '#1a2b50' },
      schema: 'uos',
      hasYear: false,
      types: () => [...new Set(UOS_DATA.map(d => d.admissionType))].filter(Boolean).sort(),
      data: (type) => type ? UOS_DATA.filter(d => d.admissionType === type) : UOS_DATA,
    },
    '성균관대': {
      label: '성균관대학교',
      colors: { bar: '#003e29', barLight: '#1a6b4a', barDark: '#001f15', accent: '#003e29', line: '#003e29' },
      schema: 'sku',
      hasYear: false,
      types: () => ['학교장추천'],
      data: () => SKU_DATA,
    },
    '우석대': {
      label: '우석대학교',
      colors: { bar: '#1a3c6e', barLight: '#5b8dd9', barDark: '#0d2347', accent: '#1a3c6e', line: '#1a3c6e' },
      schema: 'wsu',
      hasYear: false,
      types: () => [...new Set(WSU_DATA.map(d => d['모집전형']))].filter(Boolean).sort(),
      data: (type) => type ? WSU_DATA.filter(d => d['모집전형'] === type) : WSU_DATA,
    },
    '원광대': {
      label: '원광대학교',
      colors: { bar: '#0d9488', barLight: '#99f6e4', barDark: '#0f766e', accent: '#0d9488', line: '#0d9488' },
      schema: 'wonkwang',
      hasYear: false,
      types: () => [...new Set(WKU_DATA.map(d => d['모집전형']))].filter(Boolean).sort(),
      data: (type) => type ? WKU_DATA.filter(d => d['모집전형'] === type) : WKU_DATA,
    },
    '전남대': {
      label: '전남대학교',
      colors: { bar: '#16a34a', barLight: '#86efac', barDark: '#15803d', accent: '#16a34a', line: '#16a34a' },
      schema: 'jnu',
      hasYear: false,
      types: () => [...new Set(JNU_DATA.map(d => d['모집전형']))].filter(Boolean).sort(),
      data: (type) => type ? JNU_DATA.filter(d => d['모집전형'] === type) : JNU_DATA,
    },
    '전주대': {
      label: '전주대학교',
      colors: { bar: '#2563eb', barLight: '#93c5fd', barDark: '#1d4ed8', accent: '#2563eb', line: '#2563eb' },
      schema: 'jju',
      hasYear: false,
      types: () => [...new Set(JJU_DATA.map(d => d['모집전형']))].filter(Boolean).sort(),
      data: (type) => type ? JJU_DATA.filter(d => d['모집전형'] === type) : JJU_DATA,
    },
    '중앙대': {
      label: '중앙대학교',
      colors: { bar: '#2a5599', barLight: '#6fa8dc', barDark: '#1e3d70', accent: '#2a5599', line: '#2a5599' },
      schema: 'cau',
      hasYear: false,
      types: () => [...new Set(CAU_DATA.map(d => d['모집전형']))].filter(Boolean).sort(),
      data: (type) => type ? CAU_DATA.filter(d => d['모집전형'] === type) : CAU_DATA,
    },
    '충남대': {
      label: '충남대학교',
      colors: { bar: '#003087', barLight: '#4a7fd4', barDark: '#001a52', accent: '#003087', line: '#003087' },
      schema: 'cnu',
      hasYear: false,
      types: () => [...new Set(CNU_DATA.map(d => d['모집전형']))].filter(Boolean).sort(),
      data: (type) => type ? CNU_DATA.filter(d => d['모집전형'] === type) : CNU_DATA,
    },
    '충북대': {
      label: '충북대학교',
      colors: { bar: '#76232F', barLight: '#a1404d', barDark: '#4d121b', accent: '#76232F', line: '#76232F' },
      schema: 'cbnu',
      hasYear: false,
      types: () => [...new Set(CBNU_DATA.map(d => d['모집전형']))].filter(Boolean).sort(),
      data: (type) => type ? CBNU_DATA.filter(d => d['모집전형'] === type) : CBNU_DATA,
    },
    '한국외대': {
      label: '한국외국어대학교',
      colors: { bar: '#002c5f', barLight: '#1a5fa8', barDark: '#001233', accent: '#002c5f', line: '#002c5f' },
      schema: 'hufs',
      hasYear: true,
      types: () => ['교과전형', '종합전형'],
      data: (type) => type === '교과전형' ? HUFS_GYOGWA_DATA : (type === '종합전형' ? HUFS_JONGHAP_DATA : [...HUFS_GYOGWA_DATA, ...HUFS_JONGHAP_DATA]),
    },
    '한양대': {
      label: '한양대학교',
      colors: { bar: '#0E4A84', barLight: '#4a80be', barDark: '#082a4e', accent: '#0E4A84', line: '#0E4A84' },
      schema: 'hyu',
      hasYear: true,
      types: () => [...new Set(HYU_DATA.map(d => d['모집전형']))].filter(Boolean).sort(),
      data: (type) => type ? HYU_DATA.filter(d => d['모집전형'] === type) : HYU_DATA,
    },
    '홍익대': {
      label: '홍익대학교',
      colors: { bar: '#1d4ed8', barLight: '#60a5fa', barDark: '#1e3a8a', accent: '#1d4ed8', line: '#1d4ed8' },
      schema: 'hiu',
      hasYear: true,
      types: () => [...new Set(HIU_DATA.map(d => d['모집전형']))].filter(Boolean).sort(),
      data: () => HIU_DATA,
    },
  };

  // ════════════════════════════════════════════════════════════════════════════
  // ██  상태
  // ════════════════════════════════════════════════════════════════════════════
  let adCurrentUni = '건국대';
  let adCurrentType = '';
  let adCurrentYear = '';
  let adCurrentYMin = 1;
  let adRawData = [];      // 현재 대학+전형의 원시 배열
  let adDispData = [];      // 필터링 후 차트용 배열 (건국대는 학년도 필터 적용)
  let adMainChart = null;
  let adInitialized = false;
  let adIsSampleData = {
    '건국대': true,
    '경희대_학생부교과': true,
    '경희대_학생부종합(네오르네상스)': true,
    '광운대_학생부종합(면접형)': true,
    '광운대_학생부종합(서류형)': true,
    '광운대_학생부교과(지역균형)': true,
    '광운대_학생부종합(농어촌)': true,
    '군산대': true,
    '동국대': true,
    '서강대': true,
    '서울시립대': true,
    '성균관대': true,
    '우석대': true,
    '원광대': true,
    '전남대': true,
    '전주대': true,
    '중앙대': true,
    '충남대': true,
    '충북대': true,
    '한국외대_교과전형': true,
    '한국외대_종합전형': true,
    '한양대': true,
    '홍익대': true
  };

  const KUNSAN_GAS_URL = 'https://script.google.com/macros/s/AKfycby-QuO_J2HgM6Zjv8YGebU3yt0o3aqzdpziHM4DDEQoRd7TfnOCx2_-w9UULTDxhEViAQ/exec';
  let KUNSAN_DATA = [];

  const DGU_GAS_URL = 'https://script.google.com/macros/s/AKfycbxyLCbdoYTs5u4sK3eHfesps1RDFYZXiX02wNzLzU6f_c4mhp__YUcGkrqBatjCGnvArw/exec';
  let DGU_DATA = [];

  const SGU_GAS_URL = 'https://script.google.com/macros/s/AKfycbyUZDxdwBsM-7IoPHjDHpov058LCG-7dN_tSJ3IAMfcwykTz8q20jmlpkd05oAMMQyuRg/exec';
  let SGU_DATA = [];

  const UOS_GAS_URL = 'https://script.google.com/macros/s/AKfycbxSgqmq8xB5K9Cs773ij1ncVL7MdHwAqJqLxaOg0VqsQGVRSpahrPqjAdHDKVfZmVFo/exec';
  let UOS_DATA = [];

  const SKU_GAS_URL = 'https://script.google.com/macros/s/AKfycbwuseOZCbY2La4aaHQR-5vi2xZ3Lu6Tm1cRld0h1fJQj7wlr2hOBdxCftjw3wgDpK662A/exec';
  let SKU_DATA = [];

  const WSU_GAS_URL = 'https://script.google.com/macros/s/AKfycbypU2ilINtxBb4QdTlishVwTVH2m4iafTOKBJFUT9kzzDv7r2NVWeOxtW91LIWmR8_5Yg/exec';
  let WSU_DATA = [];

  const WKU_GAS_URL = 'https://script.google.com/macros/s/AKfycbxq4Utz9QsDIDOL-Br1YV9PChOoPolKXdo_MCR9ZJb4I74fkDsnLaRQoEc5UXFQE4mW5w/exec';
  let WKU_DATA = [];

  const JNU_GAS_URL = 'https://script.google.com/macros/s/AKfycbwTeQxO8DmQVATLSrCNrrcatFLNl3SbnwJofL0laU7BbeTaGHAWEYTrA7ELtyIm0ylb/exec';
  let JNU_DATA = [];

  const JJU_GAS_URL = 'https://script.google.com/macros/s/AKfycbzz9UeBJks2skFzGeFB1Yz5vkfzj5akZJ_4xLXefo0ExorUZ6k1D5zxrlQzuF7AK--A-Q/exec';
  let JJU_DATA = [];

  const JBNU_GAS_URL = 'https://script.google.com/macros/s/AKfycbySdYZbJiB0mvxpvUch2p7i22IQS4aOgNcXZKxWYyMKNHxSWIed7saajcp7uHQlh2c_Eg/exec';

  const CAU_GAS_URL = 'https://script.google.com/macros/s/AKfycbwQ8dCK5uaBMghg-woMHvaOQMseVsLQcYQNZJ-7N0Lew-kO6UldFYjwiaANm_qrdnZS/exec';
  let CAU_DATA = [];

  const CNU_SHEET_ID = '1CHXWhqYoRbeM4EjU_66pr58wF64UyilYYLULDtvGs7A';
  let CNU_DATA = [];

  const CBNU_SHEET_ID = '1PxZ8WwUF11ceDZwskZpAw5nNr62FU997dc4X_5xZQ50';
  let CBNU_DATA = [];

  const HUFS_SHEET_ID = '1SWLympMm6duu5r5SNX-UiOHgV9l0pE08lA_QfeVIINk';
  let HUFS_GYOGWA_DATA = [];
  let HUFS_JONGHAP_DATA = [];

  const HYU_SHEET_ID = '1MvB5IOnKSAWVUGmlznajg_1nb47A2nGOIp2jTem-K54';
  let HYU_DATA = [];

  const HIU_SHEET_ID = '1gBcfiTZBssaNHkok-FwFRwXxcMpgQnjlB-mdB3_8e0g';
  let HIU_DATA = [];

  // ── 광운대 입결 데이터 배열 ───────────────────────────────────────
  let KWU_MYUNJEOP_DATA = [];
  let KWU_SEORYU_DATA = [];
  let KWU_GYOGWA_DATA = [];
  let KWU_NONGECHON_DATA = [];
  function getKwuSampleData() {
    return [
      { unit: '전자공학과', recruit: 20, ratio: 15.2, grade: 2.3, reserve: 10, fillRate: 50 },
      { unit: '소프트웨어학부', recruit: 15, ratio: 18.5, grade: 2.1, reserve: 8, fillRate: 53.3 }
    ];
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ██  외부 데이터 주입 API
  // ════════════════════════════════════════════════════════════════════════════
  window.injectAdmissionData = function (uniName, typeOrArray, dataArray) {
    if (uniName === '건국대') {
      KU_DATA.length = 0;
      (typeOrArray || []).forEach(r => KU_DATA.push(r));
    } else if (uniName === '경희대') {
      if (typeOrArray === '학생부교과') {
        KHU_GWAGYO_DATA.length = 0;
        (dataArray || []).forEach(r => KHU_GWAGYO_DATA.push(r));
      } else {
        KHU_JONGHAP_DATA.length = 0;
        (dataArray || []).forEach(r => KHU_JONGHAP_DATA.push(r));
      }
    } else if (uniName === '군산대') {
      KUNSAN_DATA.length = 0;
      (typeOrArray || []).forEach(r => KUNSAN_DATA.push(r));
    } else if (uniName === '동국대') {
      DGU_DATA.length = 0;
      (typeOrArray || []).forEach(r => DGU_DATA.push(r));
    } else if (uniName === '서강대') {
      SGU_DATA.length = 0;
      (typeOrArray || []).forEach(r => SGU_DATA.push(r));
    } else if (uniName === '서울시립대') {
      UOS_DATA.length = 0;
      (typeOrArray || []).forEach(r => UOS_DATA.push(r));
    } else if (uniName === '성균관대') {
      SKU_DATA.length = 0;
      (typeOrArray || []).forEach(r => SKU_DATA.push(r));
    } else if (uniName === '우석대') {
      WSU_DATA.length = 0;
      (typeOrArray || []).forEach(r => WSU_DATA.push(r));
    } else if (uniName === '광운대') {
      if (typeOrArray === '학생부교과(지역균형)') {
        KWU_GYOGWA_DATA.length = 0;
        (dataArray || []).forEach(r => KWU_GYOGWA_DATA.push(r));
      } else if (typeOrArray === '학생부종합(농어촌)') {
        KWU_NONGECHON_DATA.length = 0;
        (dataArray || []).forEach(r => KWU_NONGECHON_DATA.push(r));
      } else if (typeOrArray === '학생부종합(서류형)') {
        KWU_SEORYU_DATA.length = 0;
        (dataArray || []).forEach(r => KWU_SEORYU_DATA.push(r));
      } else {
        KWU_MYUNJEOP_DATA.length = 0;
        (dataArray || []).forEach(r => KWU_MYUNJEOP_DATA.push(r));
      }
    } else if (uniName === '충남대') {
      CNU_DATA.length = 0;
      (typeOrArray || []).forEach(r => CNU_DATA.push(r));
    } else if (uniName === '충북대') {
      CBNU_DATA.length = 0;
      (typeOrArray || []).forEach(r => CBNU_DATA.push(r));
    } else if (uniName === '한국외대') {
      if (typeOrArray === '교과전형') {
        HUFS_GYOGWA_DATA.length = 0;
        (dataArray || []).forEach(r => HUFS_GYOGWA_DATA.push(r));
      } else {
        HUFS_JONGHAP_DATA.length = 0;
        (dataArray || []).forEach(r => HUFS_JONGHAP_DATA.push(r));
      }
    } else if (uniName === '한양대') {
      HYU_DATA.length = 0;
      (typeOrArray || []).forEach(r => HYU_DATA.push(r));
    } else if (uniName === '홍익대') {
      HIU_DATA.length = 0;
      (typeOrArray || []).forEach(r => HIU_DATA.push(r));
    }
    if (adCurrentUni === uniName) loadData(uniName);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // ██  데이터 로드 함수 (GAS JSONP)
  // ════════════════════════════════════════════════════════════════════════════
  function fetchGasJsonp(url, params) {
    return new Promise((resolve, reject) => {
      const cbName = '__gasJsonp_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const script = document.createElement('script');

      const timer = setTimeout(() => {
        cleanup(); reject(new Error('GAS Timeout'));
      }, 10000);

      function cleanup() {
        clearTimeout(timer);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = function (data) { cleanup(); resolve(data); };
      script.onerror = function () { cleanup(); reject(new Error('GAS Network Error')); };

      const qs = new URLSearchParams(params);
      qs.set('callback', cbName);
      script.src = url + '?' + qs.toString();
      document.head.appendChild(script);
    });
  }

  async function fetchKuDataFromGas() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '건국대학교 데이터를 불러오는 중...';
    try {
      const data = await fetchGasJsonp(KU_GAS_URL, { action: 'getData' });
      if (data && Array.isArray(data)) {
        // GAS가 2차원 배열(첫 행이 헤더)을 반환할 경우 객체 배열로 변환
        if (data.length > 0 && Array.isArray(data[0])) {
          const headers = data[0];
          KU_DATA = data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
        } else {
          KU_DATA = data;
        }
      } else if (data && data.data && Array.isArray(data.data)) {
        if (data.data.length > 0 && Array.isArray(data.data[0])) {
          const headers = data.data[0];
          KU_DATA = data.data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
        } else {
          KU_DATA = data.data;
        }
      } else {
        throw new Error('Invalid data format');
      }
      if (badge) badge.textContent = `데이터 로드 완료! (총 ${KU_DATA.length}건)`;
      adIsSampleData['건국대'] = false; // 실제 데이터 로드 성공
    } catch (e) {
      console.error('KU Data Fetch Error:', e);
      if (badge) badge.textContent = '실제 데이터를 불러오는데 실패하여 샘플 데이터를 표시합니다.';
      KU_DATA = getKuSampleData();
      adIsSampleData['건국대'] = true; // 샘플 데이터로 대체
    }
  }

  async function fetchKhuJonghapDataFromGas() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '경희대학교 종합전형 데이터를 불러오는 중...';
    try {
      const data = await fetchGasJsonp(KHU_JONGHAP_GAS_URL, { action: 'getData' });

      const headerMap = {
        '모집단위': 'name', '학과명': 'name', '학과': 'name',
        '모집인원': 'recruit', '인원': 'recruit',
        '25경쟁률': 'rate2025', '2025경쟁률': 'rate2025', '경쟁률(25)': 'rate2025',
        '24경쟁률': 'rate2024', '2024경쟁률': 'rate2024', '경쟁률(24)': 'rate2024',
        '25충원율': 'ratio2025', '2025충원율': 'ratio2025', '충원율(25)': 'ratio2025', '25충원율(%)': 'ratio2025',
        '24충원율': 'ratio2024', '2024충원율': 'ratio2024', '충원율(24)': 'ratio2024', '24충원율(%)': 'ratio2024',
        '서류': 'doc', '서류평가': 'doc', '서류점수': 'doc',
        '면접': 'interview', '면접평가': 'interview', '면접점수': 'interview',
        '50%cut': 'cut50', '50%cut(등급)': 'cut50', '50%컷': 'cut50', '50%cut(합격자)': 'cut50',
        '70%cut': 'cut70', '70%cut(등급)': 'cut70', '70%컷': 'cut70', '70%cut(합격자)': 'cut70',
        '평균': 'avg', '평균등급': 'avg', '평균(등급)': 'avg', '합격자평균': 'avg'
      };

      if (data && Array.isArray(data)) {
        if (data.length > 0 && Array.isArray(data[0])) {
          const headers = data[0];
          KHU_JONGHAP_DATA = data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => {
              const key = headerMap[h] || h;
              obj[key] = row[i];
            });
            return obj;
          });
        } else {
          KHU_JONGHAP_DATA = data;
        }
      } else if (data && data.data && Array.isArray(data.data)) {
        if (data.data.length > 0 && Array.isArray(data.data[0])) {
          const headers = data.data[0];
          KHU_JONGHAP_DATA = data.data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => {
              const key = headerMap[h] || h;
              obj[key] = row[i];
            });
            return obj;
          });
        } else {
          KHU_JONGHAP_DATA = data.data;
        }
      } else {
        throw new Error('Invalid data format');
      }
      adIsSampleData['경희대_학생부종합(네오르네상스)'] = false;
    } catch (e) {
      console.error('KHU Jonghap Data Fetch Error:', e);
      KHU_JONGHAP_DATA = getKhuJonghapSampleData();
      adIsSampleData['경희대_학생부종합(네오르네상스)'] = true;
    }
  }

  async function fetchKhuGwagyoDataFromGas() {
    if (!KHU_GWAGYO_GAS_URL) {
      KHU_GWAGYO_DATA = getKhuGwagyoSampleData();
      adIsSampleData['경희대_학생부교과'] = true;
      return;
    }

    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '경희대학교 교과전형 데이터를 불러오는 중...';
    try {
      const data = await fetchGasJsonp(KHU_GWAGYO_GAS_URL, { action: 'getData' });

      const headerMap = {
        '모집단위': 'major', '학과명': 'major', '학과': 'major',
        '모집인원': 'recruit', '인원': 'recruit',
        '25경쟁률': 'rate25', '2025경쟁률': 'rate25', '경쟁률(25)': 'rate25',
        '24경쟁률': 'rate24', '2024경쟁률': 'rate24', '경쟁률(24)': 'rate24',
        '25충원율': 'fillRate25', '2025충원율': 'fillRate25', '충원율(25)': 'fillRate25',
        '24충원율': 'fillRate24', '2024충원율': 'fillRate24', '충원율(24)': 'fillRate24',
        '수능최저충족률': 'minSatRate', '최저충족률': 'minSatRate', '수능최저': 'minSatRate',
        '실질경쟁률': 'realRate', '실질': 'realRate',
        '환산점수50%cut': 'score50', '50%cut(환산점수)': 'score50', '환산50%': 'score50',
        '환산점수70%cut': 'score70', '70%cut(환산점수)': 'score70', '환산70%': 'score70',
        '등급50%cut': 'grade50', '50%cut(등급)': 'grade50', '50%컷': 'grade50',
        '등급70%cut': 'grade70', '70%cut(등급)': 'grade70', '70%컷': 'grade70',
        '평균': 'gradeAvg', '평균등급': 'gradeAvg', '합격자평균': 'gradeAvg'
      };

      if (data && Array.isArray(data)) {
        if (data.length > 0 && Array.isArray(data[0])) {
          const headers = data[0];
          KHU_GWAGYO_DATA = data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => {
              const key = headerMap[h] || h;
              obj[key] = row[i];
            });
            return obj;
          });
        } else {
          KHU_GWAGYO_DATA = data;
        }
      } else if (data && data.data && Array.isArray(data.data)) {
        if (data.data.length > 0 && Array.isArray(data.data[0])) {
          const headers = data.data[0];
          KHU_GWAGYO_DATA = data.data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => {
              const key = headerMap[h] || h;
              obj[key] = row[i];
            });
            return obj;
          });
        } else {
          KHU_GWAGYO_DATA = data.data;
        }
      } else {
        throw new Error('Invalid data format');
      }
      adIsSampleData['경희대_학생부교과'] = false;
    } catch (e) {
      console.error('KHU Gwagyo Data Fetch Error:', e);
      KHU_GWAGYO_DATA = getKhuGwagyoSampleData();
      adIsSampleData['경희대_학생부교과'] = true;
    }
  }

  async function fetchKwuDataFromGviz() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '광운대학교 데이터를 불러오는 중...';

    async function fetchSheet(sheetName) {
      const response = await fetch(`https://docs.google.com/spreadsheets/d/14EeUCq-G5dZLISf7L4AANGHu1Ny1ik5WKtpQ64dckdk/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`);
      const text = await response.text();
      const jsonStr = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/)[1];
      const json = JSON.parse(jsonStr);
      return json.table.rows.map(r => {
        const row = r.c;
        return {
          unit: row[0] ? row[0].v : '',
          recruit: row[1] ? row[1].v : 0,
          ratio: row[3] ? row[3].v : 0,
          grade: row[4] ? row[4].v : '',
          reserve: row[5] ? row[5].v : 0,
          fillRate: row[6] ? row[6].v : 0
        };
      }).filter(item => item.grade !== '' && !isNaN(parseFloat(item.grade)));
    }

    try {
      const [myunjeop, seoryu, gyogwa, nongechon] = await Promise.all([
        fetchSheet('학생부종합(면접형)'),
        fetchSheet('학생부종합(서류형)'),
        fetchSheet('학생부교과(지역균형)'),
        fetchSheet('학생부종합(농어촌)')
      ]);
      KWU_MYUNJEOP_DATA = myunjeop;
      KWU_SEORYU_DATA = seoryu;
      KWU_GYOGWA_DATA = gyogwa;
      KWU_NONGECHON_DATA = nongechon;
      adIsSampleData['광운대_학생부종합(면접형)'] = false;
      adIsSampleData['광운대_학생부종합(서류형)'] = false;
      adIsSampleData['광운대_학생부교과(지역균형)'] = false;
      adIsSampleData['광운대_학생부종합(농어촌)'] = false;
    } catch (e) {
      console.error('KWU Data Fetch Error:', e);
      KWU_MYUNJEOP_DATA = getKwuSampleData();
      KWU_SEORYU_DATA = getKwuSampleData();
      KWU_GYOGWA_DATA = getKwuSampleData();
      KWU_NONGECHON_DATA = getKwuSampleData();
      adIsSampleData['광운대_학생부종합(면접형)'] = true;
      adIsSampleData['광운대_학생부종합(서류형)'] = true;
      adIsSampleData['광운대_학생부교과(지역균형)'] = true;
      adIsSampleData['광운대_학생부종합(농어촌)'] = true;
    }
  }

  function getKunsanSampleData() {
    return [
      // 2025 학생부교과(일반)
      { year: 2025, type: '학생부교과(일반)', major: '간호학과', recruitNum: 25, rate: 12.4, avgGrade: 2.3, cut70Grade: 2.7 },
      { year: 2025, type: '학생부교과(일반)', major: '컴퓨터정보공학부', recruitNum: 40, rate: 8.1, avgGrade: 2.9, cut70Grade: 3.4 },
      { year: 2025, type: '학생부교과(일반)', major: '전기공학과', recruitNum: 30, rate: 6.5, avgGrade: 3.1, cut70Grade: 3.6 },
      { year: 2025, type: '학생부교과(일반)', major: '기계공학부', recruitNum: 35, rate: 5.8, avgGrade: 3.3, cut70Grade: 3.8 },
      { year: 2025, type: '학생부교과(일반)', major: '경영학부', recruitNum: 50, rate: 7.2, avgGrade: 3.2, cut70Grade: 3.7 },
      { year: 2025, type: '학생부교과(일반)', major: '행정학과', recruitNum: 25, rate: 6.0, avgGrade: 3.4, cut70Grade: 3.9 },
      { year: 2025, type: '학생부교과(일반)', major: '사회복지학과', recruitNum: 20, rate: 5.3, avgGrade: 3.6, cut70Grade: 4.1 },
      { year: 2025, type: '학생부교과(일반)', major: '화학공학과', recruitNum: 28, rate: 5.1, avgGrade: 3.5, cut70Grade: 4.0 },
      { year: 2025, type: '학생부교과(일반)', major: '건축공학과', recruitNum: 22, rate: 6.8, avgGrade: 3.2, cut70Grade: 3.7 },
      { year: 2025, type: '학생부교과(일반)', major: '환경공학과', recruitNum: 18, rate: 4.9, avgGrade: 3.8, cut70Grade: 4.3 },
      // 2025 학생부종합(창의인재)
      { year: 2025, type: '학생부종합(창의인재)', major: '간호학과', recruitNum: 15, rate: 10.2, avgGrade: 2.6, cut70Grade: 3.1 },
      { year: 2025, type: '학생부종합(창의인재)', major: '컴퓨터정보공학부', recruitNum: 20, rate: 7.3, avgGrade: 3.2, cut70Grade: 3.7 },
      { year: 2025, type: '학생부종합(창의인재)', major: '전기공학과', recruitNum: 18, rate: 5.9, avgGrade: 3.4, cut70Grade: 3.9 },
      { year: 2025, type: '학생부종합(창의인재)', major: '기계공학부', recruitNum: 20, rate: 5.4, avgGrade: 3.5, cut70Grade: 4.1 },
      { year: 2025, type: '학생부종합(창의인재)', major: '경영학부', recruitNum: 25, rate: 6.5, avgGrade: 3.5, cut70Grade: 4.0 },
      // 2024 학생부교과(일반)
      { year: 2024, type: '학생부교과(일반)', major: '간호학과', recruitNum: 24, rate: 11.8, avgGrade: 2.4, cut70Grade: 2.9 },
      { year: 2024, type: '학생부교과(일반)', major: '컴퓨터정보공학부', recruitNum: 38, rate: 7.6, avgGrade: 3.0, cut70Grade: 3.5 },
      { year: 2024, type: '학생부교과(일반)', major: '전기공학과', recruitNum: 28, rate: 6.1, avgGrade: 3.2, cut70Grade: 3.7 },
      { year: 2024, type: '학생부교과(일반)', major: '기계공학부', recruitNum: 33, rate: 5.4, avgGrade: 3.4, cut70Grade: 3.9 },
      { year: 2024, type: '학생부교과(일반)', major: '경영학부', recruitNum: 48, rate: 6.9, avgGrade: 3.3, cut70Grade: 3.8 },
      { year: 2024, type: '학생부교과(일반)', major: '행정학과', recruitNum: 24, rate: 5.7, avgGrade: 3.5, cut70Grade: 4.0 },
      // 2024 학생부종합(창의인재)
      { year: 2024, type: '학생부종합(창의인재)', major: '간호학과', recruitNum: 14, rate: 9.8, avgGrade: 2.7, cut70Grade: 3.2 },
      { year: 2024, type: '학생부종합(창의인재)', major: '컴퓨터정보공학부', recruitNum: 18, rate: 7.0, avgGrade: 3.3, cut70Grade: 3.8 },
      { year: 2024, type: '학생부종합(창의인재)', major: '전기공학과', recruitNum: 16, rate: 5.5, avgGrade: 3.5, cut70Grade: 4.0 },
    ];
  }

  function getDguSampleData() {
    return [
      { '학년도': 2025, '모집전형': '학생부종합(Do Dream)', '모집단위': '문화유산학과', '모집인원': 3, '지원인원': 47, '경쟁률': 15.67, '평균(등급)': 2.46, '최저(등급)': 2.63, '10과목평균(등급)': null, '10과목최저(등급)': null, '충원율': '100%' },
      { '학년도': 2025, '모집전형': '학생부종합(Do Dream)', '모집단위': '국어국문·문예창작학부', '모집인원': 7, '지원인원': 181, '경쟁률': 25.86, '평균(등급)': 2.58, '최저(등급)': 2.88, '10과목평균(등급)': null, '10과목최저(등급)': null, '충원율': '129%' },
      { '학년도': 2025, '모집전형': '학생부종합(Do Dream)', '모집단위': '영어영문학부', '모집인원': 15, '지원인원': 270, '경쟁률': 18.00, '평균(등급)': 3.58, '최저(등급)': 4.50, '10과목평균(등급)': null, '10과목최저(등급)': null, '충원율': '153%' },
      { '학년도': 2025, '모집전형': '학생부교과(학교장추천인재)', '모집단위': '문화유산학과', '모집인원': 5, '지원인원': 55, '경쟁률': 11.00, '평균(등급)': 1.70, '최저(등급)': 1.95, '10과목평균(등급)': 1.45, '10과목최저(등급)': 1.75, '충원율': '200%' },
      { '학년도': 2025, '모집전형': '학생부교과(학교장추천인재)', '모집단위': '국어국문·문예창작학부', '모집인원': 6, '지원인원': 72, '경쟁률': 12.00, '평균(등급)': 1.65, '최저(등급)': 1.88, '10과목평균(등급)': 1.30, '10과목최저(등급)': 1.60, '충원율': '150%' },
      { '학년도': 2024, '모집전형': '학생부종합(Do Dream)', '모집단위': '문화유산학과', '모집인원': 4, '지원인원': 40, '경쟁률': 10.00, '평균(등급)': 2.30, '최저(등급)': 2.70, '10과목평균(등급)': null, '10과목최저(등급)': null, '충원율': '75%' },
      { '학년도': 2024, '모집전형': '학생부종합(Do Dream)', '모집단위': '국어국문·문예창작학부', '모집인원': 6, '지원인원': 150, '경쟁률': 25.00, '평균(등급)': 2.65, '최저(등급)': 3.10, '10과목평균(등급)': null, '10과목최저(등급)': null, '충원율': '100%' },
      { '학년도': 2023, '모집전형': '학생부종합(Do Dream)', '모집단위': '문화유산학과', '모집인원': 3, '지원인원': 35, '경쟁률': 11.60, '평균(등급)': 2.50, '최저(등급)': 2.80, '10과목평균(등급)': null, '10과목최저(등급)': null, '충원율': '50%' },
      { '학년도': 2023, '모집전형': '학생부종합(Do Dream)', '모집단위': '국어국문·문예창작학부', '모집인원': 7, '지원인원': 140, '경쟁률': 20.00, '평균(등급)': 2.45, '최저(등급)': 2.95, '10과목평균(등급)': null, '10과목최저(등급)': null, '충원율': '110%' },
    ];
  }

  function getSguSampleData() {
    return [
      // 학생부교과(지역균형)
      { '모집전형': '학생부교과(지역균형)', '모집단위': '컴퓨터공학과', '모집인원': 6, '지원인원': 89, '최초경쟁률': 14.8, '최종 실질 경쟁률': 3.1, '충원율 (%)': 183, '50%cut': 1.32, '70%cut': 1.45, '합격인원': 6 },
      { '모집전형': '학생부교과(지역균형)', '모집단위': '경제학부', '모집인원': 8, '지원인원': 105, '최초경쟁률': 13.1, '최종 실질 경쟁률': 2.9, '충원율 (%)': 150, '50%cut': 1.41, '70%cut': 1.58, '합격인원': 8 },
      { '모집전형': '학생부교과(지역균형)', '모집단위': '경영학부', '모집인원': 10, '지원인원': 128, '최초경쟁률': 12.8, '최종 실질 경쟁률': 2.7, '충원율 (%)': 140, '50%cut': 1.45, '70%cut': 1.62, '합격인원': 10 },
      { '모집전형': '학생부교과(지역균형)', '모집단위': '전자공학과', '모집인원': 7, '지원인원': 92, '최초경쟁률': 13.1, '최종 실질 경쟁률': 2.8, '충원율 (%)': 157, '50%cut': 1.52, '70%cut': 1.70, '합격인원': 7 },
      { '모집전형': '학생부교과(지역균형)', '모집단위': '화학과', '모집인원': 5, '지원인원': 61, '최초경쟁률': 12.2, '최종 실질 경쟁률': 2.6, '충원율 (%)': 120, '50%cut': 1.58, '70%cut': 1.76, '합격인원': 5 },
      { '모집전형': '학생부교과(지역균형)', '모집단위': '사회과학부', '모집인원': 8, '지원인원': 96, '최초경쟁률': 12.0, '최종 실질 경쟁률': 2.5, '충원율 (%)': 138, '50%cut': 1.62, '70%cut': 1.81, '합격인원': 8 },
      { '모집전형': '학생부교과(지역균형)', '모집단위': '인문학부', '모집인원': 7, '지원인원': 82, '최초경쟁률': 11.7, '최종 실질 경쟁률': 2.4, '충원율 (%)': 129, '50%cut': 1.71, '70%cut': 1.92, '합격인원': 7 },
      { '모집전형': '학생부교과(지역균형)', '모집단위': '수학과', '모집인원': 5, '지원인원': 58, '최초경쟁률': 11.6, '최종 실질 경쟁률': 2.4, '충원율 (%)': 120, '50%cut': 1.78, '70%cut': 1.98, '합격인원': 5 },
      { '모집전형': '학생부교과(지역균형)', '모집단위': '물리학과', '모집인원': 4, '지원인원': 46, '최초경쟁률': 11.5, '최종 실질 경쟁률': 2.3, '충원율 (%)': 100, '50%cut': 1.83, '70%cut': 2.04, '합격인원': 4 },
      { '모집전형': '학생부교과(지역균형)', '모집단위': '신문방송학과', '모집인원': 4, '지원인원': 50, '최초경쟁률': 12.5, '최종 실질 경쟁률': 2.6, '충원율 (%)': 125, '50%cut': 1.87, '70%cut': 2.08, '합격인원': 4 },
      // 학생부종합(알바트로스)
      { '모집전형': '학생부종합(알바트로스)', '모집단위': '컴퓨터공학과', '모집인원': 15, '지원인원': 310, '최초경쟁률': 20.7, '최종 실질 경쟁률': 5.2, '충원율 (%)': 213, '50%cut': 1.85, '70%cut': 2.10, '합격인원': 15 },
      { '모집전형': '학생부종합(알바트로스)', '모집단위': '경제학부', '모집인원': 18, '지원인원': 340, '최초경쟁률': 18.9, '최종 실질 경쟁률': 4.9, '충원율 (%)': 189, '50%cut': 1.92, '70%cut': 2.18, '합격인원': 18 },
      { '모집전형': '학생부종합(알바트로스)', '모집단위': '경영학부', '모집인원': 22, '지원인원': 398, '최초경쟁률': 18.1, '최종 실질 경쟁률': 4.7, '충원율 (%)': 177, '50%cut': 1.98, '70%cut': 2.24, '합격인원': 22 },
      { '모집전형': '학생부종합(알바트로스)', '모집단위': '전자공학과', '모집인원': 17, '지원인원': 298, '최초경쟁률': 17.5, '최종 실질 경쟁률': 4.5, '충원율 (%)': 165, '50%cut': 2.05, '70%cut': 2.31, '합격인원': 17 },
      { '모집전형': '학생부종합(알바트로스)', '모집단위': '화학과', '모집인원': 12, '지원인원': 203, '최초경쟁률': 16.9, '최종 실질 경쟁률': 4.3, '충원율 (%)': 158, '50%cut': 2.14, '70%cut': 2.42, '합격인원': 12 },
      { '모집전형': '학생부종합(알바트로스)', '모집단위': '사회과학부', '모집인원': 16, '지원인원': 267, '최초경쟁률': 16.7, '최종 실질 경쟁률': 4.2, '충원율 (%)': 150, '50%cut': 2.22, '70%cut': 2.50, '합격인원': 16 },
      { '모집전형': '학생부종합(알바트로스)', '모집단위': '인문학부', '모집인원': 14, '지원인원': 228, '최초경쟁률': 16.3, '최종 실질 경쟁률': 4.0, '충원율 (%)': 143, '50%cut': 2.31, '70%cut': 2.60, '합격인원': 14 },
      { '모집전형': '학생부종합(알바트로스)', '모집단위': '수학과', '모집인원': 10, '지원인원': 158, '최초경쟁률': 15.8, '최종 실질 경쟁률': 3.8, '충원율 (%)': 130, '50%cut': 2.38, '70%cut': 2.68, '합격인원': 10 },
    ];
  }

  function getUosSampleData() {
    return [
      { admissionType: '서울시립대_지역균형', dept: '수학과', grade: 1.82, stdDev: 0.12, regCount: 20, score: null },
      { admissionType: '서울시립대_지역균형', dept: '물리학과', grade: 2.05, stdDev: 0.10, regCount: 15, score: null },
      { admissionType: '서울시립대_지역균형', dept: '컴퓨터과학부', grade: 1.55, stdDev: 0.09, regCount: 30, score: null },
      { admissionType: '서울시립대_지역균형', dept: '전자전기컴퓨터공학부', grade: 1.68, stdDev: 0.11, regCount: 35, score: null },
      { admissionType: '서울시립대_지역균형', dept: '경영학부', grade: 1.72, stdDev: 0.13, regCount: 40, score: null },
      { admissionType: '서울시립대_지역균형', dept: '경제학부', grade: 1.80, stdDev: 0.14, regCount: 25, score: null },
      { admissionType: '서울시립대_지역균형', dept: '건축학부', grade: 1.95, stdDev: 0.15, regCount: 20, score: null },
      { admissionType: '서울시립대_지역균형', dept: '도시공학과', grade: 2.10, stdDev: 0.18, regCount: 18, score: null },
      { admissionType: '서울시립대_지역균형', dept: '환경공학부', grade: 2.25, stdDev: 0.20, regCount: 22, score: null },
      { admissionType: '서울시립대_지역균형', dept: '화학공학과', grade: 2.38, stdDev: 0.22, regCount: 18, score: null },
      { admissionType: '학생부종합전형Ⅰ', dept: '수학과', grade: 2.20, stdDev: 0.35, regCount: 15, score: null },
      { admissionType: '학생부종합전형Ⅰ', dept: '물리학과', grade: 2.45, stdDev: 0.40, regCount: 12, score: null },
      { admissionType: '학생부종합전형Ⅰ', dept: '컴퓨터과학부', grade: 1.90, stdDev: 0.38, regCount: 25, score: null },
      { admissionType: '학생부종합전형Ⅰ', dept: '전자전기컴퓨터공학부', grade: 2.05, stdDev: 0.42, regCount: 30, score: null },
      { admissionType: '학생부종합전형Ⅱ', dept: '경영학부', grade: 2.15, stdDev: 0.45, regCount: 35, score: null },
      { admissionType: '학생부종합전형Ⅱ', dept: '경제학부', grade: 2.28, stdDev: 0.48, regCount: 20, score: null },
      { admissionType: '학생부종합전형Ⅱ', dept: '건축학부', grade: 2.40, stdDev: 0.50, regCount: 18, score: null },
      { admissionType: '학생부종합전형Ⅱ', dept: '도시공학과', grade: 2.55, stdDev: 0.52, regCount: 16, score: null },
      { admissionType: '기회균형전형I 및 사회공헌·통합전형', dept: '환경공학부', grade: 2.68, stdDev: 0.55, regCount: 20, score: null },
      { admissionType: '기회균형전형I 및 사회공헌·통합전형', dept: '화학공학과', grade: 2.75, stdDev: 0.58, regCount: 15, score: null },
    ];
  }

  function getSkuSampleData() {
    return [
      { '모집단위': '글로벌경영학과', '모집 인원': 29, '지원 인원': 361, '경쟁률': 12.4, '충원합격 인원': 9, '충원율': '31%', '50%cut': 1.40, '70%cut': 1.56 },
      { '모집단위': '경제학과', '모집 인원': 23, '지원 인원': 272, '경쟁률': 11.8, '충원합격 인원': 7, '충원율': '30%', '50%cut': 1.43, '70%cut': 1.59 },
      { '모집단위': '통계학과', '모집 인원': 14, '지원 인원': 155, '경쟁률': 11.1, '충원합격 인원': 5, '충원율': '36%', '50%cut': 1.48, '70%cut': 1.65 },
      { '모집단위': '전자전기공학부', '모집 인원': 46, '지원 인원': 495, '경쟁률': 10.8, '충원합격 인원': 13, '충원율': '28%', '50%cut': 1.51, '70%cut': 1.68 },
      { '모집단위': '소프트웨어학과', '모집 인원': 28, '지원 인원': 290, '경쟁률': 10.4, '충원합격 인원': 8, '충원율': '29%', '50%cut': 1.53, '70%cut': 1.70 },
      { '모집단위': '컴퓨터교육과', '모집 인원': 12, '지원 인원': 118, '경쟁률': 9.8, '충원합격 인원': 4, '충원율': '33%', '50%cut': 1.57, '70%cut': 1.74 },
      { '모집단위': '화학공학고분자공학부', '모집 인원': 33, '지원 인원': 309, '경쟁률': 9.4, '충원합격 인원': 9, '충원율': '27%', '50%cut': 1.61, '70%cut': 1.79 },
      { '모집단위': '기계공학부', '모집 인원': 37, '지원 인원': 337, '경쟁률': 9.1, '충원합격 인원': 10, '충원율': '27%', '50%cut': 1.64, '70%cut': 1.82 },
      { '모집단위': '신소재공학부', '모집 인원': 20, '지원 인원': 173, '경쟁률': 8.7, '충원합격 인원': 6, '충원율': '30%', '50%cut': 1.68, '70%cut': 1.87 },
      { '모집단위': '수학교육과', '모집 인원': 11, '지원 인원': 92, '경쟁률': 8.4, '충원합격 인원': 3, '충원율': '27%', '50%cut': 1.71, '70%cut': 1.90 },
      { '모집단위': '건축학과', '모집 인원': 18, '지원 인원': 145, '경쟁률': 8.1, '충원합격 인원': 5, '충원율': '28%', '50%cut': 1.74, '70%cut': 1.94 },
      { '모집단위': '사학과', '모집 인원': 10, '지원 인원': 79, '경쟁률': 7.9, '충원합격 인원': 3, '충원율': '30%', '50%cut': 1.78, '70%cut': 1.98 },
    ];
  }

  function getWsuSampleData() {
    return [
      { '모집전형': '지역인재', '모집단위': '의예과', '모집인원': 15, '경쟁률': 28.3, '충원합격순위': 3, '평균': 3.2, '70% cut': 3.8, '환산점수70% cut': 425.6 },
      { '모집전형': '지역인재', '모집단위': '한의예과', '모집인원': 10, '경쟁률': 22.1, '충원합격순위': 2, '평균': 3.5, '70% cut': 4.1, '환산점수70% cut': 418.3 },
      { '모집전형': '지역인재', '모집단위': '약학과', '모집인원': 12, '경쟁률': 19.7, '충원합격순위': 5, '평균': 3.8, '70% cut': 4.4, '환산점수70% cut': 411.2 },
      { '모집전형': '지역인재', '모집단위': '간호학과', '모집인원': 18, '경쟁률': 12.4, '충원합격순위': 8, '평균': 4.1, '70% cut': 4.7, '환산점수70% cut': 402.5 },
      { '모집전형': '지역인재', '모집단위': '물리치료학과', '모집인원': 16, '경쟁률': 10.2, '충원합격순위': 6, '평균': 4.5, '70% cut': 5.1, '환산점수70% cut': 391.8 },
      { '모집전형': '지역인재', '모집단위': '임상병리학과', '모집인원': 14, '경쟁률': 8.9, '충원합격순위': 4, '평균': 4.8, '70% cut': 5.4, '환산점수70% cut': 383.4 },
      { '모집전형': '지역인재', '모집단위': '경영학과', '모집인원': 20, '경쟁률': 6.5, '충원합격순위': 9, '평균': 5.2, '70% cut': 5.9, '환산점수70% cut': 371.2 },
      { '모집전형': '지역인재', '모집단위': '사회복지학과', '모집인원': 22, '경쟁률': 5.3, '충원합격순위': 7, '평균': 5.5, '70% cut': 6.2, '환산점수70% cut': 362.8 },
      { '모집전형': '교과전형', '모집단위': '의예과', '모집인원': 20, '경쟁률': 31.5, '충원합격순위': 2, '평균': 2.9, '70% cut': 3.4, '환산점수70% cut': 432.1 },
      { '모집전형': '교과전형', '모집단위': '한의예과', '모집인원': 15, '경쟁률': 25.8, '충원합격순위': 3, '평균': 3.2, '70% cut': 3.7, '환산점수70% cut': 424.6 },
      { '모집전형': '교과전형', '모집단위': '약학과', '모집인원': 15, '경쟁률': 21.3, '충원합격순위': 4, '평균': 3.5, '70% cut': 4.1, '환산점수70% cut': 416.8 },
      { '모집전형': '교과전형', '모집단위': '간호학과', '모집인원': 25, '경쟁률': 13.7, '충원합격순위': 11, '평균': 3.9, '70% cut': 4.5, '환산점수70% cut': 405.3 },
    ];
  }

  async function fetchUosDataFromGas() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '서울시립대학교 데이터를 불러오는 중...';
    try {
      const data = await fetchGasJsonp(UOS_GAS_URL, { action: 'getAllData' });
      if (data && Array.isArray(data)) {
        if (data.length > 0 && Array.isArray(data[0])) {
          const headers = data[0];
          UOS_DATA = data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
        } else {
          UOS_DATA = data;
        }
      } else if (data && data.data && Array.isArray(data.data)) {
        if (data.data.length > 0 && Array.isArray(data.data[0])) {
          const headers = data.data[0];
          UOS_DATA = data.data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
        } else {
          UOS_DATA = data.data;
        }
      } else {
        throw new Error('Invalid data format');
      }
      UOS_DATA = UOS_DATA.filter(d => d.admissionType && d.dept && d.grade !== '' && !isNaN(parseFloat(d.grade)));
      UOS_DATA.forEach(d => {
        d.grade = parseFloat(d.grade);
        d.stdDev = parseFloat(d.stdDev) || 0;
      });
      adIsSampleData['서울시립대'] = false;
    } catch (e) {
      console.error('UOS Data Fetch Error:', e);
      UOS_DATA = getUosSampleData();
      adIsSampleData['서울시립대'] = true;
    }
  }

  async function fetchDguDataFromGas() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '동국대학교 데이터를 불러오는 중...';
    try {
      const data = await fetchGasJsonp(DGU_GAS_URL, { action: 'getData' });
      if (data && Array.isArray(data)) {
        if (data.length > 0 && Array.isArray(data[0])) {
          const headers = data[0];
          DGU_DATA = data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
        } else {
          DGU_DATA = data;
        }
      } else if (data && data.data && Array.isArray(data.data)) {
        if (data.data.length > 0 && Array.isArray(data.data[0])) {
          const headers = data.data[0];
          DGU_DATA = data.data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
        } else {
          DGU_DATA = data.data;
        }
      } else {
        throw new Error('Invalid data format');
      }
      adIsSampleData['동국대'] = false;
    } catch (e) {
      console.error('DGU Data Fetch Error:', e);
      DGU_DATA = getDguSampleData();
      adIsSampleData['동국대'] = true;
    }
  }

  async function fetchSguDataFromGas() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '서강대학교 데이터를 불러오는 중...';
    try {
      const data = await fetchGasJsonp(SGU_GAS_URL, { action: 'getData' });
      if (data && Array.isArray(data)) {
        if (data.length > 0 && Array.isArray(data[0])) {
          const headers = data[0];
          SGU_DATA = data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h.trim()] = row[i]; });
            return obj;
          });
        } else {
          SGU_DATA = data;
        }
      } else if (data && data.data && Array.isArray(data.data)) {
        if (data.data.length > 0 && Array.isArray(data.data[0])) {
          const headers = data.data[0];
          SGU_DATA = data.data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h.trim()] = row[i]; });
            return obj;
          });
        } else {
          SGU_DATA = data.data;
        }
      } else {
        throw new Error('Invalid data format');
      }
      adIsSampleData['서강대'] = false;
    } catch (e) {
      console.error('SGU Data Fetch Error:', e);
      SGU_DATA = getSguSampleData();
      adIsSampleData['서강대'] = true;
    }
  }

  async function fetchKunsanDataFromGas() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '군산대학교 데이터를 불러오는 중...';
    try {
      const data = await fetchGasJsonp(KUNSAN_GAS_URL, { action: 'getData' });
      if (data && Array.isArray(data)) {
        if (data.length > 0 && Array.isArray(data[0])) {
          const headers = data[0];
          KUNSAN_DATA = data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
        } else {
          KUNSAN_DATA = data;
        }
      } else if (data && data.data && Array.isArray(data.data)) {
        if (data.data.length > 0 && Array.isArray(data.data[0])) {
          const headers = data.data[0];
          KUNSAN_DATA = data.data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
        } else {
          KUNSAN_DATA = data.data;
        }
      } else {
        throw new Error('Invalid data format');
      }
      adIsSampleData['군산대'] = false;
    } catch (e) {
      console.error('Kunsan Data Fetch Error:', e);
      KUNSAN_DATA = getKunsanSampleData();
      adIsSampleData['군산대'] = true;
    }
  }

  async function fetchSkuDataFromGas() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '성균관대학교 데이터를 불러오는 중...';
    try {
      const data = await fetchGasJsonp(SKU_GAS_URL, { action: 'getData' });
      if (data && Array.isArray(data)) {
        if (data.length > 0 && Array.isArray(data[0])) {
          const headers = data[0];
          SKU_DATA = data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
        } else {
          SKU_DATA = data;
        }
      } else if (data && data.data && Array.isArray(data.data)) {
        if (data.data.length > 0 && Array.isArray(data.data[0])) {
          const headers = data.data[0];
          SKU_DATA = data.data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
        } else {
          SKU_DATA = data.data;
        }
      } else {
        throw new Error('Invalid data format');
      }
      SKU_DATA = SKU_DATA.filter(d => d['모집단위'] && d['50%cut'] !== '' && !isNaN(parseFloat(d['50%cut'])));
      adIsSampleData['성균관대'] = false;
    } catch (e) {
      console.error('SKU Data Fetch Error:', e);
      SKU_DATA = getSkuSampleData();
      adIsSampleData['성균관대'] = true;
    }
  }

  async function fetchWsuDataFromGas() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '우석대학교 데이터를 불러오는 중...';
    try {
      const data = await fetchGasJsonp(WSU_GAS_URL, { action: 'getData' });
      if (data && Array.isArray(data)) {
        if (data.length > 0 && Array.isArray(data[0])) {
          const headers = data[0];
          WSU_DATA = data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
        } else {
          WSU_DATA = data;
        }
      } else if (data && data.data && Array.isArray(data.data)) {
        if (data.data.length > 0 && Array.isArray(data.data[0])) {
          const headers = data.data[0];
          WSU_DATA = data.data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
        } else {
          WSU_DATA = data.data;
        }
      } else {
        throw new Error('Invalid data format');
      }
      WSU_DATA = WSU_DATA.filter(d => d['모집단위'] && d['평균'] !== '' && !isNaN(parseFloat(d['평균'])));
      adIsSampleData['우석대'] = false;
    } catch (e) {
      console.error('WSU Data Fetch Error:', e);
      WSU_DATA = getWsuSampleData();
      adIsSampleData['우석대'] = true;
    }
  }

  function getWkuSampleData() {
    return [
      { '모집전형': '학생부종합', '단과대학': '약학대학', '모집단위': '약학과', '모집인원': 12, '지원인원': 227, '경쟁률': 18.92, '충원인원': 7, '50%cut': 1.35, '70%cut': 1.41 },
      { '모집전형': '학생부종합', '단과대학': '약학대학', '모집단위': '한약학과', '모집인원': 17, '지원인원': 230, '경쟁률': 13.53, '충원인원': 2, '50%cut': 2.23, '70%cut': 2.33 },
      { '모집전형': '학생부종합', '단과대학': '사범대학', '모집단위': '수학교육과', '모집인원': 10, '지원인원': 41, '경쟁률': 4.1, '충원인원': 30, '50%cut': 3.17, '70%cut': 3.28 },
      { '모집전형': '학생부종합', '단과대학': '사범대학', '모집단위': '국어교육과', '모집인원': 10, '지원인원': 37, '경쟁률': 3.7, '충원인원': 10, '50%cut': 3.95, '70%cut': 4.5 },
      { '모집전형': '학생부종합', '단과대학': '사범대학', '모집단위': '가정교육과', '모집인원': 10, '지원인원': 45, '경쟁률': 4.5, '충원인원': 35, '50%cut': 3.97, '70%cut': 3.17 },
      { '모집전형': '학생부종합', '단과대학': '경영대학', '모집단위': '회계세무학과', '모집인원': 5, '지원인원': 14, '경쟁률': 2.8, '충원인원': 9, '50%cut': 4.99, '70%cut': 5.56 },
      { '모집전형': '학생부종합', '단과대학': '경영대학', '모집단위': '경영학과', '모집인원': 20, '지원인원': 71, '경쟁률': 3.55, '충원인원': 51, '50%cut': 5.71, '70%cut': 5.96 },
      { '모집전형': '교과일반', '단과대학': '보건과학대학', '모집단위': '식품영양학과', '모집인원': 19, '지원인원': 76, '경쟁률': 4.0, '충원인원': 52, '50%cut': 3.48, '70%cut': 3.66 },
      { '모집전형': '교과일반', '단과대학': '디자인융합계열', '모집단위': '디자인융합계열', '모집인원': 21, '지원인원': 151, '경쟁률': 7.19, '충원인원': 27, '50%cut': 3.58, '70%cut': 3.83 },
      { '모집전형': '교과일반', '단과대학': '보건과학대학', '모집단위': '동물보건학과', '모집인원': 30, '지원인원': 100, '경쟁률': 3.33, '충원인원': 64, '50%cut': 3.99, '70%cut': 4.21 },
      { '모집전형': '교과일반', '단과대학': '보건과학대학', '모집단위': '반려동물산업학과', '모집인원': 22, '지원인원': 112, '경쟁률': 5.09, '충원인원': 51, '50%cut': 4.06, '70%cut': 4.27 },
      { '모집전형': '교과일반', '단과대학': '보건과학대학', '모집단위': '의료상담학과', '모집인원': 20, '지원인원': 68, '경쟁률': 3.4, '충원인원': 48, '50%cut': 4.09, '70%cut': 4.12 },
      { '모집전형': '교과일반', '단과대학': '보건과학대학', '모집단위': '뷰티디자인학부', '모집인원': 30, '지원인원': 150, '경쟁률': 5.0, '충원인원': 55, '50%cut': 4.26, '70%cut': 4.61 },
      { '모집전형': '교과일반', '단과대학': '사회과학대학', '모집단위': '행정학과', '모집인원': 15, '지원인원': 80, '경쟁률': 5.33, '충원인원': 45, '50%cut': 4.5, '70%cut': 4.8 },
      { '모집전형': '교과일반', '단과대학': '보건과학대학', '모집단위': '안전보건학과', '모집인원': 21, '지원인원': 47, '경쟁률': 2.24, '충원인원': 26, '50%cut': 4.87, '70%cut': 4.94 },
    ];
  }

  async function fetchWkuDataFromGas() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '원광대학교 데이터를 불러오는 중...';
    try {
      const data = await fetchGasJsonp(WKU_GAS_URL, { action: 'getData' });
      if (data && Array.isArray(data)) {
        if (data.length > 0 && Array.isArray(data[0])) {
          const headers = data[0];
          WKU_DATA = data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h.trim()] = row[i]; });
            return obj;
          });
        } else {
          WKU_DATA = data;
        }
      } else if (data && data.data && Array.isArray(data.data)) {
        if (data.data.length > 0 && Array.isArray(data.data[0])) {
          const headers = data.data[0];
          WKU_DATA = data.data.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h.trim()] = row[i]; });
            return obj;
          });
        } else {
          WKU_DATA = data.data;
        }
      } else {
        throw new Error('Invalid data format');
      }
      WKU_DATA = WKU_DATA.filter(d => d['모집단위'] && d['50%cut'] !== '' && !isNaN(parseFloat(d['50%cut'])));
      adIsSampleData['원광대'] = false;
    } catch (e) {
      console.error('WKU Data Fetch Error:', e);
      WKU_DATA = getWkuSampleData();
      adIsSampleData['원광대'] = true;
    }
  }

  function getJnuSampleData() {
    return [
      { 'campus': '광주', '모집전형': '학생부교과(지역인재)', '모집단위': '의예과', '모집인원': 30, '경쟁률': 8.5, '예비순위': 15, '평균등급': 1.28, '표준편차': 0.12, '50%cut': 1.28, '70%cut': 1.38 },
      { 'campus': '광주', '모집전형': '학생부교과(지역인재)', '모집단위': '치의예과', '모집인원': 12, '경쟁률': 5.2, '예비순위': 8, '평균등급': 1.45, '표준편차': 0.15, '50%cut': 1.45, '70%cut': 1.58 },
      { 'campus': '광주', '모집전형': '학생부교과(지역인재)', '모집단위': '간호학과', '모집인원': 25, '경쟁률': 6.3, '예비순위': 22, '평균등급': 2.15, '표준편차': 0.21, '50%cut': 2.15, '70%cut': 2.35 },
      { 'campus': '광주', '모집전형': '학생부교과(지역인재)', '모집단위': '약학부', '모집인원': 20, '경쟁률': 9.1, '예비순위': 12, '평균등급': 1.72, '표준편차': 0.18, '50%cut': 1.72, '70%cut': 1.88 },
      { 'campus': '광주', '모집전형': '학생부교과(지역인재)', '모집단위': '수학과', '모집인원': 18, '경쟁률': 3.8, '예비순위': 14, '평균등급': 2.78, '표준편차': 0.35, '50%cut': 2.78, '70%cut': 3.12 },
      { 'campus': '광주', '모집전형': '학생부교과(지역인재)', '모집단위': '컴퓨터정보통신공학부', '모집인원': 32, '경쟁률': 4.5, '예비순위': 20, '평균등급': 2.98, '표준편차': 0.30, '50%cut': 2.98, '70%cut': 3.25 },
      { 'campus': '광주', '모집전형': '학생부교과(지역인재)', '모집단위': '법학부', '모집인원': 20, '경쟁률': 4.2, '예비순위': 18, '평균등급': 2.85, '표준편차': 0.28, '50%cut': 2.85, '70%cut': 3.08 },
      { 'campus': '광주', '모집전형': '학생부교과(일반)', '모집단위': '의예과', '모집인원': 10, '경쟁률': 14.2, '예비순위': 5, '평균등급': 1.18, '표준편차': 0.08, '50%cut': 1.18, '70%cut': 1.25 },
      { 'campus': '광주', '모집전형': '학생부교과(일반)', '모집단위': '약학부', '모집인원': 10, '경쟁률': 11.5, '예비순위': 7, '평균등급': 1.62, '표준편차': 0.14, '50%cut': 1.62, '70%cut': 1.75 },
      { 'campus': '광주', '모집전형': '학생부교과(일반)', '모집단위': '간호학과', '모집인원': 12, '경쟁률': 8.4, '예비순위': 10, '평균등급': 2.05, '표준편차': 0.20, '50%cut': 2.05, '70%cut': 2.22 },
      { 'campus': '광주', '모집전형': '학생부교과(일반)', '모집단위': '경제학부', '모집인원': 22, '경쟁률': 3.5, '예비순위': 16, '평균등급': 3.12, '표준편차': 0.32, '50%cut': 3.12, '70%cut': 3.40 },
      { 'campus': '여수', '모집전형': '학생부교과(지역인재)', '모집단위': '해양기술학부', '모집인원': 28, '경쟁률': 2.8, '예비순위': 18, '평균등급': 3.85, '표준편차': 0.40, '50%cut': 3.85, '70%cut': 4.22 },
      { 'campus': '여수', '모집전형': '학생부교과(지역인재)', '모집단위': '수산생명의학과', '모집인원': 20, '경쟁률': 3.1, '예비순위': 15, '평균등급': 3.62, '표준편차': 0.38, '50%cut': 3.62, '70%cut': 3.98 },
      { 'campus': '여수', '모집전형': '학생부교과(일반)', '모집단위': '해양기술학부', '모집인원': 12, '경쟁률': 3.4, '예비순위': 8, '평균등급': 3.72, '표준편차': 0.38, '50%cut': 3.72, '70%cut': 4.08 },
      { 'campus': '여수', '모집전형': '학생부교과(일반)', '모집단위': '건축학부', '모집인원': 18, '경쟁률': 2.9, '예비순위': 12, '평균등급': 4.05, '표준편차': 0.42, '50%cut': 4.05, '70%cut': 4.45 },
    ];
  }

  async function fetchJnuDataFromGas() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '전남대학교 데이터를 불러오는 중...';
    try {
      const raw = await fetchGasJsonp(JNU_GAS_URL, { action: 'getData' });
      let rows;
      if (Array.isArray(raw) && raw.length > 0 && Array.isArray(raw[0])) {
        rows = raw.slice(1);
      } else if (raw && raw.data && Array.isArray(raw.data)) {
        rows = Array.isArray(raw.data[0]) ? raw.data.slice(1) : raw.data;
      } else {
        throw new Error('Invalid data format');
      }
      JNU_DATA = rows
        .filter(r => r[4] && r[12] !== '' && !isNaN(parseFloat(r[12])))
        .map(r => ({
          'campus': String(r[0] || '').trim(),
          '모집전형': String(r[2] || '').trim(),
          '모집단위': String(r[4] || '').trim(),
          '모집인원': r[5],
          '경쟁률': r[8],
          '예비순위': r[9],
          '평균등급': r[10],
          '표준편차': r[11],
          '50%cut': r[12],
          '70%cut': r[13],
          '환산평균': r[14],
          '환산편차': r[15],
          '환산50%cut': r[16],
          '환산70%cut': r[17],
          '면접평균': r[19],
          '면접편차': r[20],
          '서류평균': r[21],
          '서류편차': r[22],
          '실기평균': r[23],
          '실기편차': r[24],
          '총점평균': r[25],
          '총점편차': r[26],
        }));
      adIsSampleData['전남대'] = false;
    } catch (e) {
      console.error('JNU Data Fetch Error:', e);
      JNU_DATA = getJnuSampleData();
      adIsSampleData['전남대'] = true;
    }
  }

  function getJjuSampleData() {
    return [
      { '모집전형': '학생부교과(일반)', '모집단위': '간호학과', '모집인원': '25', '경쟁률': '13.7', '충원합격': '11', '최고': 3.0, '평균': 3.9, '70%cut': 4.5, '전형요소': '교과100' },
      { '모집전형': '학생부교과(일반)', '모집단위': '물리치료학과', '모집인원': '20', '경쟁률': '10.2', '충원합격': '8', '최고': 3.2, '평균': 4.1, '70%cut': 4.8, '전형요소': '교과100' },
      { '모집전형': '학생부교과(일반)', '모집단위': '임상병리학과', '모집인원': '15', '경쟁률': '8.5', '충원합격': '6', '최고': 3.5, '평균': 4.3, '70%cut': 5.0, '전형요소': '교과100' },
      { '모집전형': '학생부교과(일반)', '모집단위': '컴퓨터공학과', '모집인원': '30', '경쟁률': '6.8', '충원합격': '14', '최고': 3.8, '평균': 4.6, '70%cut': 5.3, '전형요소': '교과100' },
      { '모집전형': '학생부교과(일반)', '모집단위': '경영학과', '모집인원': '35', '경쟁률': '5.9', '충원합격': '18', '최고': 4.0, '평균': 4.8, '70%cut': 5.5, '전형요소': '교과100' },
      { '모집전형': '학생부교과(일반)', '모집단위': '사회복지학과', '모집인원': '22', '경쟁률': '5.2', '충원합격': '12', '최고': 4.2, '평균': 5.1, '70%cut': 5.8, '전형요소': '교과100' },
      { '모집전형': '학생부교과(일반)', '모집단위': '경찰행정학과', '모집인원': '20', '경쟁률': '9.3', '충원합격': '9', '최고': 3.6, '평균': 4.4, '70%cut': 5.1, '전형요소': '교과100' },
      { '모집전형': '학생부교과(일반)', '모집단위': '건축학부', '모집인원': '18', '경쟁률': '4.8', '충원합격': '10', '최고': 4.5, '평균': 5.3, '70%cut': 6.0, '전형요소': '교과100' },
      { '모집전형': '학생부교과(일반)', '모집단위': '식품영양학과', '모집인원': '20', '경쟁률': '6.1', '충원합격': '11', '최고': 4.1, '평균': 5.0, '70%cut': 5.7, '전형요소': '교과100' },
      { '모집전형': '학생부교과(일반)', '모집단위': '국어국문학과', '모집인원': '15', '경쟁률': '4.3', '충원합격': '7', '최고': 4.6, '평균': 5.4, '70%cut': 6.1, '전형요소': '교과100' },
      { '모집전형': '학생부종합(지역인재)', '모집단위': '간호학과', '모집인원': '15', '경쟁률': '8.9', '충원합격': '6', '최고': 3.3, '평균': 4.2, '70%cut': 4.9, '전형요소': '서류100' },
      { '모집전형': '학생부종합(지역인재)', '모집단위': '컴퓨터공학과', '모집인원': '18', '경쟁률': '5.4', '충원합격': '9', '최고': 4.0, '평균': 4.9, '70%cut': 5.6, '전형요소': '서류100' },
      { '모집전형': '학생부종합(지역인재)', '모집단위': '경영학과', '모집인원': '20', '경쟁률': '4.7', '충원합격': '11', '최고': 4.2, '평균': 5.1, '70%cut': 5.8, '전형요소': '서류100' },
      { '모집전형': '학생부종합(지역인재)', '모집단위': '사회복지학과', '모집인원': '14', '경쟁률': '4.1', '충원합격': '8', '최고': 4.5, '평균': 5.4, '70%cut': 6.0, '전형요소': '서류100' },
      { '모집전형': '학생부종합(지역인재)', '모집단위': '경찰행정학과', '모집인원': '12', '경쟁률': '7.2', '충원합격': '5', '최고': 3.8, '평균': 4.7, '70%cut': 5.4, '전형요소': '서류100' },
    ];
  }

  async function fetchJjuDataFromGas() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '전주대학교 데이터를 불러오는 중...';
    try {
      const raw = await fetchGasJsonp(JJU_GAS_URL, { action: 'getData' });
      let rows;
      if (Array.isArray(raw) && raw.length > 0 && Array.isArray(raw[0])) {
        rows = raw.slice(2); // 헤더 2줄 제외
      } else if (raw && raw.data && Array.isArray(raw.data)) {
        rows = Array.isArray(raw.data[0]) ? raw.data.slice(2) : raw.data;
      } else {
        throw new Error('Invalid data format');
      }
      JJU_DATA = rows
        .filter(r => r[2] && r[2] !== '')
        .map(r => {
          const high = parseFloat(r[7]);
          const avg = parseFloat(r[8]);
          const cut = parseFloat(r[9]);
          const isValid = !isNaN(high) && !isNaN(avg) && !isNaN(cut);
          return {
            '모집전형': String(r[0] || '').trim(),
            '모집단위': String(r[2] || '').trim(),
            '모집인원': r[3],
            '경쟁률': r[5],
            '충원합격': r[6],
            '최고': isValid ? high : null,
            '평균': isValid ? avg : null,
            '70%cut': isValid ? cut : null,
            '전형요소': String(r[10] || '').trim(),
          };
        })
        .filter(d => d['모집단위'] && d['70%cut'] !== null);
      adIsSampleData['전주대'] = false;
    } catch (e) {
      console.error('JJU Data Fetch Error:', e);
      JJU_DATA = getJjuSampleData();
      adIsSampleData['전주대'] = true;
    }
  }

  function getCauSampleData() {
    return [
      { 'campus': '서울', '계열': '의학', '단과대학': '의과대학', '모집전형': '학교장추천전형', '모집단위': '의학부', '모집인원': '40', '지원인원': '1240', '경쟁률': '31.0', '실질경쟁률': '12.4', '충원율': '25', '지원자평균': '1.5', '50%cut': 1.2, '70%cut': 1.4, 'passAvg': 1.3 },
      { 'campus': '서울', '계열': '자연', '단과대학': '공과대학', '모집전형': '학교장추천전형', '모집단위': '전자전기공학부', '모집인원': '35', '지원인원': '700', '경쟁률': '20.0', '실질경쟁률': '8.1', '충원율': '34', '지원자평균': '2.3', '50%cut': 2.0, '70%cut': 2.4, 'passAvg': 2.2 },
      { 'campus': '서울', '계열': '자연', '단과대학': '소프트웨어대학', '모집전형': '학교장추천전형', '모집단위': '소프트웨어학부', '모집인원': '30', '지원인원': '570', '경쟁률': '19.0', '실질경쟁률': '7.6', '충원율': '30', '지원자평균': '2.4', '50%cut': 2.1, '70%cut': 2.6, 'passAvg': 2.3 },
      { 'campus': '서울', '계열': '인문', '단과대학': '경영경제대학', '모집전형': '학교장추천전형', '모집단위': '경영학부', '모집인원': '45', '지원인원': '855', '경쟁률': '19.0', '실질경쟁률': '7.6', '충원율': '36', '지원자평균': '2.5', '50%cut': 2.2, '70%cut': 2.7, 'passAvg': 2.4 },
      { 'campus': '서울', '계열': '인문', '단과대학': '사회과학대학', '모집전형': '학교장추천전형', '모집단위': '심리학과', '모집인원': '15', '지원인원': '255', '경쟁률': '17.0', '실질경쟁률': '6.8', '충원율': '27', '지원자평균': '2.7', '50%cut': 2.4, '70%cut': 2.9, 'passAvg': 2.6 },
      { 'campus': '서울', '계열': '자연', '단과대학': '공과대학', '모집전형': '학교장추천전형', '모집단위': '화학공학과', '모집인원': '22', '지원인원': '374', '경쟁률': '17.0', '실질경쟁률': '6.8', '충원율': '32', '지원자평균': '2.8', '50%cut': 2.5, '70%cut': 3.0, 'passAvg': 2.7 },
      { 'campus': '서울', '계열': '인문', '단과대학': '인문대학', '모집전형': '학교장추천전형', '모집단위': '국어국문학과', '모집인원': '12', '지원인원': '192', '경쟁률': '16.0', '실질경쟁률': '6.4', '충원율': '25', '지원자평균': '3.0', '50%cut': 2.7, '70%cut': 3.2, 'passAvg': 2.9 },
      { 'campus': '안성', '계열': '예체능', '단과대학': '예술대학', '모집전형': '학교장추천전형', '모집단위': '연극학과', '모집인원': '10', '지원인원': '110', '경쟁률': '11.0', '실질경쟁률': '4.4', '충원율': '20', '지원자평균': '3.5', '50%cut': 3.2, '70%cut': 3.8, 'passAvg': 3.4 },
      { 'campus': '서울', '계열': '의학', '단과대학': '의과대학', '모집전형': '다빈치인재전형', '모집단위': '의학부', '모집인원': '20', '지원인원': '840', '경쟁률': '42.0', '실질경쟁률': '16.8', '충원율': '15', '지원자평균': '1.8', '50%cut': 1.4, '70%cut': 1.6, 'passAvg': 1.5 },
      { 'campus': '서울', '계열': '자연', '단과대학': '공과대학', '모집전형': '다빈치인재전형', '모집단위': '전자전기공학부', '모집인원': '18', '지원인원': '432', '경쟁률': '24.0', '실질경쟁률': '9.6', '충원율': '22', '지원자평균': '2.6', '50%cut': 2.3, '70%cut': 2.7, 'passAvg': 2.5 },
      { 'campus': '서울', '계열': '자연', '단과대학': '소프트웨어대학', '모집전형': '다빈치인재전형', '모집단위': '소프트웨어학부', '모집인원': '15', '지원인원': '345', '경쟁률': '23.0', '실질경쟁률': '9.2', '충원율': '20', '지원자평균': '2.7', '50%cut': 2.4, '70%cut': 2.9, 'passAvg': 2.6 },
      { 'campus': '서울', '계열': '인문', '단과대학': '경영경제대학', '모집전형': '다빈치인재전형', '모집단위': '경영학부', '모집인원': '20', '지원인원': '440', '경쟁률': '22.0', '실질경쟁률': '8.8', '충원율': '25', '지원자평균': '2.8', '50%cut': 2.5, '70%cut': 3.0, 'passAvg': 2.7 },
    ];
  }

  async function fetchCauDataFromGas() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '중앙대학교 데이터를 불러오는 중...';
    try {
      const raw = await fetchGasJsonp(CAU_GAS_URL, { action: 'getData' });
      let rows;
      if (Array.isArray(raw) && raw.length > 0 && Array.isArray(raw[0])) {
        rows = raw.slice(1); // 헤더 1줄 제외
      } else if (raw && raw.data && Array.isArray(raw.data)) {
        rows = Array.isArray(raw.data[0]) ? raw.data.slice(1) : raw.data;
      } else {
        throw new Error('Invalid data format');
      }
      CAU_DATA = rows
        .filter(r => r[4] && r[4] !== '' && r[11] !== '' && !isNaN(parseFloat(r[11])))
        .map(r => ({
          'campus': String(r[0] || '').trim(),
          '계열': String(r[1] || '').trim(),
          '단과대학': String(r[2] || '').trim(),
          '모집전형': String(r[3] || '').trim(),
          '모집단위': String(r[4] || '').trim(),
          '모집인원': r[5],
          '지원인원': r[6],
          '경쟁률': r[7],
          '실질경쟁률': r[8],
          '충원율': r[9],
          '지원자평균': r[10],
          'passAvg': parseFloat(r[11]),
          '50%cut': parseFloat(r[12]),
          '70%cut': parseFloat(r[13]),
        }))
        .filter(d => d['모집단위'] && !isNaN(d['50%cut']) && !isNaN(d['70%cut']));
      adIsSampleData['중앙대'] = false;
    } catch (e) {
      console.error('CAU Data Fetch Error:', e);
      CAU_DATA = getCauSampleData();
      adIsSampleData['중앙대'] = true;
    }
  }

  function getCnuSampleData() {
    return [
      { '모집전형': '지역인재전형', '모집단위': '의예과', '모집인원': 30, '지원인원': 690, '경쟁률': 23.0, '최저충족률(%)': 62, '실질경쟁률': 8.8, '충원합격인원': 5, '충원율(%)': 17, '1단계 최고 등급': 1.1, '1단계 평균 등급': 1.4, '1단계 최저 등급': 1.7, '평균(등급)': 1.3, '70%(등급)': 1.5, '최저(등급)': 1.7, '표준편차(등급)': 0.18, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null },
      { '모집전형': '지역인재전형', '모집단위': '치의예과', '모집인원': 22, '지원인원': 484, '경쟁률': 22.0, '최저충족률(%)': 58, '실질경쟁률': 8.0, '충원합격인원': 4, '충원율(%)': 18, '1단계 최고 등급': 1.2, '1단계 평균 등급': 1.6, '1단계 최저 등급': 1.9, '평균(등급)': 1.5, '70%(등급)': 1.7, '최저(등급)': 2.0, '표준편차(등급)': 0.21, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null },
      { '모집전형': '지역인재전형', '모집단위': '약학과', '모집인원': 18, '지원인원': 360, '경쟁률': 20.0, '최저충족률(%)': 55, '실질경쟁률': 7.2, '충원합격인원': 3, '충원율(%)': 17, '1단계 최고 등급': 1.3, '1단계 평균 등급': 1.7, '1단계 최저 등급': 2.1, '평균(등급)': 1.6, '70%(등급)': 1.8, '최저(등급)': 2.1, '표준편차(등급)': 0.20, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null },
      { '모집전형': '지역인재전형', '모집단위': '수의예과', '모집인원': 15, '지원인원': 270, '경쟁률': 18.0, '최저충족률(%)': 50, '실질경쟁률': 6.5, '충원합격인원': 2, '충원율(%)': 13, '1단계 최고 등급': 1.4, '1단계 평균 등급': 1.8, '1단계 최저 등급': 2.2, '평균(등급)': 1.7, '70%(등급)': 1.9, '최저(등급)': 2.2, '표준편차(등급)': 0.22, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null },
      { '모집전형': '지역인재전형', '모집단위': '간호학과', '모집인원': 25, '지원인원': 400, '경쟁률': 16.0, '최저충족률(%)': 48, '실질경쟁률': 5.8, '충원합격인원': 6, '충원율(%)': 24, '1단계 최고 등급': 1.5, '1단계 평균 등급': 2.0, '1단계 최저 등급': 2.4, '평균(등급)': 1.9, '70%(등급)': 2.1, '최저(등급)': 2.4, '표준편차(등급)': 0.23, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null },
      { '모집전형': '지역인재전형', '모집단위': '컴퓨터공학과', '모집인원': 20, '지원인원': 320, '경쟁률': 16.0, '최저충족률(%)': 45, '실질경쟁률': 5.4, '충원합격인원': 5, '충원율(%)': 25, '1단계 최고 등급': 1.7, '1단계 평균 등급': 2.2, '1단계 최저 등급': 2.7, '평균(등급)': 2.1, '70%(등급)': 2.4, '최저(등급)': 2.7, '표준편차(등급)': 0.27, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null },
      { '모집전형': '지역인재전형', '모집단위': '전기전자공학부', '모집인원': 22, '지원인원': 330, '경쟁률': 15.0, '최저충족률(%)': 42, '실질경쟁률': 4.9, '충원합격인원': 5, '충원율(%)': 23, '1단계 최고 등급': 1.8, '1단계 평균 등급': 2.3, '1단계 최저 등급': 2.8, '평균(등급)': 2.2, '70%(등급)': 2.5, '최저(등급)': 2.8, '표준편차(등급)': 0.28, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null },
      { '모집전형': '지역인재전형', '모집단위': '경영학부', '모집인원': 30, '지원인원': 420, '경쟁률': 14.0, '최저충족률(%)': 40, '실질경쟁률': 4.5, '충원합격인원': 7, '충원율(%)': 23, '1단계 최고 등급': 1.9, '1단계 평균 등급': 2.4, '1단계 최저 등급': 2.9, '평균(등급)': 2.3, '70%(등급)': 2.6, '최저(등급)': 2.9, '표준편차(등급)': 0.29, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null },
      { '모집전형': '지역인재전형', '모집단위': '화학공학과', '모집인원': 18, '지원인원': 252, '경쟁률': 14.0, '최저충족률(%)': 38, '실질경쟁률': 4.2, '충원합격인원': 4, '충원율(%)': 22, '1단계 최고 등급': 2.0, '1단계 평균 등급': 2.5, '1단계 최저 등급': 3.0, '평균(등급)': 2.4, '70%(등급)': 2.7, '최저(등급)': 3.0, '표준편차(등급)': 0.30, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null },
      { '모집전형': '지역인재전형', '모집단위': '행정학부', '모집인원': 15, '지원인원': 195, '경쟁률': 13.0, '최저충족률(%)': 35, '실질경쟁률': 3.8, '충원합격인원': 4, '충원율(%)': 27, '1단계 최고 등급': 2.2, '1단계 평균 등급': 2.7, '1단계 최저 등급': 3.2, '평균(등급)': 2.6, '70%(등급)': 2.9, '최저(등급)': 3.2, '표준편차(등급)': 0.31, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null },
      { '모집전형': '일반전형', '모집단위': '의예과', '모집인원': 25, '지원인원': 625, '경쟁률': 25.0, '최저충족률(%)': 60, '실질경쟁률': 9.5, '충원합격인원': 4, '충원율(%)': 16, '1단계 최고 등급': 1.0, '1단계 평균 등급': 1.3, '1단계 최저 등급': 1.6, '평균(등급)': 1.2, '70%(등급)': 1.4, '최저(등급)': 1.6, '표준편차(등급)': 0.17, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null },
      { '모집전형': '일반전형', '모집단위': '컴퓨터공학과', '모집인원': 25, '지원인원': 450, '경쟁률': 18.0, '최저충족률(%)': 42, '실질경쟁률': 5.2, '충원합격인원': 6, '충원율(%)': 24, '1단계 최고 등급': 1.6, '1단계 평균 등급': 2.1, '1단계 최저 등급': 2.5, '평균(등급)': 2.0, '70%(등급)': 2.3, '최저(등급)': 2.5, '표준편차(등급)': 0.25, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null },
      { '모집전형': '일반전형', '모집단위': '경영학부', '모집인원': 40, '지원인원': 640, '경쟁률': 16.0, '최저충족률(%)': 38, '실질경쟁률': 4.6, '충원합격인원': 8, '충원율(%)': 20, '1단계 최고 등급': 1.8, '1단계 평균 등급': 2.3, '1단계 최저 등급': 2.8, '평균(등급)': 2.2, '70%(등급)': 2.5, '최저(등급)': 2.8, '표준편차(등급)': 0.28, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null },
    ];
  }

  function getHufsGwagyoSampleData() {
    return [
      { '학년도': 2025, '모집전형': '학생부교과(학교장추천)', '캠퍼스': '서울캠퍼스', '모집단위': 'ELLT학과', '모집인원': 4, '경쟁률': 7.0, '실질경쟁률': 5.0, '충원인원': 6, '70%(환산점수)': 198.16 },
      { '학년도': 2025, '모집전형': '학생부교과(학교장추천)', '캠퍼스': '서울캠퍼스', '모집단위': '영미문학·문화학과', '모집인원': 4, '경쟁률': 8.3, '실질경쟁률': 5.5, '충원인원': 17, '70%(환산점수)': 196.87 },
      { '학년도': 2025, '모집전형': '학생부교과(학교장추천)', '캠퍼스': '서울캠퍼스', '모집단위': '프랑스어학부', '모집인원': 5, '경쟁률': 6.4, '실질경쟁률': 4.2, '충원인원': 10, '70%(환산점수)': 195.30 },
      { '학년도': 2025, '모집전형': '학생부교과(학교장추천)', '캠퍼스': '서울캠퍼스', '모집단위': '독일어과', '모집인원': 4, '경쟁률': 5.8, '실질경쟁률': 3.9, '충원인원': 8, '70%(환산점수)': 193.41 },
      { '학년도': 2025, '모집전형': '학생부교과(학교장추천)', '캠퍼스': '서울캠퍼스', '모집단위': '스페인어과', '모집인원': 6, '경쟁률': 7.2, '실질경쟁률': 4.8, '충원인원': 12, '70%(환산점수)': 191.82 },
      { '학년도': 2025, '모집전형': '학생부교과(학교장추천)', '캠퍼스': '서울캠퍼스', '모집단위': '중국어학부', '모집인원': 7, '경쟁률': 9.1, '실질경쟁률': 6.0, '충원인원': 15, '70%(환산점수)': 190.57 },
      { '학년도': 2025, '모집전형': '학생부교과(학교장추천)', '캠퍼스': '서울캠퍼스', '모집단위': '법학부', '모집인원': 8, '경쟁률': 10.5, '실질경쟁률': 7.1, '충원인원': 20, '70%(환산점수)': 188.73 },
      { '학년도': 2025, '모집전형': '학생부교과(학교장추천)', '캠퍼스': '글로벌캠퍼스', '모집단위': '영어학과', '모집인원': 5, '경쟁률': 6.0, '실질경쟁률': 4.0, '충원인원': 9, '70%(환산점수)': 182.40 },
      { '학년도': 2025, '모집전형': '학생부교과(학교장추천)', '캠퍼스': '글로벌캠퍼스', '모집단위': '경영학부', '모집인원': 10, '경쟁률': 8.8, '실질경쟁률': 5.9, '충원인원': 18, '70%(환산점수)': 179.60 },
      { '학년도': 2025, '모집전형': '학생부교과(학교장추천)', '캠퍼스': '글로벌캠퍼스', '모집단위': '국제학부', '모집인원': 8, '경쟁률': 7.5, '실질경쟁률': 5.0, '충원인원': 14, '70%(환산점수)': 175.20 },
    ];
  }

  function getHufsJonghapSampleData() {
    return [
      { '학년도': 2025, '모집전형': '학생부종합(면접형)', '캠퍼스': '서울캠퍼스', '모집단위': 'ELLT학과', '모집인원': 6, '경쟁률': 7.8, '충원인원': 0, '70%(등급)': 3.37 },
      { '학년도': 2025, '모집전형': '학생부종합(면접형)', '캠퍼스': '서울캠퍼스', '모집단위': '영미문학·문화학과', '모집인원': 6, '경쟁률': 13.2, '충원인원': 7, '70%(등급)': 2.84 },
      { '학년도': 2025, '모집전형': '학생부종합(면접형)', '캠퍼스': '서울캠퍼스', '모집단위': '프랑스어학부', '모집인원': 7, '경쟁률': 9.3, '충원인원': 3, '70%(등급)': 3.12 },
      { '학년도': 2025, '모집전형': '학생부종합(면접형)', '캠퍼스': '서울캠퍼스', '모집단위': '독일어과', '모집인원': 5, '경쟁률': 8.1, '충원인원': 2, '70%(등급)': 3.45 },
      { '학년도': 2025, '모집전형': '학생부종합(면접형)', '캠퍼스': '서울캠퍼스', '모집단위': '법학부', '모집인원': 10, '경쟁률': 12.4, '충원인원': 5, '70%(등급)': 2.91 },
      { '학년도': 2025, '모집전형': '학생부종합(서류형)', '캠퍼스': '서울캠퍼스', '모집단위': '중국어학부', '모집인원': 8, '경쟁률': 11.7, '충원인원': 4, '70%(등급)': 3.58 },
      { '학년도': 2025, '모집전형': '학생부종합(서류형)', '캠퍼스': '글로벌캠퍼스', '모집단위': '영어학과', '모집인원': 6, '경쟁률': 7.2, '충원인원': 2, '70%(등급)': 4.10 },
      { '학년도': 2025, '모집전형': '학생부종합(서류형)', '캠퍼스': '글로벌캠퍼스', '모집단위': '경영학부', '모집인원': 12, '경쟁률': 10.5, '충원인원': 6, '70%(등급)': 3.82 },
    ];
  }

  async function fetchHufsDataFromGviz() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '한국외대 데이터를 불러오는 중...';

    const gwagyoNumFields = ['모집인원', '경쟁률', '실질경쟁률', '충원인원', '70%(환산점수)'];
    const jonghapNumFields = ['모집인원', '경쟁률', '충원인원', '70%(등급)'];

    async function fetchSheet(sheetName, numFields) {
      const url = `https://docs.google.com/spreadsheets/d/${HUFS_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
      const res = await fetch(url);
      const text = await res.text();
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
      if (!match) return [];
      const json = JSON.parse(match[1]);
      const table = json.table;
      if (!table || !table.rows || table.rows.length === 0) return [];
      const headers = table.cols.map(c => (c.label || '').trim());
      return table.rows
        .map(r => {
          const obj = {};
          headers.forEach((h, i) => {
            if (!h) return;
            const raw = r.c[i] ? r.c[i].v : null;
            obj[h] = numFields.includes(h) ? (raw !== null && raw !== '' ? parseFloat(raw) : null) : (raw !== null ? String(raw) : '');
          });
          return obj;
        })
        .filter(d => d['모집단위'] && d['학년도']);
    }

    try {
      const [gyogwa, jonghap] = await Promise.all([
        fetchSheet('교과전형', gwagyoNumFields),
        fetchSheet('종합전형', jonghapNumFields),
      ]);
      HUFS_GYOGWA_DATA = gyogwa;
      HUFS_JONGHAP_DATA = jonghap;
      adIsSampleData['한국외대_교과전형'] = false;
      adIsSampleData['한국외대_종합전형'] = false;
    } catch (e) {
      console.error('HUFS Data Fetch Error:', e);
      HUFS_GYOGWA_DATA = getHufsGwagyoSampleData();
      HUFS_JONGHAP_DATA = getHufsJonghapSampleData();
      adIsSampleData['한국외대_교과전형'] = true;
      adIsSampleData['한국외대_종합전형'] = true;
    }
  }

  function getHyuSampleData() {
    return [
      { '학년도': 2025, '모집전형': '학생부교과(추천형)', '모집단위': '컴퓨터소프트웨어학부', '계열': '자연', '모집인원': 13, '경쟁률': 14.38, '추가합격 인원': 45, '평균등급': 1.30, '50%cut': '-', '70%cut': null, '수능최저 충족률': '69.2' },
      { '학년도': 2025, '모집전형': '학생부교과(추천형)', '모집단위': '융합전자공학부', '계열': '자연', '모집인원': 13, '경쟁률': 15.85, '추가합격 인원': 53, '평균등급': 1.46, '50%cut': '-', '70%cut': null, '수능최저 충족률': '67.3' },
      { '학년도': 2025, '모집전형': '학생부교과(추천형)', '모집단위': '자원환경공학과', '계열': '자연', '모집인원': 3, '경쟁률': 13.33, '추가합격 인원': 2, '평균등급': 1.46, '50%cut': '-', '70%cut': null, '수능최저 충족률': '63.2' },
      { '학년도': 2025, '모집전형': '학생부교과(추천형)', '모집단위': '건축학부', '계열': '자연', '모집인원': 5, '경쟁률': 10.80, '추가합격 인원': 8, '평균등급': 1.52, '50%cut': '-', '70%cut': null, '수능최저 충족률': '66' },
      { '학년도': 2025, '모집전형': '학생부교과(추천형)', '모집단위': '도시공학과', '계열': '자연', '모집인원': 5, '경쟁률': 16.00, '추가합격 인원': 5, '평균등급': 1.57, '50%cut': '-', '70%cut': null, '수능최저 충족률': '43.8' },
      { '학년도': 2025, '모집전형': '학생부교과(추천형)', '모집단위': '전기공학전공', '계열': '자연', '모집인원': 5, '경쟁률': 13.00, '추가합격 인원': 2, '평균등급': 1.59, '50%cut': '-', '70%cut': null, '수능최저 충족률': '48.4' },
      { '학년도': 2025, '모집전형': '학생부교과(추천형)', '모집단위': '건설환경공학과', '계열': '자연', '모집인원': 6, '경쟁률': 18.33, '추가합격 인원': 5, '평균등급': 1.64, '50%cut': '-', '70%cut': null, '수능최저 충족률': '50' },
      { '학년도': 2025, '모집전형': '학생부교과(추천형)', '모집단위': '정보시스템학과', '계열': '상경', '모집인원': 5, '경쟁률': 18.60, '추가합격 인원': 8, '평균등급': 1.69, '50%cut': '-', '70%cut': null, '수능최저 충족률': '60.9' },
      { '학년도': 2025, '모집전형': '학생부교과(추천형)', '모집단위': '건축공학부', '계열': '자연', '모집인원': 5, '경쟁률': 10.60, '추가합격 인원': 4, '평균등급': 1.71, '50%cut': '-', '70%cut': null, '수능최저 충족률': '35.8' },
      { '학년도': 2024, '모집전형': '학생부교과(추천형)', '모집단위': '컴퓨터소프트웨어학부', '계열': '자연', '모집인원': 13, '경쟁률': 13.92, '추가합격 인원': 38, '평균등급': 1.35, '50%cut': '1.28', '70%cut': 1.38, '수능최저 충족률': '65.4' },
      { '학년도': 2024, '모집전형': '학생부교과(추천형)', '모집단위': '융합전자공학부', '계열': '자연', '모집인원': 13, '경쟁률': 14.62, '추가합격 인원': 48, '평균등급': 1.50, '50%cut': '1.42', '70%cut': 1.54, '수능최저 충족률': '62.1' },
      { '학년도': 2024, '모집전형': '학생부교과(추천형)', '모집단위': '건축학부', '계열': '자연', '모집인원': 5, '경쟁률': 9.80, '추가합격 인원': 7, '평균등급': 1.58, '50%cut': '1.51', '70%cut': 1.62, '수능최저 충족률': '61.0' },
      { '학년도': 2024, '모집전형': '학생부교과(추천형)', '모집단위': '건설환경공학과', '계열': '자연', '모집인원': 6, '경쟁률': 16.50, '추가합격 인원': 4, '평균등급': 1.68, '50%cut': '1.60', '70%cut': 1.72, '수능최저 충족률': '47.3' },
    ];
  }

  async function fetchHyuDataFromGviz() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '한양대 데이터를 불러오는 중...';
    const numFields = ['학년도', '모집인원', '경쟁률', '추가합격 인원', '평균등급', '70%cut'];
    try {
      const url = `https://docs.google.com/spreadsheets/d/${HYU_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent('한양대 입시 결과(23-25)')}`;
      const res = await fetch(url);
      const text = await res.text();
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
      if (!match) throw new Error('No match');
      const json = JSON.parse(match[1]);
      const table = json.table;
      if (!table || !table.rows || table.rows.length === 0) throw new Error('Empty');
      const headers = table.cols.map(c => (c.label || '').trim());
      HYU_DATA = table.rows
        .map(r => {
          const obj = {};
          headers.forEach((h, i) => {
            if (!h) return;
            const raw = r.c[i] ? r.c[i].v : null;
            if (numFields.includes(h)) {
              obj[h] = (raw !== null && raw !== '' && raw !== '-') ? parseFloat(raw) : null;
            } else {
              obj[h] = raw !== null ? String(raw) : '';
            }
          });
          return obj;
        })
        .filter(d => d['모집단위'] && d['학년도']);
      adIsSampleData['한양대'] = false;
    } catch (e) {
      console.error('HYU Data Fetch Error:', e);
      HYU_DATA = getHyuSampleData();
      adIsSampleData['한양대'] = true;
    }
  }

  async function fetchHiuDataFromGviz() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '홍익대 데이터를 불러오는 중...';
    const numFields = ['학년도', '모집인원', '지원자수', '경쟁률', '추가합격률', '평균(등급)', '70%(등급)'];
    try {
      const url = `https://docs.google.com/spreadsheets/d/${HIU_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent('홍익대 입시 결과(24~25)')}`;
      const res = await fetch(url);
      const text = await res.text();
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
      if (!match) throw new Error('No match');
      const json = JSON.parse(match[1]);
      const table = json.table;
      if (!table || !table.rows || table.rows.length === 0) throw new Error('Empty');
      const headers = table.cols.map(c => (c.label || '').trim());
      HIU_DATA = table.rows
        .map(r => {
          const obj = {};
          headers.forEach((h, i) => {
            if (!h) return;
            const raw = r.c[i] ? r.c[i].v : null;
            if (numFields.includes(h)) {
              obj[h] = (raw !== null && raw !== '' && raw !== '-') ? parseFloat(raw) : null;
            } else {
              obj[h] = raw !== null ? String(raw) : '';
            }
          });
          // 캠퍼스 정보를 모집전형 앞에 붙여 필터링에 활용
          if (obj['캠퍼스']) {
            obj['모집전형'] = `[${obj['캠퍼스']}] ${obj['모집전형'] || ''}`;
          }
          return obj;
        })
        .filter(d => d['모집단위'] && d['학년도']);
      adIsSampleData['홍익대'] = false;
    } catch (e) {
      console.error('HIU Data Fetch Error:', e);
      HIU_DATA = [];
      adIsSampleData['홍익대'] = true;
    }
  }

  function getCbnuSampleData() {
    return [
      { '모집전형': '충북대 교과전형', '모집단위': '의예과', '모집인원': 8, '지원인원': 184, '경쟁률': 23.0, '최저충족률(%)': 62, '실질경쟁률': 8.8, '충원합격인원': 1, '충원율(%)': 12, '1단계 최고 등급': null, '1단계 평균 등급': null, '1단계 최저 등급': null, '평균(등급)': 1.45, '70%(등급)': 1.55, '최저(등급)': 1.70, '표준편차(등급)': 0.14, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null, '최초서류평균': null, '최초서류편차': null, '서류평균': null, '서류편차': null },
      { '모집전형': '충북대 교과전형', '모집단위': '약학과', '모집인원': 12, '지원인원': 252, '경쟁률': 21.0, '최저충족률(%)': 58, '실질경쟁률': 7.5, '충원합격인원': 2, '충원율(%)': 17, '1단계 최고 등급': null, '1단계 평균 등급': null, '1단계 최저 등급': null, '평균(등급)': 1.72, '70%(등급)': 1.85, '최저(등급)': 2.00, '표준편차(등급)': 0.18, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null, '최초서류평균': null, '최초서류편차': null, '서류평균': null, '서류편차': null },
      { '모집전형': '충북대 교과전형', '모집단위': '국어국문학과', '모집인원': 9, '지원인원': 120, '경쟁률': 13.3, '최저충족률(%)': 50, '실질경쟁률': 4.9, '충원합격인원': 3, '충원율(%)': 33, '1단계 최고 등급': null, '1단계 평균 등급': null, '1단계 최저 등급': null, '평균(등급)': 2.86, '70%(등급)': 2.95, '최저(등급)': 3.10, '표준편차(등급)': 0.15, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null, '최초서류평균': null, '최초서류편차': null, '서류평균': null, '서류편차': null },
      { '모집전형': '충북대 교과전형', '모집단위': '영어영문학과', '모집인원': 17, '지원인원': 250, '경쟁률': 14.7, '최저충족률(%)': 44, '실질경쟁률': 6.4, '충원합격인원': 4, '충원율(%)': 24, '1단계 최고 등급': null, '1단계 평균 등급': null, '1단계 최저 등급': null, '평균(등급)': 2.88, '70%(등급)': 3.01, '최저(등급)': 3.13, '표준편차(등급)': 0.21, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null, '최초서류평균': null, '최초서류편차': null, '서류평균': null, '서류편차': null },
      { '모집전형': '충북대 교과전형', '모집단위': '기계공학부', '모집인원': 25, '지원인원': 350, '경쟁률': 14.0, '최저충족률(%)': 40, '실질경쟁률': 5.6, '충원합격인원': 5, '충원율(%)': 20, '1단계 최고 등급': null, '1단계 평균 등급': null, '1단계 최저 등급': null, '평균(등급)': 3.12, '70%(등급)': 3.29, '최저(등급)': 3.46, '표준편차(등급)': 0.27, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null, '최초서류평균': null, '최초서류편차': null, '서류평균': null, '서류편차': null },
      { '모집전형': '충북대 종합전형1', '모집단위': '의예과', '모집인원': 5, '지원인원': 95, '경쟁률': 19.0, '최저충족률(%)': null, '실질경쟁률': null, '충원합격인원': 1, '충원율(%)': 20, '1단계 최고 등급': null, '1단계 평균 등급': null, '1단계 최저 등급': null, '평균(등급)': 1.51, '70%(등급)': 1.62, '최저(등급)': 1.75, '표준편차(등급)': 0.12, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null, '최초서류평균': 86.2, '최초서류편차': 2.1, '서류평균': 84.5, '서류편차': 1.8 },
      { '모집전형': '충북대 종합전형1', '모집단위': '건축학과', '모집인원': 2, '지원인원': 35, '경쟁률': 17.5, '최저충족률(%)': null, '실질경쟁률': null, '충원합격인원': 1, '충원율(%)': 50, '1단계 최고 등급': null, '1단계 평균 등급': null, '1단계 최저 등급': null, '평균(등급)': 3.13, '70%(등급)': 3.15, '최저(등급)': 3.19, '표준편차(등급)': 0.06, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null, '최초서류평균': 85.2, '최초서류편차': 2.1, '서류평균': 82.5, '서류편차': 1.8 },
      { '모집전형': '충북대 종합전형1', '모집단위': '환경공학과', '모집인원': 4, '지원인원': 57, '경쟁률': 14.3, '최저충족률(%)': null, '실질경쟁률': null, '충원합격인원': 2, '충원율(%)': 50, '1단계 최고 등급': null, '1단계 평균 등급': null, '1단계 최저 등급': null, '평균(등급)': 2.73, '70%(등급)': 2.87, '최저(등급)': 2.91, '표준편차(등급)': 0.16, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null, '최초서류평균': 81.4, '최초서류편차': 1.5, '서류평균': 80.1, '서류편차': 2.0 },
      { '모집전형': '충북대 종합전형2', '모집단위': '기계공학부', '모집인원': 10, '지원인원': 178, '경쟁률': 17.8, '최저충족률(%)': null, '실질경쟁률': null, '충원합격인원': 3, '충원율(%)': 30, '1단계 최고 등급': null, '1단계 평균 등급': null, '1단계 최저 등급': null, '평균(등급)': 3.12, '70%(등급)': 3.29, '최저(등급)': 3.46, '표준편차(등급)': 0.27, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null, '최초서류평균': 83.6, '최초서류편차': 1.9, '서류평균': 81.2, '서류편차': 1.7 },
      { '모집전형': '충북대 종합전형2', '모집단위': '전자공학부', '모집인원': 8, '지원인원': 136, '경쟁률': 17.0, '최저충족률(%)': null, '실질경쟁률': null, '충원합격인원': 2, '충원율(%)': 25, '1단계 최고 등급': null, '1단계 평균 등급': null, '1단계 최저 등급': null, '평균(등급)': 3.25, '70%(등급)': 3.40, '최저(등급)': 3.58, '표준편차(등급)': 0.22, '평균(환산점수)': null, '70%(환산점수)': null, '표준편차(환산점수)': null, '최초서류평균': 82.1, '최초서류편차': 1.8, '서류평균': 80.5, '서류편차': 1.5 },
    ];
  }

  async function fetchCbnuDataFromGviz() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '충북대학교 데이터를 불러오는 중...';

    const sheetNames = ['충북대 교과전형', '충북대 종합전형1', '충북대 종합전형2'];
    const numFields = ['모집인원', '지원인원', '경쟁률', '최저충족률(%)', '실질경쟁률',
      '충원합격인원', '충원율(%)', '1단계 최고 등급', '1단계 평균 등급', '1단계 최저 등급',
      '평균(등급)', '70%(등급)', '최저(등급)', '표준편차(등급)',
      '평균(환산점수)', '70%(환산점수)', '표준편차(환산점수)',
      '최초서류평균', '최초서류편차', '서류평균', '서류편차'];
    const headerAlias = {
      '최종평균(등급)': '평균(등급)',
      '최종편차(등급)': '표준편차(등급)',
      '편차(등급)': '표준편차(등급)',
      '70%cut': '70%(등급)',
    };

    try {
      const allRows = [];
      for (const sheetName of sheetNames) {
        const url = `https://docs.google.com/spreadsheets/d/${CBNU_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
        const res = await fetch(url);
        const text = await res.text();
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
        if (!match) continue;

        const json = JSON.parse(match[1]);
        const table = json.table;
        if (!table || !table.rows || table.rows.length === 0) continue;

        const headers = table.cols.map(c => {
          const lbl = (c.label || '').trim();
          return headerAlias[lbl] || lbl;
        });

        const rows = table.rows
          .map(r => {
            const obj = { '모집전형': sheetName };
            headers.forEach((h, i) => {
              if (!h) return;
              const raw = r.c[i] ? r.c[i].v : null;
              obj[h] = numFields.includes(h) ? (raw !== null && raw !== '' ? parseFloat(raw) : null) : (raw !== null ? String(raw) : '');
            });
            return obj;
          })
          .filter(d => d['모집단위'] && !isNaN(parseFloat(d['평균(등급)'])));

        allRows.push(...rows);
      }

      CBNU_DATA = allRows;
      adIsSampleData['충북대'] = false;
    } catch (e) {
      console.error('CBNU Data Fetch Error:', e);
      CBNU_DATA = getCbnuSampleData();
      adIsSampleData['충북대'] = true;
    }
  }

  async function fetchCnuDataFromGviz() {
    const badge = document.getElementById('adist-badge');
    if (badge) badge.textContent = '충남대학교 데이터를 불러오는 중...';
    try {
      const url = `https://docs.google.com/spreadsheets/d/${CNU_SHEET_ID}/gviz/tq?tqx=out:json&gid=0`;
      const res = await fetch(url);
      const text = await res.text();
      const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1];
      const json = JSON.parse(jsonStr);
      const table = json.table;

      // 헤더 추출
      const headers = table.cols.map(c => (c.label || '').trim());

      // 행 → 객체 변환
      const numFields = ['모집인원', '지원인원', '경쟁률', '최저충족률(%)', '실질경쟁률',
        '충원합격인원', '충원율(%)', '1단계 최고 등급', '1단계 평균 등급', '1단계 최저 등급',
        '평균(등급)', '70%(등급)', '최저(등급)', '표준편차(등급)',
        '평균(환산점수)', '70%(환산점수)', '표준편차(환산점수)'];

      CNU_DATA = table.rows
        .map(r => {
          const obj = {};
          headers.forEach((h, i) => {
            const raw = r.c[i] ? r.c[i].v : null;
            obj[h] = numFields.includes(h) ? (raw !== null && raw !== '' ? parseFloat(raw) : null) : (raw !== null ? String(raw) : '');
          });
          return obj;
        })
        .filter(d => d['모집단위'] && !isNaN(parseFloat(d['평균(등급)'])));

      adIsSampleData['충남대'] = false;
    } catch (e) {
      console.error('CNU Data Fetch Error:', e);
      CNU_DATA = getCnuSampleData();
      adIsSampleData['충남대'] = true;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ██  진입점
  // ════════════════════════════════════════════════════════════════════════════
  window.initAdmissionDist = async function () {
    const root = document.getElementById('adist-root');
    if (!root) return;
    if (!adInitialized) {
      adInitialized = true;
      renderShell(root);

      // 실제 GAS 데이터 병렬 호출
      const badge = document.getElementById('adist-badge');
      if (badge) badge.textContent = '입시결과 데이터를 불러오는 중...';

      await Promise.all([
        fetchKuDataFromGas(),
        fetchKhuJonghapDataFromGas(),
        fetchKhuGwagyoDataFromGas(),
        fetchKwuDataFromGviz(),
        fetchKunsanDataFromGas(),
        fetchDguDataFromGas(),
        fetchSguDataFromGas(),
        fetchUosDataFromGas(),
        fetchSkuDataFromGas(),
        fetchWsuDataFromGas(),
        fetchWkuDataFromGas(),
        fetchJnuDataFromGas(),
        fetchJjuDataFromGas(),
        fetchCauDataFromGas(),
        fetchCnuDataFromGviz(),
        fetchCbnuDataFromGviz(),
        fetchHufsDataFromGviz(),
        fetchHyuDataFromGviz(),
        fetchHiuDataFromGviz()
      ]);

      if (badge) badge.textContent = '';

      loadData('건국대');
    } else {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // ██  쉘 HTML 렌더링 (한 번만)
  // ════════════════════════════════════════════════════════════════════════════
  function renderShell(root) {
    root.innerHTML = `
      <div id="adist-wrap" style="max-width:1300px;margin:0 auto;padding:0 1.5rem 3rem;font-family:'Inter','Noto Sans KR',sans-serif;">

        <!-- 헤더 -->
        <div style="margin-bottom:1.5rem;">
          <h2 style="font-size:1.5rem;font-weight:800;margin:0 0 0.3rem;
            background:linear-gradient(135deg,#6366f1,#c4d600,#034C2F);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
            📊 대학별 입결 분포도
          </h2>
          <p style="color:var(--text-secondary);font-size:0.88rem;margin:0;">
            차트 막대를 클릭하면 학과별 상세 정보를 확인할 수 있습니다.
          </p>
        </div>

        <!-- ── 컨트롤 패널 (메인) ── -->
        <div id="adist-ctrl-main" style="background:var(--glass-bg);border:1px solid var(--panel-border);
          border-radius:14px;padding:1rem 1.4rem;margin:1.1rem 0;
          display:flex;align-items:center;gap:0.9rem;flex-wrap:wrap;backdrop-filter:blur(10px);">

          <!-- 대학 -->
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);white-space:nowrap;">대학</label>
            <select id="adist-uni-sel" onchange="adOnUniChange()"
              style="background:var(--input-bg);border:1px solid var(--input-border);color:var(--text-primary);
                     border-radius:8px;padding:0.5rem 0.9rem;font-size:0.88rem;min-width:130px;cursor:pointer;">
              <option value="건국대">건국대학교</option>
              <option value="경희대">경희대학교</option>
              <option value="광운대">광운대학교</option>
              <option value="군산대">군산대학교</option>
              <option value="동국대">동국대학교</option>
              <option value="서강대">서강대학교</option>
              <option value="서울시립대">서울시립대학교</option>
              <option value="성균관대">성균관대학교</option>
              <option value="우석대">우석대학교</option>
              <option value="원광대">원광대학교</option>
              <option value="전남대">전남대학교</option>
              <option value="전북대">전북대학교</option>
              <option value="전주대">전주대학교</option>
              <option value="중앙대">중앙대학교</option>
              <option value="충남대">충남대학교</option>
              <option value="충북대">충북대학교</option>
              <option value="한국외대">한국외국어대학교</option>
              <option value="한양대">한양대학교</option>
              <option value="홍익대">홍익대학교</option>
            </select>
          </div>

          <!-- 학년도 (건국대만 표시) -->
          <div id="adist-year-wrap" style="display:flex;align-items:center;gap:0.5rem;">
            <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);white-space:nowrap;">학년도</label>
            <select id="adist-year-sel" onchange="adOnYearChange()"
              style="background:var(--input-bg);border:1px solid var(--input-border);color:var(--text-primary);
                     border-radius:8px;padding:0.5rem 0.9rem;font-size:0.88rem;min-width:120px;cursor:pointer;">
            </select>
          </div>

          <!-- 전형 -->
          <div id="adist-type-wrap" style="display:flex;align-items:center;gap:0.5rem;">
            <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);white-space:nowrap;">전형</label>
            <select id="adist-type-sel" onchange="adOnTypeChange()"
              style="background:var(--input-bg);border:1px solid var(--input-border);color:var(--text-primary);
                     border-radius:8px;padding:0.5rem 0.9rem;font-size:0.88rem;min-width:200px;cursor:pointer;">
            </select>
          </div>

          <!-- 학과 선택 -->
          <div id="adist-major-wrap" style="display:flex;align-items:center;gap:0.5rem;">
            <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);white-space:nowrap;">학과</label>
            <select id="adist-major-sel" onchange="adUpdateMain()"
              style="background:var(--input-bg);border:1px solid var(--input-border);color:var(--text-primary);
                     border-radius:8px;padding:0.5rem 0.9rem;font-size:0.88rem;min-width:160px;cursor:pointer;">
              <option value="">전체</option>
            </select>
          </div>

          <!-- Y축 범위 -->
          <div id="adist-ymax-wrap" style="display:flex;align-items:center;gap:0.5rem;margin-left:auto;">
            <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);white-space:nowrap;">Y축</label>
            <select id="adist-ymax-sel" onchange="adUpdateMain()"
              style="background:var(--input-bg);border:1px solid var(--input-border);color:var(--text-primary);
                     border-radius:8px;padding:0.5rem 0.9rem;font-size:0.88rem;min-width:100px;cursor:pointer;">
              <option value="auto" selected>자동</option>
              <option value="4">1~4등급</option>
              <option value="5">1~5등급</option>
              <option value="6">1~6등급</option>
              <option value="9">1~9등급</option>
            </select>
          </div>
        </div>

        <!-- 정보 배지 -->
        <div id="adist-badge" style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.5rem;padding-left:0.2rem;min-height:1.2em;"></div>

        <!-- 범례 -->
        <div id="adist-legend" style="display:flex;gap:1.2rem;flex-wrap:wrap;font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.6rem;"></div>

        <!-- 차트 패널 -->
        <div id="adist-chart-panel" style="background:var(--glass-bg);border:1px solid var(--panel-border);
          border-radius:16px;padding:1.2rem 1rem;backdrop-filter:blur(10px);min-height:420px;overflow-x:auto;overflow-y:hidden;">
          <div id="adist-main-area" style="position:relative;height:420px;width:100%;">
            <canvas id="adist-canvas-main"></canvas>
          </div>
        </div>

        <!-- 전북대 iframe -->
        <div id="adist-jbnu-wrap" style="display:none;border-radius:16px;overflow:hidden;border:1px solid var(--panel-border);min-height:620px;">
          <iframe id="adist-jbnu-iframe" src="" style="width:100%;height:620px;border:none;display:block;" title="전북대학교 입시 결과"></iframe>
        </div>

        <!-- 빈 상태 -->
        <div id="adist-empty" style="display:none;text-align:center;padding:4rem 0;color:var(--text-secondary);">
          <div style="font-size:3rem;margin-bottom:1rem;">📭</div>
          <p>선택한 조건의 데이터가 없습니다.</p>
        </div>

        <div id="adist-disclaimer" style="text-align:right;margin-top:1.5rem;font-size:0.78rem;color:var(--text-secondary);">
          ※ 본 데이터는 참고용 샘플로, 실제 입시 결과와 다를 수 있습니다.
        </div>
      </div>

      <!-- 모달 -->
      <div id="adist-modal" onclick="if(event.target===this)adCloseModal()"
        style="display:none;position:fixed;inset:0;z-index:9200;background:rgba(0,0,0,0.45);
               backdrop-filter:blur(6px);justify-content:center;align-items:center;">
        <div style="background:var(--panel-bg);backdrop-filter:blur(20px);
          border:1px solid var(--panel-border);border-radius:20px;padding:2rem 2.2rem;
          width:92%;max-width:520px;position:relative;max-height:90vh;overflow-y:auto;
          box-shadow:0 30px 70px rgba(0,0,0,0.35);animation:adIn .35s cubic-bezier(.16,1,.3,1);">
          <button onclick="adCloseModal()" style="position:absolute;top:1rem;right:1.2rem;
            background:none;border:none;font-size:1.6rem;cursor:pointer;color:var(--text-secondary);line-height:1;">×</button>
          <div id="adist-modal-body"></div>
        </div>
      </div>

      <style>
        @keyframes adIn { from{transform:translateY(28px);opacity:0} to{transform:translateY(0);opacity:1} }
        #adist-canvas-main { cursor:pointer; }
      </style>
    `;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ██  데이터 로드 & 필터 채우기
  // ════════════════════════════════════════════════════════════════════════════
  function loadData(uniName) {
    adCurrentUni = uniName;

    // ── 전북대: iframe 임베딩 모드 ──────────────────────────────────────────
    const jbnuWrap    = document.getElementById('adist-jbnu-wrap');
    const chartPanel  = document.getElementById('adist-chart-panel');
    const typeWrap    = document.getElementById('adist-type-wrap');
    const majorWrap   = document.getElementById('adist-major-wrap');
    const ymaxWrap    = document.getElementById('adist-ymax-wrap');
    const legendEl    = document.getElementById('adist-legend');
    const badgeEl     = document.getElementById('adist-badge');
    const yearWrapEl  = document.getElementById('adist-year-wrap');

    if (uniName === '전북대') {
      // 필터 컨트롤 숨기기
      if (typeWrap)   typeWrap.style.display   = 'none';
      if (majorWrap)  majorWrap.style.display  = 'none';
      if (ymaxWrap)   ymaxWrap.style.display   = 'none';
      if (yearWrapEl) yearWrapEl.style.display  = 'none';
      if (legendEl)   legendEl.innerHTML        = '';
      if (badgeEl)    badgeEl.textContent       = '전북대학교 학생부종합·교과 입시 결과 (Google Sheets 연동)';
      // iframe src 설정 후 표시
      const iframe = document.getElementById('adist-jbnu-iframe');
      if (iframe && !iframe.src.includes('script.google.com')) iframe.src = JBNU_GAS_URL;
      if (jbnuWrap)  jbnuWrap.style.display  = 'block';
      if (chartPanel) chartPanel.style.display = 'none';
      if (adMainChart) { adMainChart.destroy(); adMainChart = null; }
      return;
    }

    // 전북대에서 다른 대학으로 전환 시 UI 복원
    if (jbnuWrap)   jbnuWrap.style.display   = 'none';
    if (chartPanel) chartPanel.style.display  = '';
    if (typeWrap)   typeWrap.style.display    = 'flex';
    if (majorWrap)  majorWrap.style.display   = 'flex';
    if (ymaxWrap)   ymaxWrap.style.display    = 'flex';

    const meta = UNI_META[uniName];

    // 학년도 드롭다운 먼저 채우기 (rawData 술독 전)
    const yearWrap = document.getElementById('adist-year-wrap');
    const yearSel = document.getElementById('adist-year-sel');
    if (meta.hasYear) {
      yearWrap.style.display = 'flex';
      const allData = meta.data();
      const years = [...new Set(allData.map(d => d['학년도'] || d.year))]
        .filter(Boolean).sort((a, b) => b - a);
      yearSel.innerHTML = years.map(y => `<option value="${y}">${y}학년도</option>`).join('');
      adCurrentYear = years[0] ?? '';
    } else {
      yearWrap.style.display = 'none';
    }

    // 전형 드롭다운 채우기
    const typeSel = document.getElementById('adist-type-sel');
    let types;
    if (uniName === '군산대') {
      // 군산대는 선택된 학년도에 속한 전형만 표시
      const allData = meta.data();
      types = [...new Set(
        allData.filter(d => d.year == adCurrentYear).map(d => d.type)
      )].filter(Boolean).sort();
    } else {
      types = meta.types();
    }
    typeSel.innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
    adCurrentType = types[0] || '';

    // rawData 로드
    loadTypeData();

    // 샘플 데이터 여부에 따른 안내 문구 표시/숨김
    const disclaimer = document.getElementById('adist-disclaimer');
    if (disclaimer) {
      let isSample = false;
      if (uniName === '건국대') {
        isSample = adIsSampleData['건국대'];
      } else if (uniName === '군산대') {
        isSample = adIsSampleData['군산대'];
      } else if (uniName === '동국대') {
        isSample = adIsSampleData['동국대'];
      } else if (uniName === '서강대') {
        isSample = adIsSampleData['서강대'];
      } else if (uniName === '서울시립대') {
        isSample = adIsSampleData['서울시립대'];
      } else if (uniName === '성균관대') {
        isSample = adIsSampleData['성균관대'];
      } else if (uniName === '우석대') {
        isSample = adIsSampleData['우석대'];
      } else if (uniName === '원광대') {
        isSample = adIsSampleData['원광대'];
      } else if (uniName === '전남대') {
        isSample = adIsSampleData['전남대'];
      } else if (uniName === '전주대') {
        isSample = adIsSampleData['전주대'];
      } else if (uniName === '중앙대') {
        isSample = adIsSampleData['중앙대'];
      } else if (uniName === '충남대') {
        isSample = adIsSampleData['충남대'];
      } else if (uniName === '충북대') {
        isSample = adIsSampleData['충북대'];
      } else if (uniName === '홍익대') {
        isSample = adIsSampleData['홍익대'];
      } else {
        isSample = adIsSampleData[`${uniName}_${adCurrentType}`];
        if (isSample === undefined) isSample = true;
      }
      disclaimer.style.display = isSample ? 'block' : 'none';
    }

    populateMajorDropdown();
    adUpdateMain();
  }

  // 학년도 변경 핸들러 (군산대는 전형도 함께 갱신)
  window.adOnYearChange = function () {
    const yearSel = document.getElementById('adist-year-sel');
    adCurrentYear = parseInt(yearSel.value);

    if (adCurrentUni === '군산대') {
      const meta = UNI_META['군산대'];
      const allData = meta.data();
      const types = [...new Set(
        allData.filter(d => d.year == adCurrentYear).map(d => d.type)
      )].filter(Boolean).sort();
      const typeSel = document.getElementById('adist-type-sel');
      typeSel.innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
      adCurrentType = types[0] || '';
      loadTypeData();
    }
    populateMajorDropdown();
    adUpdateMain();
  };

  function loadTypeData() {
    const meta = UNI_META[adCurrentUni];
    if (adCurrentUni === '건국대' || adCurrentUni === '군산대' || adCurrentUni === '동국대' || adCurrentUni === '홍익대') {
      adRawData = meta.data();
    } else {
      adRawData = meta.data(adCurrentType);
    }
  }

  function populateMajorDropdown() {
    const majorSel = document.getElementById('adist-major-sel');
    if (!majorSel) return;

    // 현재 선택된 학과 보존 시도
    const prevVal = majorSel.value;

    // 연도·전형 필터 적용 후 학과 목록 추출
    let pool = adRawData;
    if (UNI_META[adCurrentUni]?.hasYear) {
      if (adCurrentUni === '건국대') {
        pool = adRawData.filter(d => d['학년도'] == adCurrentYear && d['모집전형'] == adCurrentType);
      } else if (adCurrentUni === '군산대') {
        pool = adRawData.filter(d => d.year == adCurrentYear && d.type == adCurrentType);
      } else if (adCurrentUni === '동국대') {
        pool = adRawData.filter(d => d['학년도'] == adCurrentYear && d['모집전형'] == adCurrentType);
      } else if (adCurrentUni === '한국외대') {
        pool = adRawData.filter(d => d['학년도'] == adCurrentYear);
      } else if (adCurrentUni === '한양대') {
        pool = adRawData.filter(d => d['학년도'] == adCurrentYear && d['모집전형'] == adCurrentType);
      } else if (adCurrentUni === '홍익대') {
        pool = adRawData.filter(d => d['학년도'] == adCurrentYear && d['모집전형'] == adCurrentType);
      }
    }

    const getMajor = d => d['모집단위'] || d.major || d.name || d.unit || d.dept || '';
    const majors = [...new Set(pool.map(getMajor))].filter(Boolean).sort();

    majorSel.innerHTML = '<option value="">전체</option>' +
      majors.map(m => `<option value="${m}">${m}</option>`).join('');

    // 이전 선택이 여전히 유효하면 복원
    if (prevVal && majors.includes(prevVal)) majorSel.value = prevVal;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ██  대학/전형 변경 핸들러
  // ════════════════════════════════════════════════════════════════════════════
  window.adOnUniChange = function () {
    const sel = document.getElementById('adist-uni-sel');
    loadData(sel.value);
  };

  window.adOnTypeChange = function () {
    const sel = document.getElementById('adist-type-sel');
    adCurrentType = sel.value;
    loadTypeData();
    populateMajorDropdown();
    adUpdateMain();
  };

  // ════════════════════════════════════════════════════════════════════════════
  // ██  메인 차트 업데이트
  // ════════════════════════════════════════════════════════════════════════════
  window.adUpdateMain = function () {
    const meta = UNI_META[adCurrentUni];
    const colors = meta.colors;
    const yMaxSel = document.getElementById('adist-ymax-sel');
    const yearSel = document.getElementById('adist-year-sel');
    const empty = document.getElementById('adist-empty');
    const panel = document.getElementById('adist-chart-panel');
    const legend = document.getElementById('adist-legend');
    const badge = document.getElementById('adist-badge');
    const yMaxRaw = yMaxSel?.value || 'auto';

    // 데이터 필터링 (상태 변수 adCurrentYear/adCurrentType 직접 사용)
    const meta2 = UNI_META[adCurrentUni];
    let data = adRawData;
    if (meta2.hasYear) {
      // yearSel.value 대신 상태 변수 사용 (빈 값·NaN 방지)
      const year = adCurrentYear;
      const type = adCurrentType;
      if (adCurrentUni === '건국대') {
        data = adRawData
          .filter(d => d['학년도'] == year && d['모집전형'] == type)
          .sort((a, b) => (parseFloat(a['50%cut(등급)']) || 999) - (parseFloat(b['50%cut(등급)']) || 999));
      } else if (adCurrentUni === '군산대') {
        data = adRawData
          .filter(d => d.year == year && d.type == type)
          .sort((a, b) => (parseFloat(a.avgGrade) || 999) - (parseFloat(b.avgGrade) || 999));
      } else if (adCurrentUni === '동국대') {
        data = adRawData
          .filter(d => d['학년도'] == year && d['모집전형'] == type)
          .sort((a, b) => (parseFloat(a['평균(등급)']) || 999) - (parseFloat(b['평균(등급)']) || 999));
      } else if (adCurrentUni === '한국외대') {
        if (adCurrentType === '교과전형') {
          data = adRawData
            .filter(d => d['학년도'] == year)
            .sort((a, b) => (parseFloat(b['70%(환산점수)']) || 0) - (parseFloat(a['70%(환산점수)']) || 0));
        } else {
          data = adRawData
            .filter(d => d['학년도'] == year)
            .sort((a, b) => (parseFloat(a['70%(등급)']) || 999) - (parseFloat(b['70%(등급)']) || 999));
        }
      } else if (adCurrentUni === '한양대') {
        data = adRawData
          .filter(d => d['학년도'] == year && d['모집전형'] == type)
          .sort((a, b) => (parseFloat(a['평균등급']) || 999) - (parseFloat(b['평균등급']) || 999));
      } else if (adCurrentUni === '홍익대') {
        data = adRawData
          .filter(d => d['학년도'] == year && d['모집전형'] == type)
          .sort((a, b) => (parseFloat(a['평균(등급)']) || 999) - (parseFloat(b['평균(등급)']) || 999));
      }
    } else {
      if (adCurrentUni === '서강대' || adCurrentUni === '성균관대' || adCurrentUni === '원광대' || adCurrentUni === '전남대') {
        data = [...adRawData].sort((a, b) => (parseFloat(a['50%cut']) || 999) - (parseFloat(b['50%cut']) || 999));
      } else if (adCurrentUni === '전주대') {
        data = [...adRawData].sort((a, b) => (parseFloat(a['평균']) || 999) - (parseFloat(b['평균']) || 999));
      } else if (adCurrentUni === '중앙대') {
        data = [...adRawData].sort((a, b) => (parseFloat(a['50%cut']) || 999) - (parseFloat(b['50%cut']) || 999));
      } else if (adCurrentUni === '서울시립대') {
        data = [...adRawData].sort((a, b) => (parseFloat(a.grade) || 999) - (parseFloat(b.grade) || 999));
      } else if (adCurrentUni === '우석대') {
        data = [...adRawData].sort((a, b) => (parseFloat(a['평균']) || 999) - (parseFloat(b['평균']) || 999));
      } else if (adCurrentUni === '충남대' || adCurrentUni === '충북대') {
        data = [...adRawData].sort((a, b) => (parseFloat(a['평균(등급)']) || 999) - (parseFloat(b['평균(등급)']) || 999));
      } else {
        data = [...adRawData];
      }
    }

    // 학과 드롭다운 필터링
    const majorSel = document.getElementById('adist-major-sel');
    if (majorSel && majorSel.value) {
      const selected = majorSel.value;
      data = data.filter(d => (d['모집단위'] || d.major || d.name || d.unit || d.dept || '') === selected);
    }

    adDispData = data;

    let yMax, yMin;
    if (yMaxRaw === 'auto') {
      const range = computeAutoRange(data, UNI_META[adCurrentUni].schema);
      yMin = range.yMin; yMax = range.yMax;
    } else {
      yMin = 1; yMax = parseInt(yMaxRaw);
    }
    adCurrentYMin = yMin;

    if (!data.length) {
      empty.style.display = 'block'; panel.style.display = 'none'; return;
    }
    empty.style.display = 'none'; panel.style.display = 'block';

    // 배지
    if (badge) badge.textContent = `총 ${data.length}개 모집단위`;

    // 범례 업데이트
    updateLegend(colors);

    // 동적 너비 설정 (스크롤용)
    const mainArea = document.getElementById('adist-main-area');
    if (mainArea) {
      const minW = Math.max(100, data.length * 35); // 항목당 35px 할당
      mainArea.style.minWidth = minW + 'px';
      mainArea.style.width = '100%';
    }

    // 차트
    const ctx = document.getElementById('adist-canvas-main');
    if (!ctx) return;
    if (adMainChart) { adMainChart.destroy(); adMainChart = null; }

    if (adCurrentUni === '건국대') {
      adMainChart = buildKuChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '군산대') {
      adMainChart = buildKunsanChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '광운대') {
      adMainChart = buildKwuChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '동국대') {
      adMainChart = buildDguChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '서강대') {
      adMainChart = buildSguChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '서울시립대') {
      adMainChart = buildUosChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '성균관대') {
      adMainChart = buildSkuChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '우석대') {
      adMainChart = buildWsuChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '원광대') {
      adMainChart = buildWkuChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '전남대') {
      adMainChart = buildJnuChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '전주대') {
      adMainChart = buildJjuChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '중앙대') {
      adMainChart = buildCauChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '충남대') {
      adMainChart = buildCnuChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '충북대') {
      adMainChart = buildCbnuChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '한국외대') {
      if (adCurrentType === '교과전형') {
        adMainChart = buildHufsGwagyoChart(ctx, data, colors);
      } else {
        adMainChart = buildHufsJonghapChart(ctx, data, colors, yMax);
      }
    } else if (adCurrentUni === '한양대') {
      adMainChart = buildHyuChart(ctx, data, colors, yMax);
    } else if (adCurrentUni === '홍익대') {
      adMainChart = buildHiuChart(ctx, data, colors, yMax);
    } else if (adCurrentType === '학생부교과') {
      adMainChart = buildKhuGwagyoChart(ctx, data, colors, yMax);
    } else {
      adMainChart = buildKhuJonghapChart(ctx, data, colors, yMax);
    }
  };

  // ── 범례 ──────────────────────────────────────────────────────────────────
  function updateLegend(colors) {
    const legend = document.getElementById('adist-legend');
    if (!legend) return;
    let html = '';

    if (adCurrentUni === '건국대' || adCurrentUni === '군산대' || adCurrentUni === '우석대') {
      html = `
        <div style="display:flex;align-items:center;gap:.4rem;">
          <div style="width:14px;height:14px;border-radius:4px;background:${colors.barLight}; border:1px solid ${colors.barDark};"></div>
          <span>평균 ~ 70% cut 등급 구간</span>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <svg width="14" height="14"><line x1="1" y1="7" x2="13" y2="7" stroke="${colors.accent}" stroke-width="2.5"/></svg>
          <span>클릭 시 상세 정보</span>
        </div>`;
    } else if (adCurrentUni === '동국대') {
      html = `
        <div style="display:flex;align-items:center;gap:.4rem;">
          <div style="width:14px;height:14px;border-radius:4px;background:${colors.barLight}; border:1px solid ${colors.barDark};"></div>
          <span>평균 ~ 최저 등급 구간</span>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <svg width="14" height="14"><line x1="1" y1="7" x2="13" y2="7" stroke="${colors.accent}" stroke-width="2.5"/></svg>
          <span>클릭 시 상세 정보</span>
        </div>`;
    } else if (adCurrentUni === '서강대' || adCurrentUni === '성균관대' || adCurrentUni === '원광대' || adCurrentUni === '전남대' || adCurrentUni === '중앙대') {
      html = `
        <div style="display:flex;align-items:center;gap:.4rem;">
          <div style="width:14px;height:14px;border-radius:4px;background:${colors.barLight}; border:1px solid ${colors.barDark};"></div>
          <span>50%cut ~ 70%cut 등급 구간</span>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <svg width="14" height="14"><line x1="1" y1="7" x2="13" y2="7" stroke="${colors.accent}" stroke-width="2.5"/></svg>
          <span>클릭 시 상세 정보</span>
        </div>`;
    } else if (adCurrentUni === '전주대') {
      html = `
        <div style="display:flex;align-items:center;gap:.4rem;">
          <div style="width:14px;height:14px;border-radius:4px;background:${colors.barLight}; border:1px solid ${colors.barDark};"></div>
          <span>최고 ~ 70%CUT 등급 구간</span>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <svg width="14" height="14"><line x1="1" y1="7" x2="13" y2="7" stroke="${colors.accent}" stroke-width="2.5"/></svg>
          <span>클릭 시 상세 정보</span>
        </div>`;
    } else if (adCurrentUni === '서울시립대') {
      html = `
        <div style="display:flex;align-items:center;gap:.4rem;">
          <div style="width:14px;height:14px;border-radius:4px;background:${colors.bar}; border:1px solid ${colors.barDark};"></div>
          <span>학생부등급 ± 표준편차 구간</span>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <svg width="14" height="14"><line x1="1" y1="7" x2="13" y2="7" stroke="${colors.accent}" stroke-width="2.5"/></svg>
          <span>클릭 시 상세 정보</span>
        </div>`;
    } else if (adCurrentUni === '충남대' || adCurrentUni === '충북대') {
      html = `
        <div style="display:flex;align-items:center;gap:.4rem;">
          <div style="width:14px;height:14px;border-radius:4px;background:${colors.barLight}; border:1px solid ${colors.barDark};"></div>
          <span>평균(등급) ± 표준편차 구간</span>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <svg width="14" height="14"><line x1="1" y1="7" x2="13" y2="7" stroke="${colors.accent}" stroke-width="2.5"/></svg>
          <span>클릭 시 상세 정보</span>
        </div>`;
    } else if (adCurrentUni === '한국외대') {
      const metric = adCurrentType === '교과전형' ? '70%(환산점수)' : '70%(등급)';
      html = `
        <div style="display:flex;align-items:center;gap:.4rem;">
          <div style="width:14px;height:14px;border-radius:4px;background:${colors.bar}; border:1px solid ${colors.barDark};"></div>
          <span>${metric}</span>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <svg width="14" height="14"><line x1="1" y1="7" x2="13" y2="7" stroke="${colors.accent}" stroke-width="2.5"/></svg>
          <span>클릭 시 상세 정보</span>
        </div>`;
    } else if (adCurrentUni === '한양대') {
      html = `
        <div style="display:flex;align-items:center;gap:.4rem;">
          <div style="width:14px;height:14px;border-radius:4px;background:${colors.barLight}; border:1px solid ${colors.barDark};"></div>
          <span>50%cut ~ 70%cut 등급 구간</span>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <svg width="14" height="14"><line x1="1" y1="7" x2="13" y2="7" stroke="${colors.accent}" stroke-width="2.5"/></svg>
          <span>클릭 시 상세 정보</span>
        </div>`;
    } else if (adCurrentUni === '홍익대') {
      html = `
        <div style="display:flex;align-items:center;gap:.4rem;">
          <div style="width:14px;height:14px;border-radius:4px;background:${colors.barLight}; border:1px solid ${colors.barDark};"></div>
          <span>평균 ~ 70% 등급 구간</span>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <svg width="14" height="14"><line x1="1" y1="7" x2="13" y2="7" stroke="${colors.accent}" stroke-width="2.5"/></svg>
          <span>클릭 시 상세 정보</span>
        </div>`;
    } else if (adCurrentUni === '광운대') {
      html = `
        <div style="display:flex;align-items:center;gap:.4rem;">
          <div style="width:12px;height:12px;border-radius:50%;background:${colors.bar}; border:2px solid ${colors.accent};"></div>
          <span>학생부 등급 분포 (${adCurrentType})</span>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <svg width="14" height="14"><line x1="1" y1="7" x2="13" y2="7" stroke="${colors.accent}" stroke-width="2.5" stroke-dasharray="3,2"/></svg>
          <span>클릭 시 상세 정보</span>
        </div>`;
    } else if (adCurrentType === '학생부교과') {
      html = `
        <div style="display:flex;align-items:center;gap:.4rem;">
          <div style="width:14px;height:14px;border-radius:3px;background:${colors.bar};opacity:.75;"></div>
          <span>gradeAvg ~ 70%cut 범위</span>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <svg width="14" height="14"><line x1="1" y1="7" x2="13" y2="7" stroke="${colors.accent}" stroke-width="2.5"/></svg>
          <span>클릭 시 상세 정보</span>
        </div>`;
    } else {
      html = `
        <div style="display:flex;align-items:center;gap:.4rem;">
          <div style="width:14px;height:14px;border-radius:3px;background:${colors.bar};opacity:.75;"></div>
          <span>avg ~ 70%cut 범위</span>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <svg width="14" height="14"><line x1="1" y1="7" x2="13" y2="7" stroke="#ef4444" stroke-width="2.5"/></svg>
          <span>빨간 선 = 평균 등급</span>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;">
          <svg width="14" height="14"><line x1="1" y1="7" x2="13" y2="7" stroke="${colors.accent}" stroke-width="2.5" stroke-dasharray="3,2"/></svg>
          <span>클릭 시 상세 정보</span>
        </div>`;
    }
    legend.innerHTML = html;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ██  차트 빌더 3종
  // ════════════════════════════════════════════════════════════════════════════

  // ── 군산대: avgGrade~cut70Grade floating bar ──────────────────────────────
  function buildKunsanChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d.major);
    const dataPoints = data.map(d => {
      const val1 = parseFloat(d.avgGrade) || null;
      const val2 = parseFloat(d.cut70Grade) || null;
      if (val1 === null && val2 === null) return null;
      // Chart.js floating bar expects [min, max]
      return [val1 || val2, val2 || val1];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '평균~70% cut (등급)',
          data: dataPoints,
          backgroundColor: colors.bar,
          borderColor: colors.accent,
          borderWidth: 1, borderRadius: 10, borderSkipped: false,
          barPercentage: 0.55
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          return [
            `모집인원: ${d.recruitNum}명`,
            `경쟁률: ${d.rate}:1`,
            `평균등급: ${d.avgGrade || '-'}등급`,
            `70% cut: ${d.cut70Grade || '-'}등급`
          ];
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 건국대: 50%~70%cut floating bar ──────────────────────────────────────
  function buildKuChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위']);
    const dataPoints = data.map(d => {
      const c50 = parseFloat(d['50%cut(등급)']);
      const c70 = parseFloat(d['70%cut(등급)']);
      return (isNaN(c50) || isNaN(c70)) ? null : [c50, c70];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '50%~70%cut 범위',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.25, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.75, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          return [`모집인원: ${d['모집인원']}명`, `경쟁률: ${d['경쟁률']}:1`,
          `50%cut: ${d['50%cut(등급)']}등급`, `70%cut: ${d['70%cut(등급)']}등급`];
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 광운대 학생부종합(면접형): scatter/line style chart ────────────────────
  function buildKwuChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d.unit);
    const dataPoints = data.map(d => parseFloat(d.grade) || null);

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `학생부 등급 (${adCurrentType})`,
          data: dataPoints,
          borderColor: colors.accent,
          backgroundColor: colors.bar,
          pointBackgroundColor: colors.bar,
          pointBorderColor: colors.accent,
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 9,
          showLine: false
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          return [
            `모집인원: ${d.recruit}명`,
            `경쟁률: ${d.ratio}:1`,
            `학생부등급: ${d.grade}등급`,
            `충원합격 비율: ${d.fillRate}%`,
            `예비번호: ${d.reserve}번`
          ];
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 경희대 학생부교과: gradeAvg~grade70 floating bar ─────────────────────
  function buildKhuGwagyoChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d.major);
    const dataPoints = data.map(d => {
      const top = parseFloat(d.gradeAvg), bot = parseFloat(d.grade70);
      return (isNaN(top) || isNaN(bot)) ? null : [top, bot];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '평균 ~ 70%cut',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, 'rgba(99,102,241,0.75)');
            g.addColorStop(1, 'rgba(199,210,254,0.45)');
            return g;
          },
          borderRadius: 4, borderSkipped: false,
          barPercentage: 0.6, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          return [
            `모집인원: ${d.recruit}명`,
            `2025 경쟁률: ${d.rate25}:1 / 2024: ${d.rate24}:1`,
            `평균등급: ${d.gradeAvg}`,
            `50%cut: ${d.grade50}등급`,
            `70%cut: ${d.grade70}등급`,
            `수능최저 충족율: ${d.minSatRate || '-'}`,
          ];
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 경희대 학생부종합: avg~cut70 floating bar + 빨간 평균선 플러그인 ──────
  function buildKhuJonghapChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d.name);
    const barData = data.map(d => {
      const top = parseFloat(d.avg), bot = parseFloat(d.cut70);
      return (isNaN(top) || isNaN(bot)) ? null : [top, bot];
    });
    const rawData = data;  // 클로저용

    // 커스텀 플러그인: 빨간 평균선
    const redLinePlugin = {
      id: 'khuRedLine',
      afterDatasetsDraw(chart) {
        const { ctx: c, scales: { y } } = chart;
        chart.getDatasetMeta(0).data.forEach((bar, i) => {
          const avg = rawData[i]?.avg;
          if (avg == null) return;
          const yPos = y.getPixelForValue(avg);
          const hw = bar.width / 2;
          c.save();
          c.beginPath();
          c.strokeStyle = '#ef4444'; c.lineWidth = 3;
          c.moveTo(bar.x - hw - 2, yPos);
          c.lineTo(bar.x + hw + 2, yPos);
          c.stroke();
          c.restore();
        });
      }
    };

    const opts = chartOptions(yMax, colors,
      ctx2 => {
        const d = adDispData[ctx2.dataIndex];
        if (!d) return '';
        return [
          `모집인원: ${d.recruit}명`,
          `2025 경쟁률: ${d.rate2025}:1 / 2024: ${d.rate2024}:1`,
          `평균: ${d.avg}등급`,
          `50%cut: ${d.cut50}등급`,
          `70%cut: ${d.cut70}등급`,
          `서류: ${d.doc} / 면접: ${d.interview}`,
        ];
      },
      (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
    );

    // 경희대 학종은 interaction을 nearest로
    opts.interaction = { mode: 'nearest', intersect: true };

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '평균 ~ 70%cut (네오르네상스)',
          data: barData,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(20, 0, 0, 0);
            g.addColorStop(0, '#818cf8');
            g.addColorStop(0.5, '#c7d2fe');
            g.addColorStop(1, '#4f46e5');
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.78,
        }]
      },
      options: opts,
      plugins: [redLinePlugin]
    });
  }

  // ── 동국대: 평균~최저 floating bar ───────────────────────────────────────
  function buildDguChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위']);
    const dataPoints = data.map(d => {
      const avg = parseFloat(d['평균(등급)']);
      const min = parseFloat(d['최저(등급)']);
      return (isNaN(avg) || isNaN(min)) ? null : [avg, min];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '평균~최저 등급 구간',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.25, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.75, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          return [
            `모집인원: ${d['모집인원']}명`,
            `경쟁률: ${d['경쟁률']}:1`,
            `평균등급: ${d['평균(등급)']}등급`,
            `최저등급: ${d['최저(등급)']}등급`,
          ];
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 충남대: 평균(등급) ± 표준편차(등급) floating bar ─────────────────────
  function buildCnuChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위']);
    const dataPoints = data.map(d => {
      const avg = parseFloat(d['평균(등급)']);
      const std = parseFloat(d['표준편차(등급)']) || 0;
      if (isNaN(avg)) return null;
      const thickness = std > 0 ? std : 0.05;
      return [Math.max(1, avg - thickness), Math.min(9, avg + thickness)];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '평균(등급) ± 표준편차 구간',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.3, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.7, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          const lines = [
            `모집인원: ${d['모집인원']}명`,
            `경쟁률: ${d['경쟁률']}:1`,
            `평균(등급): ${d['평균(등급)']}등급`,
          ];
          if (d['표준편차(등급)'] != null && !isNaN(d['표준편차(등급)'])) {
            lines.push(`표준편차: ±${d['표준편차(등급)']}등급`);
          }
          if (d['70%(등급)'] != null && !isNaN(d['70%(등급)'])) {
            lines.push(`70%컷: ${d['70%(등급)']}등급`);
          }
          return lines;
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 충북대: 평균(등급) ± 표준편차(등급) floating bar ─────────────────────
  function buildCbnuChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위']);
    const dataPoints = data.map(d => {
      const avg = parseFloat(d['평균(등급)']);
      const std = parseFloat(d['표준편차(등급)']) || 0;
      if (isNaN(avg)) return null;
      const thickness = std > 0 ? std : 0.05;
      return [Math.max(1, avg - thickness), Math.min(9, avg + thickness)];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '평균(등급) ± 표준편차 구간',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.3, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.7, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          const lines = [
            `모집인원: ${d['모집인원']}명`,
            `경쟁률: ${d['경쟁률']}:1`,
            `평균(등급): ${d['평균(등급)']}등급`,
          ];
          if (d['표준편차(등급)'] != null && !isNaN(d['표준편차(등급)'])) lines.push(`표준편차: ±${d['표준편차(등급)']}등급`);
          if (d['70%(등급)'] != null && !isNaN(d['70%(등급)'])) lines.push(`70%컷: ${d['70%(등급)']}등급`);
          return lines;
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 한국외대 교과전형: 70%(환산점수) 바 차트 (비반전 Y축) ─────────────────
  function buildHufsGwagyoChart(ctx, data, colors) {
    const labels = data.map(d => d['모집단위'] + (d['캠퍼스'] ? ` (${d['캠퍼스'].replace('캠퍼스', '')})` : ''));
    const dataPoints = data.map(d => { const v = parseFloat(d['70%(환산점수)']); return isNaN(v) ? null : v; });
    const valid = dataPoints.filter(v => v !== null);
    const yMin = valid.length ? Math.max(140, Math.floor(Math.min(...valid)) - 3) : 140;
    const yMax = valid.length ? Math.min(200, Math.ceil(Math.max(...valid)) + 2) : 200;

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '70%(환산점수)',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, colors.barLight);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 380 },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          y: {
            min: yMin, max: yMax, reverse: false,
            title: { display: true, text: '환산점수', font: { weight: 'bold', size: 12 }, color: '#adb5bd' },
            ticks: { color: '#adb5bd' },
            grid: { color: 'rgba(127,127,127,0.13)' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#adb5bd', autoSkip: false, maxRotation: 45, minRotation: 35, font: { size: 10 } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,44,95,0.95)', titleColor: '#d4af37', bodyColor: '#fff',
            titleFont: { size: 13, weight: 'bold' }, bodyFont: { size: 11.5 },
            padding: 12, cornerRadius: 10, displayColors: false,
            callbacks: {
              title: ctx => ctx[0].label,
              label: ctx2 => {
                const d = adDispData[ctx2.dataIndex];
                if (!d) return '';
                const lines = [`70%(환산점수): ${d['70%(환산점수)']}`, `모집인원: ${d['모집인원']}명`, `경쟁률: ${d['경쟁률']}:1`];
                if (d['실질경쟁률']) lines.push(`실질경쟁률: ${d['실질경쟁률']}:1`);
                return lines;
              }
            }
          }
        },
        onClick: (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); },
        onHover(e, els) { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; }
      }
    });
  }

  // ── 한국외대 종합전형: 70%(등급) floating bar (표준 등급 Y축) ──────────────
  function buildHufsJonghapChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위'] + (d['캠퍼스'] ? ` (${d['캠퍼스'].replace('캠퍼스', '')})` : ''));
    const dataPoints = data.map(d => {
      const g = parseFloat(d['70%(등급)']);
      return isNaN(g) ? null : [Math.max(1, g - 0.08), Math.min(9, g + 0.08)];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '70%(등급)',
          data: dataPoints,
          backgroundColor: colors.bar,
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          return [
            `70%(등급): ${d['70%(등급)']}`,
            `모집인원: ${d['모집인원']}명`,
            `경쟁률: ${d['경쟁률']}:1`,
          ];
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 한양대: 50%~70%cut floating bar + 평균등급 tooltip ───────────────────
  function buildHyuChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위']);
    const dataPoints = data.map(d => {
      const c50 = parseFloat(d['50%cut']);
      const c70 = parseFloat(d['70%cut']);
      const avg = parseFloat(d['평균등급']);
      if (!isNaN(c50) && !isNaN(c70)) return [c50, c70];
      if (!isNaN(avg) && !isNaN(c70)) return [avg, c70];
      if (!isNaN(avg)) return [Math.max(1, avg - 0.05), Math.min(9, avg + 0.05)];
      return null;
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '50%~70%cut 범위',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.25, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.75, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          const lines = [
            `모집인원: ${d['모집인원']}명`,
            `경쟁률: ${d['경쟁률']}:1`,
          ];
          if (d['추가합격 인원'] != null) lines.push(`추가합격: ${d['추가합격 인원']}명`);
          if (d['평균등급'] != null) lines.push(`평균등급: ${d['평균등급']}등급`);
          if (d['50%cut'] && d['50%cut'] !== '-' && d['50%cut'] !== '') lines.push(`50%cut: ${d['50%cut']}등급`);
          if (d['70%cut'] != null) lines.push(`70%cut: ${d['70%cut']}등급`);
          if (d['수능최저 충족률'] && d['수능최저 충족률'] !== '') lines.push(`수능최저 충족률: ${d['수능최저 충족률']}%`);
          return lines;
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 홍익대: 평균~70% floating bar ───────────────────────────────────────
  function buildHiuChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위']);
    const dataPoints = data.map(d => {
      const avg = parseFloat(d['평균(등급)']);
      const c70 = parseFloat(d['70%(등급)']);
      if (!isNaN(avg) && !isNaN(c70)) return [avg, c70];
      if (!isNaN(avg)) return [Math.max(1, avg - 0.05), Math.min(9, avg + 0.05)];
      return null;
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '평균~70% 범위',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.25, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.75, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          const lines = [
            `모집인원: ${d['모집인원'] ?? '-'}명`,
            `경쟁률: ${d['경쟁률'] ?? '-'}:1`,
          ];
          if (d['추가합격률'] != null && d['추가합격률'] !== '') lines.push(`추가합격률: ${d['추가합격률']}`);
          if (d['평균(등급)'] != null) lines.push(`평균등급: ${d['평균(등급)']}등급`);
          if (d['70%(등급)'] != null) lines.push(`70%(등급): ${d['70%(등급)']}등급`);
          return lines;
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 서강대: 50%~70%cut floating bar ──────────────────────────────────────
  function buildSguChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위']);
    const dataPoints = data.map(d => {
      const c50 = parseFloat(d['50%cut']);
      const c70 = parseFloat(d['70%cut']);
      return (isNaN(c50) || isNaN(c70)) ? null : [c50, c70];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '50%~70%cut 범위',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.25, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.75, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          return [
            `모집인원: ${d['모집인원']}명`,
            `최초경쟁률: ${d['최초경쟁률']}:1`,
            `실질경쟁률: ${d['최종 실질 경쟁률']}:1`,
            `50%cut: ${d['50%cut']}등급`,
            `70%cut: ${d['70%cut']}등급`,
          ];
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 서울시립대: 학생부등급 ± 표준편차 floating bar ───────────────────────
  function buildUosChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d.dept);
    const dataPoints = data.map(d => {
      const g = parseFloat(d.grade);
      if (isNaN(g)) return null;
      const sd = parseFloat(d.stdDev) || 0;
      const thickness = sd > 0 ? sd : 0.05;
      return [Math.max(1, g - thickness), Math.min(9, g + thickness)];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '학생부등급 ± 표준편차',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.3, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.7, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderColor: colors.barDark,
          borderWidth: 1,
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.6, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          const lines = [
            `등록인원: ${d.regCount !== null && d.regCount !== '' ? d.regCount + '명' : '-'}`,
            `학생부등급: ${d.grade}등급`,
          ];
          if (d.stdDev) lines.push(`표준편차: ${d.stdDev}`);
          if (d.score && d.score !== '' && d.score !== null) lines.push(`학생부점수: ${d.score}`);
          return lines;
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 성균관대: 50%~70%cut floating bar ──────────────────────────────────────
  function buildSkuChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위']);
    const dataPoints = data.map(d => {
      const c50 = parseFloat(d['50%cut']);
      const c70 = parseFloat(d['70%cut']);
      return (isNaN(c50) || isNaN(c70)) ? null : [c50, c70];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '50%~70%cut 범위',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.25, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.75, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          return [
            `모집인원: ${d['모집 인원']}명`,
            `지원인원: ${d['지원 인원']}명`,
            `경쟁률: ${d['경쟁률']}:1`,
            `50%cut: ${d['50%cut']}등급`,
            `70%cut: ${d['70%cut']}등급`,
          ];
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 우석대: 평균~70%cut floating bar ─────────────────────────────────────
  function buildWsuChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위']);
    const dataPoints = data.map(d => {
      const avg = parseFloat(d['평균']);
      const c70 = parseFloat(d['70% cut']);
      return (isNaN(avg) || isNaN(c70)) ? null : [avg, c70];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '평균~70%cut 범위',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.25, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.75, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          return [
            `모집인원: ${d['모집인원']}명`,
            `경쟁률: ${d['경쟁률']}:1`,
            `평균: ${d['평균']}등급`,
            `70%cut: ${d['70% cut']}등급`,
          ];
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  function buildWkuChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위']);
    const dataPoints = data.map(d => {
      const c50 = parseFloat(d['50%cut']);
      const c70 = parseFloat(d['70%cut']);
      return (isNaN(c50) || isNaN(c70)) ? null : [c50, c70];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '50%cut~70%cut 범위',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.25, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.75, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          return [
            `모집전형: ${d['모집전형']}`,
            `단과대학: ${d['단과대학']}`,
            `모집인원: ${d['모집인원']}명`,
            `경쟁률: ${d['경쟁률']}:1`,
            `50%cut: ${d['50%cut']}등급`,
            `70%cut: ${d['70%cut']}등급`,
          ];
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  function buildJnuChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위']);
    const dataPoints = data.map(d => {
      const c50 = parseFloat(d['50%cut']);
      const c70 = parseFloat(d['70%cut']);
      return (isNaN(c50) || isNaN(c70)) ? null : [c50, c70];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '50%cut~70%cut 범위',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.25, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.75, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          const lines = [
            `캠퍼스: ${d['campus'] || '-'}`,
            `모집전형: ${d['모집전형']}`,
            `모집인원: ${d['모집인원']}명`,
            `경쟁률: ${d['경쟁률']}:1`,
            `평균등급: ${d['평균등급']}등급`,
            `50%cut: ${d['50%cut']}등급`,
            `70%cut: ${d['70%cut']}등급`,
          ];
          if (d['예비순위']) lines.push(`예비순위: ${d['예비순위']}번`);
          return lines;
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  function buildJjuChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위']);
    const dataPoints = data.map(d => {
      const high = parseFloat(d['최고']);
      const cut = parseFloat(d['70%cut']);
      return (isNaN(high) || isNaN(cut)) ? null : [high, cut];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '최고~70%CUT 범위',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.25, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.75, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          return [
            `모집전형: ${d['모집전형']}`,
            `모집인원: ${d['모집인원']}명`,
            `경쟁률: ${d['경쟁률']}:1`,
            `최고: ${d['최고']}등급`,
            `평균: ${d['평균']}등급`,
            `70%CUT: ${d['70%cut']}등급`,
          ];
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  function buildCauChart(ctx, data, colors, yMax) {
    const labels = data.map(d => d['모집단위']);
    const dataPoints = data.map(d => {
      const c50 = parseFloat(d['50%cut']);
      const c70 = parseFloat(d['70%cut']);
      return (isNaN(c50) || isNaN(c70)) ? null : [c50, c70];
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '50%cut~70%cut 범위',
          data: dataPoints,
          backgroundColor(context) {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return colors.bar;
            const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            g.addColorStop(0, colors.barDark);
            g.addColorStop(0.25, colors.bar);
            g.addColorStop(0.5, colors.barLight);
            g.addColorStop(0.75, colors.bar);
            g.addColorStop(1, colors.barDark);
            return g;
          },
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.65, categoryPercentage: 0.75,
        }]
      },
      options: chartOptions(yMax, colors,
        ctx2 => {
          const d = adDispData[ctx2.dataIndex];
          if (!d) return '';
          const lines = [
            `캠퍼스: ${d['campus'] || '-'}`,
            `모집전형: ${d['모집전형']}`,
            `모집인원: ${d['모집인원']}명`,
            `경쟁률: ${d['경쟁률']}:1`,
            `합격자평균: ${d['passAvg']}등급`,
            `50%cut: ${d['50%cut']}등급`,
            `70%cut: ${d['70%cut']}등급`,
          ];
          return lines;
        },
        (e, els) => { if (els.length) adShowModal(adDispData[els[0].index]); }
      )
    });
  }

  // ── 자동 y축 범위 계산 ───────────────────────────────────────────────────
  function computeAutoRange(data, schema) {
    const vals = [];
    data.forEach(d => {
      if (schema === 'ku') {
        vals.push(parseFloat(d['50%cut(등급)']), parseFloat(d['70%cut(등급)']));
      } else if (schema === 'kunsan') {
        vals.push(parseFloat(d.avgGrade), parseFloat(d.cut70Grade));
      } else if (schema === 'kwu') {
        vals.push(parseFloat(d.grade));
      } else if (schema === 'khu_gwagyo') {
        vals.push(parseFloat(d.gradeAvg), parseFloat(d.grade70));
      } else if (schema === 'khu_jonghap') {
        vals.push(parseFloat(d.avg), parseFloat(d.cut70));
      } else if (schema === 'dgu') {
        vals.push(parseFloat(d['평균(등급)']), parseFloat(d['최저(등급)']));
      } else if (schema === 'sgu' || schema === 'sku' || schema === 'wonkwang' || schema === 'jnu') {
        vals.push(parseFloat(d['50%cut']), parseFloat(d['70%cut']));
      } else if (schema === 'jju') {
        vals.push(parseFloat(d['최고']), parseFloat(d['70%cut']));
      } else if (schema === 'cau') {
        vals.push(parseFloat(d['50%cut']), parseFloat(d['70%cut']));
      } else if (schema === 'wsu') {
        vals.push(parseFloat(d['평균']), parseFloat(d['70% cut']));
      } else if (schema === 'uos') {
        const g = parseFloat(d.grade), sd = parseFloat(d.stdDev) || 0;
        vals.push(g - sd, g + sd);
      } else if (schema === 'cnu' || schema === 'cbnu') {
        const avg = parseFloat(d['평균(등급)']), std = parseFloat(d['표준편차(등급)']) || 0;
        vals.push(avg - std, avg + std);
      } else if (schema === 'hufs') {
        const g = parseFloat(d['70%(등급)']);
        if (!isNaN(g)) vals.push(g);
      } else if (schema === 'hyu') {
        const c50 = parseFloat(d['50%cut']);
        const c70 = parseFloat(d['70%cut']);
        const avg = parseFloat(d['평균등급']);
        if (!isNaN(c50)) vals.push(c50);
        if (!isNaN(c70)) vals.push(c70);
        if (!isNaN(avg)) vals.push(avg);
      } else if (schema === 'hiu') {
        const avg = parseFloat(d['평균(등급)']);
        const c70 = parseFloat(d['70%(등급)']);
        if (!isNaN(avg)) vals.push(avg);
        if (!isNaN(c70)) vals.push(c70);
      }
    });
    const valid = vals.filter(v => !isNaN(v) && v > 0);
    if (!valid.length) return { yMin: 1, yMax: 6 };
    const minVal = Math.min(...valid);
    const maxVal = Math.max(...valid);
    return {
      yMin: Math.max(1, Math.floor(minVal - 0.3)),
      yMax: Math.min(9, Math.ceil(maxVal + 0.3))
    };
  }

  // ── 공통 Chart.js 옵션 팩토리 ─────────────────────────────────────────────
  function chartOptions(yMax, colors, tooltipLabelFn, onClickFn) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 380 },
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      scales: {
        y: {
          min: adCurrentYMin, max: yMax, reverse: true,
          title: { display: true, text: '내신 등급', font: { weight: 'bold', size: 12 }, color: '#adb5bd' },
          ticks: { stepSize: 0.5, color: '#adb5bd' },
          grid: { color: 'rgba(127,127,127,0.13)' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#adb5bd', autoSkip: false, maxRotation: 45, minRotation: 35, font: { size: 10 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: adCurrentUni === '건국대' ? 'rgba(196,214,0,0.92)' : (adCurrentUni === '광운대' ? 'rgba(140,21,21,0.92)' : (adCurrentUni === '동국대' ? 'rgba(163,61,26,0.92)' : (adCurrentUni === '서강대' ? 'rgba(0,47,97,0.92)' : (adCurrentUni === '서울시립대' ? 'rgba(13,26,50,0.95)' : (adCurrentUni === '성균관대' ? 'rgba(0,62,41,0.95)' : (adCurrentUni === '우석대' ? 'rgba(26,60,110,0.95)' : (adCurrentUni === '충남대' ? 'rgba(0,24,82,0.95)' : (adCurrentUni === '충북대' ? 'rgba(118,35,47,0.95)' : (adCurrentUni === '한국외대' ? 'rgba(0,44,95,0.95)' : (adCurrentUni === '한양대' ? 'rgba(14,74,132,0.95)' : (adCurrentUni === '홍익대' ? 'rgba(29,78,216,0.95)' : 'rgba(79,70,229,0.92)')))))))))))
          ,
          titleColor: adCurrentUni === '건국대' ? '#034C2F' : (adCurrentUni === '광운대' ? '#fca5a5' : (adCurrentUni === '동국대' ? '#f4a37e' : (adCurrentUni === '서강대' ? '#dfa800' : (adCurrentUni === '서울시립대' ? '#4a69bd' : (adCurrentUni === '성균관대' ? '#a3e6c5' : (adCurrentUni === '우석대' ? '#93c5fd' : (adCurrentUni === '충남대' ? '#4a7fd4' : (adCurrentUni === '충북대' ? '#f4a5ae' : (adCurrentUni === '한국외대' ? '#d4af37' : (adCurrentUni === '한양대' ? '#d4af37' : (adCurrentUni === '홍익대' ? '#bfdbfe' : '#e0e7ff')))))))))))
          ,
          bodyColor: adCurrentUni === '건국대' ? '#222' : (adCurrentUni === '광운대' ? '#fff' : (adCurrentUni === '동국대' ? '#fff' : (adCurrentUni === '서강대' ? '#fff' : '#fff'))),
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 11.5 },
          padding: 12, cornerRadius: 10, displayColors: false,
          callbacks: {
            title: ctx => ctx[0].label,
            label: tooltipLabelFn,
          }
        }
      },
      onClick: onClickFn,
      onHover(e, els) {
        e.native.target.style.cursor = els.length ? 'pointer' : 'default';
      }
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ██  모달
  // ════════════════════════════════════════════════════════════════════════════
  function adShowModal(data) {
    const modal = document.getElementById('adist-modal');
    const body = document.getElementById('adist-modal-body');
    if (!modal || !body || !data) return;

    const v = (val, fallback = '-') => (val === '' || val === undefined || val === null) ? fallback : val;
    const rowS = `display:flex;justify-content:space-between;align-items:center;padding:.55rem 0;border-bottom:1px solid var(--panel-border);font-size:.88rem;color:var(--text-primary);`;
    const scS = `font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-secondary);margin:.85rem 0 .35rem;`;

    let html = '';

    // ── 건국대 모달 ─────────────────────────────────────────────────────────
    if (adCurrentUni === '건국대') {
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #c4d600;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            ${v(data['학년도'])}학년도 · ${v(data['모집전형'])}
          </span>
        </div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;">${v(data['경쟁률'])}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">충원인원</span><span style="font-weight:700;">${v(data['충원인원'])}명</span></div>
        <div style="${scS}">등급 컷</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">50%cut</span>
          <span style="font-weight:800;font-size:1rem;color:var(--text-primary);">${v(data['50%cut(등급)'])} <small style="font-size:.8rem;font-weight:400;color:var(--text-secondary);">등급</small></span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">70%cut</span>
          <span style="font-weight:800;font-size:1rem;color:var(--text-primary);">${v(data['70%cut(등급)'])} <small style="font-size:.8rem;font-weight:400;color:var(--text-secondary);">등급</small></span></div>
      `;

      // ── 경희대 학생부교과 모달 ────────────────────────────────────────────────
    } else if (adCurrentType === '학생부교과') {
      const fn = val => `<span style="font-weight:700;font-size:1rem;color:var(--text-primary);">${v(val)}</span>`;
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid var(--accent-primary);margin-bottom:.2rem;">
          ${v(data.major)}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">경희대 학생부교과 · 2025학년도</span>
        </div>
        <div style="${scS}">등급</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.6rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(99,102,241,.15);padding:.7rem;border-radius:10px;border:1px solid rgba(99,102,241,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">평균 등급</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--text-primary);">${v(data.gradeAvg)}</div>
          </div>
          <div style="background:var(--upload-card-bg);padding:.7rem;border-radius:10px;border:1px solid var(--panel-border);">
            <div style="font-size:.72rem;color:var(--text-secondary);">50%cut</div>
            <div style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">${v(data.grade50)}</div>
          </div>
          <div style="background:var(--upload-card-bg);padding:.7rem;border-radius:10px;border:1px solid var(--panel-border);">
            <div style="font-size:.72rem;color:var(--text-secondary);">70%cut</div>
            <div style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">${v(data.grade70)}</div>
          </div>
        </div>
        <div style="${scS}">경쟁률 / 모집</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data.recruit)}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">2025 경쟁률</span><span style="font-weight:700;color:var(--text-primary);">${v(data.rate25)}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">2024 경쟁률</span><span style="font-weight:600;">${v(data.rate24)}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">실질 경쟁률</span><span style="font-weight:600;">${v(data.realRate)}:1</span></div>
        <div style="${scS}">수능 최저</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">최저 충족율</span><span style="font-weight:700;color:var(--success-color);">${v(data.minSatRate)}</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">2025 충원 비율</span><span style="font-weight:600;">${v(data.fillRate25)}</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">2024 충원 비율</span><span style="font-weight:600;">${v(data.fillRate24)}</span></div>
        <div style="${scS}">환산 점수</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">50%cut 환산</span><span style="font-weight:700;">${v(data.score50)}</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">70%cut 환산</span><span style="font-weight:700;">${v(data.score70)}</span></div>
      `;

      // ── 동국대 모달 ──────────────────────────────────────────────────────
    } else if (adCurrentUni === '동국대') {
      const is10 = (data['모집전형'] || '').includes('학생부교과');
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #E55D28;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            동국대 ${v(data['학년도'])}학년도 · ${v(data['모집전형'])}
          </span>
        </div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">지원인원</span><span style="font-weight:700;">${v(data['지원인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:var(--text-primary);">${v(data['경쟁률'])}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">충원율</span><span style="font-weight:700;">${v(data['충원율'])}</span></div>
        <div style="${scS}">등급</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">평균(등급)</span>
          <span style="font-weight:800;font-size:1.05rem;color:#E55D28;">${v(data['평균(등급)'])} <small style="font-size:.8rem;font-weight:400;color:var(--text-secondary);">등급</small></span></div>
        <div style="${rowS}${is10 ? '' : 'border-bottom:none;'}"><span style="color:var(--text-secondary);">최저(등급)</span>
          <span style="font-weight:800;font-size:1.05rem;color:#E55D28;">${v(data['최저(등급)'])} <small style="font-size:.8rem;font-weight:400;color:var(--text-secondary);">등급</small></span></div>
        ${is10 ? `
        <div style="${scS}">10과목 등급</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">10과목 평균</span>
          <span style="font-weight:700;">${v(data['10과목평균(등급)'])} <small style="font-size:.8rem;font-weight:400;color:var(--text-secondary);">등급</small></span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">10과목 최저</span>
          <span style="font-weight:700;">${v(data['10과목최저(등급)'])} <small style="font-size:.8rem;font-weight:400;color:var(--text-secondary);">등급</small></span></div>
        ` : ''}
      `;

      // ── 한국외대 모달 ─────────────────────────────────────────────────────
    } else if (adCurrentUni === '한국외대') {
      const isGyogwa = adCurrentType === '교과전형';
      const scoreField = isGyogwa ? '70%(환산점수)' : '70%(등급)';
      const scoreLabel = isGyogwa ? '70%(환산점수)' : '70%(등급)';
      const scoreColor = isGyogwa ? '#002c5f' : '#002c5f';
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #002c5f;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            한국외대 · ${v(data['모집전형'])} · ${v(data['캠퍼스'] || '')}
          </span>
        </div>
        <div style="${scS}">입시 결과</div>
        <div style="display:grid;grid-template-columns:1fr;gap:.6rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(0,44,95,.12);padding:.9rem;border-radius:10px;border:1px solid rgba(0,44,95,.3);">
            <div style="font-size:.78rem;color:var(--text-secondary);">${scoreLabel}</div>
            <div style="font-size:1.6rem;font-weight:800;color:#002c5f;">${v(data[scoreField])}</div>
            <div style="font-size:.72rem;color:var(--text-secondary);">${isGyogwa ? '환산점수' : '등급'}</div>
          </div>
        </div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">학년도</span><span style="font-weight:700;">${v(data['학년도'])}학년도</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">캠퍼스</span><span style="font-weight:700;">${v(data['캠퍼스'])}</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:#002c5f;">${v(data['경쟁률'])}:1</span></div>
        ${data['실질경쟁률'] != null && !isNaN(parseFloat(data['실질경쟁률'])) ? `<div style="${rowS}"><span style="color:var(--text-secondary);">실질경쟁률</span><span style="font-weight:700;">${v(data['실질경쟁률'])}:1</span></div>` : ''}
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">충원인원</span><span style="font-weight:700;">${v(data['충원인원'])}명</span></div>
      `;

      // ── 충북대 모달 ──────────────────────────────────────────────────────
    } else if (adCurrentUni === '충북대') {
      const hasSeoRyu = (data['서류평균'] != null && !isNaN(parseFloat(data['서류평균'])));
      const hasChoSeoRyu = (data['최초서류평균'] != null && !isNaN(parseFloat(data['최초서류평균'])));
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #76232F;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            충북대 · ${v(data['모집전형'])}
          </span>
        </div>
        <div style="${scS}">등급 분포</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.6rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(118,35,47,.12);padding:.7rem;border-radius:10px;border:1px solid rgba(118,35,47,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">평균(등급)</div>
            <div style="font-size:1.4rem;font-weight:800;color:#76232F;">${v(data['평균(등급)'])}</div>
          </div>
          <div style="background:var(--upload-card-bg);padding:.7rem;border-radius:10px;border:1px solid var(--panel-border);">
            <div style="font-size:.72rem;color:var(--text-secondary);">70%(등급)</div>
            <div style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">${v(data['70%(등급)'])}</div>
          </div>
          <div style="background:var(--upload-card-bg);padding:.7rem;border-radius:10px;border:1px solid var(--panel-border);">
            <div style="font-size:.72rem;color:var(--text-secondary);">최저(등급)</div>
            <div style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">${v(data['최저(등급)'])}</div>
          </div>
        </div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">표준편차(등급)</span>
          <span style="font-weight:700;">±${v(data['표준편차(등급)'])}</span></div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">지원인원</span><span style="font-weight:700;">${v(data['지원인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:#76232F;">${v(data['경쟁률'])}:1</span></div>
        ${data['실질경쟁률'] != null && !isNaN(parseFloat(data['실질경쟁률'])) ? `<div style="${rowS}"><span style="color:var(--text-secondary);">실질경쟁률</span><span style="font-weight:700;">${v(data['실질경쟁률'])}:1</span></div>` : ''}
        ${data['최저충족률(%)'] != null && !isNaN(parseFloat(data['최저충족률(%)'])) ? `<div style="${rowS}"><span style="color:var(--text-secondary);">최저충족률</span><span style="font-weight:700;color:var(--success-color);">${v(data['최저충족률(%)'])}%</span></div>` : ''}
        <div style="${scS}">충원</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">충원합격인원</span><span style="font-weight:700;">${v(data['충원합격인원'])}명</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">충원율</span><span style="font-weight:700;">${v(data['충원율(%)'])}%</span></div>
        ${(hasSeoRyu || hasChoSeoRyu) ? `
        <div style="${scS}">서류 평가</div>
        ${hasChoSeoRyu ? `<div style="${rowS}"><span style="color:var(--text-secondary);">최초 서류평균</span><span style="font-weight:700;">${v(data['최초서류평균'])}</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">최초 서류편차</span><span style="font-weight:700;">±${v(data['최초서류편차'])}</span></div>` : ''}
        ${hasSeoRyu ? `<div style="${rowS}"><span style="color:var(--text-secondary);">최종 서류평균</span><span style="font-weight:700;color:#76232F;">${v(data['서류평균'])}</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">최종 서류편차</span><span style="font-weight:700;">±${v(data['서류편차'])}</span></div>` : ''}
        ` : ''}
      `;

      // ── 충남대 모달 ──────────────────────────────────────────────────────
    } else if (adCurrentUni === '충남대') {
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #003087;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            충남대 · ${v(data['모집전형'])}
          </span>
        </div>
        <div style="${scS}">등급 분포</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.6rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(0,48,135,.12);padding:.7rem;border-radius:10px;border:1px solid rgba(0,48,135,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">평균(등급)</div>
            <div style="font-size:1.4rem;font-weight:800;color:#003087;">${v(data['평균(등급)'])}</div>
          </div>
          <div style="background:var(--upload-card-bg);padding:.7rem;border-radius:10px;border:1px solid var(--panel-border);">
            <div style="font-size:.72rem;color:var(--text-secondary);">70%(등급)</div>
            <div style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">${v(data['70%(등급)'])}</div>
          </div>
          <div style="background:var(--upload-card-bg);padding:.7rem;border-radius:10px;border:1px solid var(--panel-border);">
            <div style="font-size:.72rem;color:var(--text-secondary);">최저(등급)</div>
            <div style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">${v(data['최저(등급)'])}</div>
          </div>
        </div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">표준편차(등급)</span>
          <span style="font-weight:700;">±${v(data['표준편차(등급)'])}</span></div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">지원인원</span><span style="font-weight:700;">${v(data['지원인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:#003087;">${v(data['경쟁률'])}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">실질경쟁률</span><span style="font-weight:700;">${v(data['실질경쟁률'])}:1</span></div>
        <div style="${scS}">충원 / 수능최저</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">충원합격인원</span><span style="font-weight:700;">${v(data['충원합격인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">충원율</span><span style="font-weight:700;">${v(data['충원율(%)'])}%</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">최저충족률</span>
          <span style="font-weight:700;color:var(--success-color);">${v(data['최저충족률(%)'])}%</span></div>
        ${(data['1단계 평균 등급'] != null && !isNaN(parseFloat(data['1단계 평균 등급']))) ? `
        <div style="${scS}">1단계 등급</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">1단계 최고</span><span style="font-weight:700;">${v(data['1단계 최고 등급'])}</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">1단계 평균</span><span style="font-weight:700;">${v(data['1단계 평균 등급'])}</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">1단계 최저</span><span style="font-weight:700;">${v(data['1단계 최저 등급'])}</span></div>
        ` : ''}
      `;

      // ── 서강대 모달 ──────────────────────────────────────────────────────
    } else if (adCurrentUni === '서강대') {
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #004ea2;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            서강대 · ${v(data['모집전형'])}
          </span>
        </div>
        <div style="${scS}">등급 컷</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(0,78,162,.12);padding:.8rem;border-radius:10px;border:1px solid rgba(0,78,162,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">50%cut</div>
            <div style="font-size:1.5rem;font-weight:800;color:#004ea2;">${v(data['50%cut'])}</div>
            <div style="font-size:.72rem;color:var(--text-secondary);">등급</div>
          </div>
          <div style="background:rgba(223,168,0,.1);padding:.8rem;border-radius:10px;border:1px solid rgba(223,168,0,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">70%cut</div>
            <div style="font-size:1.5rem;font-weight:800;color:#9a7000;">${v(data['70%cut'])}</div>
            <div style="font-size:.72rem;color:var(--text-secondary);">등급</div>
          </div>
        </div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">지원인원</span><span style="font-weight:700;">${v(data['지원인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">합격인원</span><span style="font-weight:700;">${v(data['합격인원'])}명</span></div>
        <div style="${scS}">경쟁률 / 충원</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">최초경쟁률</span><span style="font-weight:700;color:#004ea2;">${v(data['최초경쟁률'])}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">실질경쟁률</span><span style="font-weight:700;">${v(data['최종 실질 경쟁률'])}:1</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">충원율</span><span style="font-weight:700;color:var(--success-color);">${v(data['충원율 (%)'])}%</span></div>
      `;

      // ── 성균관대 모달 ────────────────────────────────────────────────────
    } else if (adCurrentUni === '성균관대') {
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #003e29;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            성균관대 · 학교장추천
          </span>
        </div>
        <div style="${scS}">등급 컷</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(0,62,41,.12);padding:.8rem;border-radius:10px;border:1px solid rgba(0,62,41,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">50%cut</div>
            <div style="font-size:1.5rem;font-weight:800;color:#003e29;">${v(data['50%cut'])}</div>
            <div style="font-size:.72rem;color:var(--text-secondary);">등급</div>
          </div>
          <div style="background:rgba(26,107,74,.1);padding:.8rem;border-radius:10px;border:1px solid rgba(26,107,74,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">70%cut</div>
            <div style="font-size:1.5rem;font-weight:800;color:#1a6b4a;">${v(data['70%cut'])}</div>
            <div style="font-size:.72rem;color:var(--text-secondary);">등급</div>
          </div>
        </div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집 인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">지원인원</span><span style="font-weight:700;">${v(data['지원 인원'])}명</span></div>
        <div style="${scS}">경쟁률 / 충원</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:#003e29;">${v(data['경쟁률'])}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">충원합격 인원</span><span style="font-weight:700;">${v(data['충원합격 인원'])}명</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">충원율</span><span style="font-weight:700;color:var(--success-color);">${v(data['충원율'])}</span></div>
      `;

      // ── 우석대 모달 ──────────────────────────────────────────────────────
    } else if (adCurrentUni === '우석대') {
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #1a3c6e;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            우석대 · ${v(data['모집전형'])}
          </span>
        </div>
        <div style="${scS}">등급</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(26,60,110,.12);padding:.8rem;border-radius:10px;border:1px solid rgba(26,60,110,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">평균</div>
            <div style="font-size:1.5rem;font-weight:800;color:#1a3c6e;">${v(data['평균'])}</div>
            <div style="font-size:.72rem;color:var(--text-secondary);">등급</div>
          </div>
          <div style="background:rgba(91,141,217,.1);padding:.8rem;border-radius:10px;border:1px solid rgba(91,141,217,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">70%cut</div>
            <div style="font-size:1.5rem;font-weight:800;color:#5b8dd9;">${v(data['70% cut'])}</div>
            <div style="font-size:.72rem;color:var(--text-secondary);">등급</div>
          </div>
        </div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집인원'])}명</span></div>
        <div style="${scS}">경쟁률 / 충원</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:#1a3c6e;">${v(data['경쟁률'])}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">충원합격순위</span><span style="font-weight:700;">${v(data['충원합격순위'])}번</span></div>
        <div style="${scS}">환산점수</div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">70%cut 환산</span><span style="font-weight:700;">${v(data['환산점수70% cut'] ?? data['환산점수'])}</span></div>
      `;

      // ── 서울시립대 모달 ──────────────────────────────────────────────────
    } else if (adCurrentUni === '서울시립대') {
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #1a2b50;margin-bottom:.2rem;">
          ${v(data.dept)}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            서울시립대 · ${v(data.admissionType)}
          </span>
        </div>
        <div style="${scS}">학생부 등급</div>
        <div style="display:flex;justify-content:center;gap:1.2rem;margin-bottom:.8rem;">
          <div style="text-align:center;background:rgba(26,43,80,.1);padding:1rem 1.5rem;border-radius:12px;border:1px solid rgba(26,43,80,.25);">
            <div style="font-size:.72rem;color:var(--text-secondary);">학생부등급</div>
            <div style="font-size:1.9rem;font-weight:800;color:#1a2b50;">${v(data.grade)}</div>
            <div style="font-size:.72rem;color:var(--text-secondary);">등급</div>
          </div>
          ${data.stdDev ? `<div style="text-align:center;background:rgba(74,105,189,.1);padding:1rem 1.5rem;border-radius:12px;border:1px solid rgba(74,105,189,.25);">
            <div style="font-size:.72rem;color:var(--text-secondary);">표준편차</div>
            <div style="font-size:1.9rem;font-weight:800;color:#4a69bd;">±${v(data.stdDev)}</div>
            <div style="font-size:.72rem;color:var(--text-secondary);">등급</div>
          </div>` : ''}
        </div>
        <div style="${scS}">등록 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">등록인원</span>
          <span style="font-weight:700;">${data.regCount !== null && data.regCount !== '' ? v(data.regCount) + '명' : '-'}</span></div>
        ${data.score !== null && data.score !== '' ? `
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">학생부점수(1,000점)</span>
          <span style="font-weight:700;">${v(data.score)}</span></div>` : ''}
      `;

      // ── 군산대 입결 모달 ────────────────────────────────────────────────
    } else if (adCurrentUni === '군산대') {
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid var(--accent-primary);margin-bottom:.2rem;">
          ${v(data.major)}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">군산대 ${adCurrentYear}학년도 ${adCurrentType}</span>
        </div>
        <div style="${scS}">입시 결과</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data.recruitNum)}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">지원인원</span><span style="font-weight:700;">${v(data.applyNum)}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:var(--text-primary);">${v(data.rate)}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">충원합격</span><span style="font-weight:700;color:var(--success-color);">${v(data.addPass)}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">평균 점수 / 등급</span><span style="font-weight:800;font-size:1.05rem;color:var(--text-primary);">${v(data.avgScore)} <small style="font-size:.8rem;font-weight:400;color:var(--text-secondary);">/ ${v(data.avgGrade)}등급</small></span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">70% 점수 / 등급</span><span style="font-weight:800;font-size:1.05rem;color:var(--text-primary);">${v(data.cut70Score)} <small style="font-size:.8rem;font-weight:400;color:var(--text-secondary);">/ ${v(data.cut70Grade)}등급</small></span></div>
      `;

      // ── 광운대 학생부종합 모달 ────────────────────────────────────────────────
    } else if (adCurrentUni === '광운대') {
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid var(--accent-primary);margin-bottom:.2rem;">
          ${v(data.unit)}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">광운대 ${adCurrentType}</span>
        </div>
        <div style="${scS}">입시 결과</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data.recruit)}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:var(--text-primary);">${v(data.ratio)}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">학생부 등급</span><span style="font-weight:800;font-size:1.1rem;color:var(--text-primary);">${v(data.grade)} <small style="font-size:.8rem;font-weight:400;color:var(--text-secondary);">등급</small></span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">충원합격 비율</span><span style="font-weight:700;color:var(--success-color);">${v(data.fillRate)}%</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">예비 번호</span><span style="font-weight:700;">${v(data.reserve)}번</span></div>
      `;

      // ── 전남대 모달 ──────────────────────────────────────────────────────
    } else if (adCurrentUni === '전남대') {
      const hasConv = data['환산평균'] !== undefined && data['환산평균'] !== '';
      const hasInterview = data['면접평균'] !== undefined && data['면접평균'] !== '';
      const hasDoc = data['서류평균'] !== undefined && data['서류평균'] !== '';
      const hasPrac = data['실기평균'] !== undefined && data['실기평균'] !== '';
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #16a34a;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            전남대 · ${v(data['캠퍼스'] || data['campus'])} · ${v(data['모집전형'])}
          </span>
        </div>
        <div style="${scS}">등급 컷</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(22,163,74,.15);padding:.7rem .4rem;border-radius:10px;border:1px solid rgba(22,163,74,.3);">
            <div style="font-size:.68rem;color:var(--text-secondary);">평균</div>
            <div style="font-size:1.3rem;font-weight:800;color:#16a34a;">${v(data['평균등급'])}</div>
            <div style="font-size:.68rem;color:var(--text-secondary);">등급</div>
          </div>
          <div style="background:rgba(22,163,74,.08);padding:.7rem .4rem;border-radius:10px;border:1px solid rgba(22,163,74,.2);">
            <div style="font-size:.68rem;color:var(--text-secondary);">표준편차</div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);">${v(data['표준편차'])}</div>
          </div>
          <div style="background:rgba(22,163,74,.08);padding:.7rem .4rem;border-radius:10px;border:1px solid rgba(22,163,74,.2);">
            <div style="font-size:.68rem;color:var(--text-secondary);">50%cut</div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);">${v(data['50%cut'])}</div>
          </div>
          <div style="background:rgba(22,163,74,.08);padding:.7rem .4rem;border-radius:10px;border:1px solid rgba(22,163,74,.2);">
            <div style="font-size:.68rem;color:var(--text-secondary);">70%cut</div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);">${v(data['70%cut'])}</div>
          </div>
        </div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:#16a34a;">${v(data['경쟁률'])}:1</span></div>
        <div style="${rowS}${hasConv || hasInterview || hasDoc || hasPrac ? '' : ' border-bottom:none;'}"><span style="color:var(--text-secondary);">예비순위</span><span style="font-weight:700;">${v(data['예비순위'])}번</span></div>
        ${hasConv ? `
        <div style="${scS}">환산 점수</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">환산 평균</span><span style="font-weight:700;">${v(data['환산평균'])}</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">환산 50%cut</span><span style="font-weight:700;">${v(data['환산50%cut'])}</span></div>
        <div style="${rowS}${hasInterview || hasDoc || hasPrac ? '' : ' border-bottom:none;'}"><span style="color:var(--text-secondary);">환산 70%cut</span><span style="font-weight:700;">${v(data['환산70%cut'])}</span></div>
        ` : ''}
        ${hasInterview ? `
        <div style="${scS}">면접 점수</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">면접 평균</span><span style="font-weight:700;">${v(data['면접평균'])}</span></div>
        <div style="${rowS}${hasDoc || hasPrac ? '' : ' border-bottom:none;'}"><span style="color:var(--text-secondary);">면접 표준편차</span><span style="font-weight:700;">${v(data['면접편차'])}</span></div>
        ` : ''}
        ${hasDoc ? `
        <div style="${scS}">서류 점수</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">서류 평균</span><span style="font-weight:700;">${v(data['서류평균'])}</span></div>
        <div style="${rowS}${hasPrac ? '' : ' border-bottom:none;'}"><span style="color:var(--text-secondary);">서류 표준편차</span><span style="font-weight:700;">${v(data['서류편차'])}</span></div>
        ` : ''}
        ${hasPrac ? `
        <div style="${scS}">실기 점수</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">실기 평균</span><span style="font-weight:700;">${v(data['실기평균'])}</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">실기 표준편차</span><span style="font-weight:700;">${v(data['실기편차'])}</span></div>
        ` : ''}
      `;

      // ── 원광대 모달 ──────────────────────────────────────────────────────
    } else if (adCurrentUni === '원광대') {
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #0d9488;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            원광대 · ${v(data['모집전형'])}
          </span>
        </div>
        <div style="${scS}">단과대학</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">단과대학</span><span style="font-weight:700;">${v(data['단과대학'])}</span></div>
        <div style="${scS}">등급 컷</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(13,148,136,.12);padding:.8rem;border-radius:10px;border:1px solid rgba(13,148,136,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">50%cut</div>
            <div style="font-size:1.5rem;font-weight:800;color:#0d9488;">${v(data['50%cut'])}</div>
            <div style="font-size:.72rem;color:var(--text-secondary);">등급</div>
          </div>
          <div style="background:rgba(15,118,110,.1);padding:.8rem;border-radius:10px;border:1px solid rgba(15,118,110,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">70%cut</div>
            <div style="font-size:1.5rem;font-weight:800;color:#0f766e;">${v(data['70%cut'])}</div>
            <div style="font-size:.72rem;color:var(--text-secondary);">등급</div>
          </div>
        </div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">지원인원</span><span style="font-weight:700;">${v(data['지원인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:#0d9488;">${v(data['경쟁률'])}:1</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">충원인원</span><span style="font-weight:700;color:var(--success-color);">${v(data['충원인원'])}명</span></div>
      `;

      // ── 전주대 모달 ──────────────────────────────────────────────────────
    } else if (adCurrentUni === '전주대') {
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #2563eb;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            전주대 · ${v(data['모집전형'])}
          </span>
        </div>
        <div style="${scS}">등급</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(37,99,235,.12);padding:.8rem .4rem;border-radius:10px;border:1px solid rgba(37,99,235,.3);">
            <div style="font-size:.68rem;color:var(--text-secondary);">최고</div>
            <div style="font-size:1.3rem;font-weight:800;color:#2563eb;">${v(data['최고'])}</div>
            <div style="font-size:.68rem;color:var(--text-secondary);">등급</div>
          </div>
          <div style="background:rgba(37,99,235,.08);padding:.8rem .4rem;border-radius:10px;border:1px solid rgba(37,99,235,.2);">
            <div style="font-size:.68rem;color:var(--text-secondary);">평균</div>
            <div style="font-size:1.3rem;font-weight:800;color:#1d4ed8;">${v(data['평균'])}</div>
            <div style="font-size:.68rem;color:var(--text-secondary);">등급</div>
          </div>
          <div style="background:rgba(37,99,235,.08);padding:.8rem .4rem;border-radius:10px;border:1px solid rgba(37,99,235,.2);">
            <div style="font-size:.68rem;color:var(--text-secondary);">70%CUT</div>
            <div style="font-size:1.3rem;font-weight:800;color:#1d4ed8;">${v(data['70%cut'])}</div>
            <div style="font-size:.68rem;color:var(--text-secondary);">등급</div>
          </div>
        </div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:#2563eb;">${v(data['경쟁률'])}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">충원합격</span><span style="font-weight:700;color:var(--success-color);">${v(data['충원합격'])}명</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">전형요소</span><span style="font-weight:600;font-size:.85rem;">${v(data['전형요소'])}</span></div>
      `;

      // ── 중앙대 모달 ──────────────────────────────────────────────────────
    } else if (adCurrentUni === '중앙대') {
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #2a5599;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            중앙대 · ${v(data['campus'])} · ${v(data['모집전형'])}
          </span>
        </div>
        <div style="${scS}">등급 컷</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(42,85,153,.15);padding:.8rem .4rem;border-radius:10px;border:1px solid rgba(42,85,153,.35);">
            <div style="font-size:.68rem;color:var(--text-secondary);">합격자 평균</div>
            <div style="font-size:1.3rem;font-weight:800;color:#2a5599;">${v(data['passAvg'])}</div>
            <div style="font-size:.68rem;color:var(--text-secondary);">등급</div>
          </div>
          <div style="background:rgba(42,85,153,.1);padding:.8rem .4rem;border-radius:10px;border:1px solid rgba(42,85,153,.25);">
            <div style="font-size:.68rem;color:var(--text-secondary);">50%cut</div>
            <div style="font-size:1.3rem;font-weight:800;color:#1e3d70;">${v(data['50%cut'])}</div>
            <div style="font-size:.68rem;color:var(--text-secondary);">등급</div>
          </div>
          <div style="background:rgba(42,85,153,.1);padding:.8rem .4rem;border-radius:10px;border:1px solid rgba(42,85,153,.25);">
            <div style="font-size:.68rem;color:var(--text-secondary);">70%cut</div>
            <div style="font-size:1.3rem;font-weight:800;color:#1e3d70;">${v(data['70%cut'])}</div>
            <div style="font-size:.68rem;color:var(--text-secondary);">등급</div>
          </div>
        </div>
        <div style="${scS}">학과 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">계열</span><span style="font-weight:600;">${v(data['계열'])}</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">단과대학</span><span style="font-weight:600;">${v(data['단과대학'])}</span></div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">지원인원</span><span style="font-weight:700;">${v(data['지원인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:#2a5599;">${v(data['경쟁률'])}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">실질경쟁률</span><span style="font-weight:600;">${v(data['실질경쟁률'])}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">지원자 평균</span><span style="font-weight:600;">${v(data['지원자평균'])}등급</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">충원율</span><span style="font-weight:700;color:var(--success-color);">${v(data['충원율'])}%</span></div>
      `;

      // ── 경희대 학생부종합 모달 ────────────────────────────────────────────────
    } else if (adCurrentUni === '경희대') {
      const barPct = val => Math.min(100, Math.max(0, val)).toFixed(1);
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid var(--accent-primary);margin-bottom:.2rem;">
          ${v(data.name)}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">경희대 학생부종합(네오르네상스) · 2025학년도</span>
        </div>
        <div style="${scS}">등급</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.6rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(99,102,241,.15);padding:.7rem;border-radius:10px;border:1px solid rgba(99,102,241,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">평균</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--text-primary);">${v(data.avg)}</div>
          </div>
          <div style="background:var(--upload-card-bg);padding:.7rem;border-radius:10px;border:1px solid var(--panel-border);">
            <div style="font-size:.72rem;color:var(--text-secondary);">50%cut</div>
            <div style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">${v(data.cut50)}</div>
          </div>
          <div style="background:var(--upload-card-bg);padding:.7rem;border-radius:10px;border:1px solid var(--panel-border);">
            <div style="font-size:.72rem;color:var(--text-secondary);">70%cut</div>
            <div style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">${v(data.cut70)}</div>
          </div>
        </div>
        <div style="${scS}">서류 · 면접 점수</div>
        <div style="margin-bottom:.9rem;">
          <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:.25rem;color:var(--text-primary);">
            <span>서류 평가</span><span style="font-weight:700;">${v(data.doc)}</span>
          </div>
          <div style="background:rgba(127,127,127,.12);border-radius:99px;height:8px;">
            <div style="height:8px;border-radius:99px;background:var(--success-color);width:${barPct(data.doc || 0)}%;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:.82rem;margin:.55rem 0 .25rem;color:var(--text-primary);">
            <span>면접 평가</span><span style="font-weight:700;">${v(data.interview)}</span>
          </div>
          <div style="background:rgba(127,127,127,.12);border-radius:99px;height:8px;">
            <div style="height:8px;border-radius:99px;background:var(--success-color);width:${barPct(data.interview || 0)}%;"></div>
          </div>
        </div>
        <div style="${scS}">경쟁률 / 충원</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data.recruit)}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">2025 경쟁률</span><span style="font-weight:700;color:var(--text-primary);">${v(data.rate2025)}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">2024 경쟁률</span><span style="font-weight:600;">${v(data.rate2024)}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">2025 충원율</span><span style="font-weight:600;">${v(data.ratio2025)}%</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">2024 충원율</span><span style="font-weight:600;">${v(data.ratio2024)}%</span></div>
      `;

      // ── 한양대 모달 ──────────────────────────────────────────────────────
    } else if (adCurrentUni === '한양대') {
      const has50 = data['50%cut'] && data['50%cut'] !== '-' && data['50%cut'] !== '';
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #0E4A84;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            한양대 · ${v(data['학년도'])}학년도 · ${v(data['모집전형'])} · ${v(data['계열'])}계열
          </span>
        </div>
        <div style="${scS}">등급 컷</div>
        <div style="display:grid;grid-template-columns:${has50 ? '1fr 1fr 1fr' : '1fr 1fr'};gap:.6rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(14,74,132,.12);padding:.7rem;border-radius:10px;border:1px solid rgba(14,74,132,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">평균등급</div>
            <div style="font-size:1.4rem;font-weight:800;color:#0E4A84;">${v(data['평균등급'])}</div>
          </div>
          ${has50 ? `
          <div style="background:var(--upload-card-bg);padding:.7rem;border-radius:10px;border:1px solid var(--panel-border);">
            <div style="font-size:.72rem;color:var(--text-secondary);">50%cut</div>
            <div style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">${v(data['50%cut'])}</div>
          </div>` : ''}
          <div style="background:var(--upload-card-bg);padding:.7rem;border-radius:10px;border:1px solid var(--panel-border);">
            <div style="font-size:.72rem;color:var(--text-secondary);">70%cut</div>
            <div style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">${v(data['70%cut'])}</div>
          </div>
        </div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:#0E4A84;">${v(data['경쟁률'])}:1</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">추가합격 인원</span><span style="font-weight:700;">${v(data['추가합격 인원'])}명</span></div>
        ${data['수능최저 충족률'] && data['수능최저 충족률'] !== '' ? `<div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">수능최저 충족률</span><span style="font-weight:700;color:var(--success-color);">${v(data['수능최저 충족률'])}%</span></div>` : ''}
      `;

      // ── 홍익대 모달 ──────────────────────────────────────────────────────
    } else if (adCurrentUni === '홍익대') {
      html = `
        <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);padding-bottom:.7rem;border-bottom:2px solid #1d4ed8;margin-bottom:.2rem;">
          ${v(data['모집단위'])}
          <span style="display:block;font-size:.82rem;font-weight:500;color:var(--text-secondary);margin-top:.15rem;">
            홍익대 · ${v(data['학년도'])}학년도 · ${v(data['모집전형'])}
          </span>
        </div>
        <div style="${scS}">등급 컷</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.8rem;text-align:center;">
          <div style="background:rgba(29,78,216,.12);padding:.7rem;border-radius:10px;border:1px solid rgba(29,78,216,.3);">
            <div style="font-size:.72rem;color:var(--text-secondary);">평균(등급)</div>
            <div style="font-size:1.4rem;font-weight:800;color:#1d4ed8;">${v(data['평균(등급)'])}</div>
          </div>
          <div style="background:var(--upload-card-bg);padding:.7rem;border-radius:10px;border:1px solid var(--panel-border);">
            <div style="font-size:.72rem;color:var(--text-secondary);">70%(등급)</div>
            <div style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">${v(data['70%(등급)'])}</div>
          </div>
        </div>
        <div style="${scS}">모집 정보</div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">모집인원</span><span style="font-weight:700;">${v(data['모집인원'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">지원자수</span><span style="font-weight:700;">${v(data['지원자수'])}명</span></div>
        <div style="${rowS}"><span style="color:var(--text-secondary);">경쟁률</span><span style="font-weight:700;color:#1d4ed8;">${v(data['경쟁률'])}:1</span></div>
        <div style="${rowS} border-bottom:none;"><span style="color:var(--text-secondary);">추가합격률</span><span style="font-weight:700;">${v(data['추가합격률'])}</span></div>
      `;
    }

    body.innerHTML = html;
    modal.style.display = 'flex';
  }

  window.adCloseModal = function () {
    const modal = document.getElementById('adist-modal');
    if (modal) modal.style.display = 'none';
  };

  // ── 전형 추천 AI 분석용: 대학별 학종 학과 입결 요약 ──────────────────────
  window.getAdmissionGradeSummary = function (uniLabel) {
    function safe(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }
    try {
      const ex = {
        '건국대학교': () => {
          const years = KU_DATA.map(d => d.학년도).filter(Boolean);
          const mx = years.length ? Math.max(...years) : 0;
          return KU_DATA.filter(d => d.학년도 === mx && d['모집전형'] === 'KU자기추천')
            .map(d => ({ dept: d['모집단위'], avg: null, cut70: safe(d['70%cut(등급)']) }));
        },
        '경희대학교': () => KHU_JONGHAP_DATA
          .map(d => ({ dept: d.name, avg: safe(d.avg), cut70: safe(d.cut70) })),
        '광운대학교': () => {
          const src = KWU_MYUNJEOP_DATA.length ? KWU_MYUNJEOP_DATA : KWU_SEORYU_DATA;
          return src.map(d => ({ dept: d.unit, avg: safe(d.grade), cut70: null }));
        },
        '군산대학교': () => {
          const years = KUNSAN_DATA.map(d => d.year).filter(Boolean);
          const mx = years.length ? Math.max(...years) : 0;
          return KUNSAN_DATA.filter(d => d.year === mx && d.type && d.type.includes('종합'))
            .map(d => ({ dept: d.major, avg: safe(d.avgGrade), cut70: safe(d.cut70Grade) }));
        },
        '동국대학교': () => {
          const years = DGU_DATA.map(d => d['학년도']).filter(Boolean);
          const mx = years.length ? Math.max(...years) : 0;
          return DGU_DATA.filter(d => d['학년도'] === mx && d['모집전형'] && d['모집전형'].includes('Do Dream'))
            .map(d => ({ dept: d['모집단위'], avg: safe(d['평균(등급)']), cut70: safe(d['최저(등급)']) }));
        },
        '서강대학교': () => SGU_DATA
          .filter(d => d['모집전형'] && d['모집전형'].includes('알바트로스'))
          .map(d => ({ dept: d['모집단위'], avg: null, cut70: safe(d['70%cut']) })),
        '서울시립대학교': () => UOS_DATA
          .filter(d => d.admissionType && d.admissionType.includes('학생부종합'))
          .map(d => ({ dept: d.dept, avg: safe(d.grade), cut70: null })),
        '성균관대학교': () => SKU_DATA
          .map(d => ({ dept: d['모집단위'], avg: null, cut70: safe(d['70%cut']) })),
        '우석대학교': () => WSU_DATA
          .filter(d => d['모집전형'] === '지역인재')
          .map(d => ({ dept: d['모집단위'], avg: safe(d['평균']), cut70: safe(d['70% cut']) })),
        '원광대학교': () => WKU_DATA
          .filter(d => d['모집전형'] === '학생부종합')
          .map(d => ({ dept: d['모집단위'], avg: null, cut70: safe(d['70%cut']) })),
        '전남대학교': () => JNU_DATA
          .filter(d => d['모집전형'] && d['모집전형'].includes('지역인재'))
          .map(d => ({ dept: d['모집단위'], avg: safe(d['평균등급']), cut70: safe(d['70%cut']) })),
        '전주대학교': () => JJU_DATA
          .filter(d => d['모집전형'] && d['모집전형'].includes('종합'))
          .map(d => ({ dept: d['모집단위'], avg: safe(d['평균']), cut70: safe(d['70%cut']) })),
        '중앙대학교': () => CAU_DATA
          .filter(d => d['모집전형'] && d['모집전형'].includes('다빈치'))
          .map(d => ({ dept: d['모집단위'], avg: safe(d.passAvg), cut70: safe(d['70%cut']) })),
        '충남대학교': () => CNU_DATA
          .filter(d => d['모집전형'] && d['모집전형'].includes('지역인재'))
          .map(d => ({ dept: d['모집단위'], avg: safe(d['평균(등급)']), cut70: safe(d['70%(등급)']) })),
        '충북대학교': () => CBNU_DATA
          .filter(d => d['모집전형'] && d['모집전형'].includes('종합'))
          .map(d => ({ dept: d['모집단위'], avg: safe(d['평균(등급)']), cut70: safe(d['70%(등급)']) })),
        '한국외국어대학교': () => HUFS_JONGHAP_DATA
          .map(d => ({ dept: d['모집단위'], avg: null, cut70: safe(d['70%(등급)']) })),
        '한양대학교': () => {
          const years = HYU_DATA.map(d => d['학년도']).filter(Boolean);
          const mx = years.length ? Math.max(...years) : 0;
          return HYU_DATA.filter(d => d['학년도'] === mx)
            .map(d => ({ dept: d['모집단위'], avg: safe(d['평균등급']), cut70: safe(d['70%cut']) }));
        },
        '홍익대학교': () => HIU_DATA
          .map(d => ({ dept: d['모집단위'], avg: safe(d['평균(등급)']), cut70: safe(d['70%(등급)']) })),
      };
      const fn = ex[uniLabel];
      if (!fn) return [];
      return fn().filter(d => d.dept && (d.avg !== null || d.cut70 !== null));
    } catch (e) { return []; }
  };

})();
