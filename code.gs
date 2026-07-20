function doGet(e) {
  // 외부 연동(로컬 파일 등)을 위해 파라미터에 따라 JSON 데이터 반환
  if (e && e.parameter && e.parameter.action === 'getStudentData') {
    try {
      const data = getStudentData();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('3학년 내신 성적 및 모의고사 성적 분석')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 클라이언트에서 호출하여 데이터를 가져오는 함수
function getStudentData() {
  // 사용자가 지정한 스프레드시트 연결
  const SPREADSHEET_ID = '1JbgXRiCB02XFeZnNR9pswLhihYY7wObCpjWreTYTe7s';
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 시트 가져오기
  const gpaSheet = ss.getSheetByName('3학년 학생 내신 성적');
  const mockSheet = ss.getSheetByName('3학년 모의고사 성적');
  
  if (!gpaSheet || !mockSheet) {
    throw new Error("데이터 시트를 찾을 수 없습니다. 시트 이름을 확인해주세요.");
  }

  // 내신 데이터 파싱
  const gpaData = gpaSheet.getDataRange().getValues();
  const gpaRecords = [];
  
  for (let i = 1; i < gpaData.length; i++) {
    const row = gpaData[i];
    if (!row[1]) continue; // 이름이 없으면 건너뜀
    
    gpaRecords.push({
      rank: row[0],
      name: row[1],
      '전체내신': row[2],
      '국영수': row[3],
      '국영수과': row[4],
      '국영수사': row[5],
      '국영수사과': row[6],
      '수영과': row[7],
      '국영사': row[8],
      rawRow: row // 모달창에 표시할 전체 원본 데이터
    });
  }

  // 모의고사 데이터 파싱
  const mockData = mockSheet.getDataRange().getValues();
  const mockRecords = [];
  const roundsSet = new Set();
  const classesSet = new Set();
  const yearsSet = new Set();
  const gradesSet = new Set();
  
  // 모의고사 데이터는 3행(인덱스 2)부터 시작
  // 사용자 지정 매핑: A(0):연도, B(1):회차, C(2):학년, D(3):반, E(4):번호, F(5):이름
  for (let i = 2; i < mockData.length; i++) {
    const row = mockData[i];
    const year = row[0];
    const round = row[1];
    const grade = row[2];
    const classNum = row[3];
    const studentNum = row[4];
    const name = row[5];
    
    if (!name || (!year && !round)) continue;
    
    if (year) yearsSet.add(year);
    if (round) roundsSet.add(round);
    if (grade) gradesSet.add(grade);
    if (classNum) classesSet.add(classNum);
    
    // 점수 데이터는 G열(6)부터 시작한다고 가정 (데이터 구조 유지하며 +1 오프셋 적용)
    mockRecords.push({
      year: year,
      round: round,
      grade: grade,
      classNum: classNum,
      studentNum: studentNum,
      name: name,
      '국어': { subjectName: row[6], raw: row[7], std: row[8], grade: row[10] },
      '수학': { subjectName: row[11], raw: row[12], std: row[13], grade: row[15] },
      '영어': { raw: row[16], std: null, grade: row[17] },
      '한국사': { raw: row[18], std: null, grade: row[19] },
      '탐구영역1': { subjectName: row[20], raw: row[21], std: row[22], grade: row[24] },
      '탐구영역2': { subjectName: row[25], raw: row[26], std: row[27], grade: row[29] },
      rawRow: row 
    });
  }

  return {
    gpa: gpaRecords,
    mock: mockRecords,
    rounds: Array.from(roundsSet).sort(),
    classes: Array.from(classesSet).sort((a, b) => a - b),
    years: Array.from(yearsSet).sort((a, b) => b - a),
    grades: Array.from(gradesSet).sort()
  };
}