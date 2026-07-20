// ================================================================
// 수시지원상담카드 → Google Sheets 저장 백엔드
// 사용법:
//   1. 스프레드시트 열기 → 확장 프로그램 → Apps Script
//   2. 이 코드 전체 붙여넣기 (기존 코드 교체)
//   3. 저장(Ctrl+S) → 배포 → 새 배포 → 유형: 웹 앱
//   4. 실행 계정: 나(본인), 액세스 권한: 모든 사용자
//   5. 배포 후 웹앱 URL 복사 → 프로그램 "⚙️ URL 설정" 에 붙여넣기
// ================================================================

const SPREADSHEET_ID = '1yy8FlQg44M39aeeE5CiecTUkil8dJGq654_uY2Y6QiU';
const HEADERS = [
  '내보낸 시각', '학번', '이름', '학년', '반', '번호', '내신성적',
  '순번', '대학명', '학과명', '전형유형', '전형명', '수능최저',
  '2027모집인원', '2026경쟁률', '최초합격자평균', '면접/시험일정', '전략', '_json'
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const header = data.header || {};
    const rows = data.rows || [];

    const hakbun = String(header.hakbun || '').trim();

    // 학번 4자리: 학년(1) + 반(1) + 번호(2)
    const grade    = hakbun.charAt(0) || '?';
    const classNum = hakbun.charAt(1) || '?';
    const number   = hakbun.slice(2)  || '';
    const sheetName = classNum !== '?' ? classNum + '반' : '미입력';

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      _writeHeader(sheet);
    } else if (sheet.getLastRow() === 0) {
      _writeHeader(sheet);
    }

    // 동일 학번 기존 행 삭제(덮어쓰기)
    if (hakbun) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const col = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
        for (let i = col.length - 1; i >= 0; i--) {
          if (String(col[i][0]).trim() === hakbun) sheet.deleteRow(i + 2);
        }
      }
    }

    const now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    const fullJson = JSON.stringify({ header: data.header, rows: data.rows, teacher: data.teacher || {} });

    // 지원 행이 없어도 학생 정보는 저장
    let filledRows = rows.filter(r => r.uni || r.major || r.typeName);
    if (!filledRows.length) filledRows = [{}];

    let added = 0;
    filledRows.forEach((row, idx) => {
      sheet.appendRow([
        now,
        hakbun,
        header.name      || '',
        grade,
        classNum,
        number,
        header.naeshin   || '',
        idx + 1,
        row.uni          || '',
        row.major        || '',
        row.typeKind     || '',
        row.typeName     || '',
        row.minreqFull   || row.minreq || '',
        row.quota        || '',
        row.comp         || '',
        row.avg          || '',
        row.exam         || '',
        row.strategy     || '',
        idx === 0 ? fullJson : ''  // 전체 JSON은 첫 행에만 저장
      ]);
      added++;
    });

    return _json({ ok: true, message: `[${sheetName}] ${header.name || hakbun} · ${added}개 지원안 저장 완료`, sheet: sheetName, count: added });
  } catch(err) {
    return _json({ ok: false, message: err.message });
  }
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  if (params.action === 'fetch') {
    return _fetchStudentData(params.hakbun || '', params.name || '');
  }
  if (params.action === 'list') {
    return _listStudents();
  }
  return _json({ ok: true, message: '수시지원상담카드 Sheets API 연결 성공' });
}

function _listStudents() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    const byKey = {};

    sheets.forEach(sheet => {
      if (sheet.getLastRow() < 2) return;
      const data = sheet.getDataRange().getValues();
      const hdrs = data[0].map(v => String(v));
      const iHakbun = hdrs.indexOf('학번');
      const iName   = hdrs.indexOf('이름');
      const iJson   = hdrs.indexOf('_json');

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const hakbun = String(row[iHakbun] || '').trim();
        const name   = String(row[iName]   || '').trim();
        if (!hakbun && !name) continue;
        const ts = row[0] ? new Date(row[0]).getTime() : 0;
        const key = hakbun || name;
        if (!byKey[key] || ts > byKey[key].ts) {
          byKey[key] = { hakbun, name, ts, hasJson: !!(iJson >= 0 && row[iJson]) };
        }
      }
    });

    const students = Object.values(byKey)
      .sort((a, b) => a.hakbun.localeCompare(b.hakbun, 'ko') || a.name.localeCompare(b.name, 'ko'))
      .map(s => ({ hakbun: s.hakbun, name: s.name, ts: s.ts ? new Date(s.ts).toISOString() : '', hasJson: s.hasJson }));

    return _json({ ok: true, students });
  } catch(err) {
    return _json({ ok: false, message: err.message });
  }
}

function _fetchStudentData(hakbun, name) {
  try {
    if (!hakbun && !name) return _json({ ok: false, message: '학번 또는 이름을 입력하세요.' });

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    let best = null;

    sheets.forEach(sheet => {
      if (sheet.getLastRow() < 2) return;
      const data = sheet.getDataRange().getValues();
      const hdrs = data[0].map(v => String(v));
      const iHakbun = hdrs.indexOf('학번');
      const iName   = hdrs.indexOf('이름');
      const iJson   = hdrs.indexOf('_json');

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rHakbun = String(row[iHakbun] || '').trim();
        const rName   = String(row[iName]   || '').trim();
        const match = (hakbun && rHakbun === hakbun.trim()) || (name && rName === name.trim());
        if (!match) continue;

        const ts = row[0] ? new Date(row[0]) : new Date(0);
        if (best && best.ts >= ts) continue;

        if (iJson >= 0 && row[iJson]) {
          try {
            const state = JSON.parse(row[iJson]);
            best = { ts, name: rName, hakbun: rHakbun, state };
          } catch(_) {}
        }
      }
    });

    if (!best) {
      return _json({ ok: false, message: '데이터가 없습니다. 학생이 아직 제출하지 않았거나 이름을 확인하세요.' });
    }
    return _json({ ok: true, name: best.name, hakbun: best.hakbun, state: best.state });
  } catch(err) {
    return _json({ ok: false, message: err.message });
  }
}

function _writeHeader(sheet) {
  sheet.appendRow(HEADERS);
  const r = sheet.getRange(1, 1, 1, HEADERS.length);
  r.setFontWeight('bold')
   .setBackground('#1a1a3e')
   .setFontColor('#ffffff')
   .setWrap(true)
   .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 145);  // 내보낸 시각
  sheet.setColumnWidth(9, 130);  // 대학명
  sheet.setColumnWidth(10, 130); // 학과명
  sheet.setColumnWidth(12, 140); // 전형명
  sheet.setColumnWidth(13, 160); // 수능최저
  sheet.setColumnWidth(17, 160); // 면접/시험일정
  sheet.setColumnWidth(18, 160); // 전략
  sheet.setColumnWidth(19, 10);  // _json (숨김)
  sheet.hideColumns(19);
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
