/**
 * 모의고사 분석 연동 - Google Apps Script
 * ============================================================
 * 배포 방법:
 *   1. Google Apps Script (script.google.com) 에서 새 프로젝트 생성
 *   2. 이 코드를 붙여넣기
 *   3. 상단 메뉴 → 배포 → 새 배포
 *   4. 유형: 웹 앱 / 실행 계정: 나 / 액세스 권한: 모든 사람
 *   5. 배포 후 URL을 웹 앱의 "연동 설정 > GAS 웹 앱 URL"에 입력
 *
 * 스프레드시트 구조 (각 과목 시트):
 *   A열: 문항번호  B열: 정답  C열: 배점  D열: 영역  E열: 성취기준  F열: 전국정답률
 * ============================================================
 */

// ★ 연동할 스프레드시트 ID (URL에서 /d/ 와 /edit 사이 값)
const SPREADSHEET_ID = '11ekZl0fRL96rCbyyXortUSf-sVwzPqObJ-4gWAdhG90';

// ★ 성적 데이터를 저장할 시트 이름
const SCORE_SHEET_NAME = '성적데이터';

// ============================================================
// GET 핸들러 - 시트 목록 및 데이터 읽기
// ============================================================
function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || 'sheets';
  const callback = params.callback; // JSONP 지원용 (선택)

  let result;
  try {
    if (action === 'sheets') {
      result = getSheetNames();
    } else if (action === 'sheetData') {
      const sheetName = params.sheet;
      if (!sheetName) throw new Error('sheet 파라미터가 필요합니다.');
      result = getSheetData(sheetName);
    } else if (action === 'allSheets') {
      result = getAllSheetsData();
    } else {
      result = { success: false, error: '알 수 없는 action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  const json = JSON.stringify(result);

  // JSONP 방식 지원 (callback 파라미터가 있으면)
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// POST 핸들러 - 성적 데이터 저장
// ============================================================
function doPost(e) {
  let result;
  try {
    const raw = e.postData ? e.postData.contents : '[]';
    const records = JSON.parse(raw);
    result = saveStudentData(Array.isArray(records) ? records : [records]);
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 시트 목록 반환
// ============================================================
function getSheetNames() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets().map(s => s.getName());
  return { success: true, sheets: sheets };
}

// ============================================================
// 특정 시트 데이터 반환
// ============================================================
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { success: false, error: "시트 '" + sheetName + "'을 찾을 수 없습니다." };
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) {
    return { success: true, sheetName: sheetName, data: [] };
  }

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  return { success: true, sheetName: sheetName, data: values };
}

// ============================================================
// 전체 시트 데이터 반환 (subject -> rows 맵)
// ============================================================
function getAllSheetsData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();
  const result = {};

  sheets.forEach(function(sheet) {
    const name = sheet.getName();
    // 성적 저장용 시트는 제외
    if (name === SCORE_SHEET_NAME) return;

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow > 0 && lastCol > 0) {
      result[name] = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    } else {
      result[name] = [];
    }
  });

  return { success: true, data: result };
}

// ============================================================
// 학생 성적 데이터 저장
// ============================================================
function saveStudentData(records) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 시트 없으면 생성
  let sheet = ss.getSheetByName(SCORE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SCORE_SHEET_NAME);
    const headers = [
      '저장일시', '학년', '반', '번호', '성명', '과목',
      '등급', '원점수', '표준점수', '전국백분위', '오답문항', '오답문항_정답률'
    ];
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);

    // 헤더 서식
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4a4a6a');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
  }

  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  records.forEach(function(record) {
    sheet.appendRow([
      now,
      record['학년'] || '',
      record['반'] || '',
      record['번호'] || '',
      record['성명'] || '',
      record['과목'] || '',
      record['등급'] || '',
      record['원점수'] || '',
      record['표준점수'] || '',
      record['전국백분위'] || '',
      record['오답문항'] || '',
      record['오답문항_정답률'] || ''
    ]);
  });

  return { success: true, count: records.length };
}
