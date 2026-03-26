$path = "app.js"
$lines = Get-Content $path -Encoding UTF8
$newContent = New-Object System.Collections.Generic.List[string]

$replacement = @'
  function extractCourseData(jsonData, targetName) {
    const tgt = targetName.replace(/\s+/g, "");
    let headerRowIdx = -1, nameCol = -1;
    let gradeYearCol = -1, termCol = -1;
    let subjectCol = -1, subjectCol2 = -1, creditCol = -1, gradeCol = -1, achieveCol = -1;

    for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
      if (!jsonData[i]) continue;
      for (let j = 0; j < jsonData[i].length; j++) {
        const cell = String(jsonData[i][j] || "").replace(/\s+/g, "");
        if (cell === "성명" || cell === "이름") { nameCol = j; headerRowIdx = i; break; }
      }
      if (headerRowIdx !== -1) break;
    }
    if (headerRowIdx === -1) { alert("이수과목 파일에서 성명 열을 찾을 수 없습니다."); return; }

    const headerRow = jsonData[headerRowIdx] || [];
    for (let j = 0; j < headerRow.length; j++) {
      const cell = String(headerRow[j] || "").replace(/\s+/g, "");
      if (!cell) continue;
      if (gradeYearCol === -1 && (cell === "학년" || cell.endsWith("학년"))) gradeYearCol = j;
      if (termCol === -1 && (cell === "학기" || cell.endsWith("학기"))) termCol = j;
      if (cell === "과목" || cell === "교과목" || cell === "교과목명" || cell === "과목명" || cell === "이수과목") subjectCol = j;
      else if (subjectCol2 === -1 && (cell === "교과" || cell === "과목구분" || cell === "교과구분" || cell === "교과영역")) subjectCol2 = j;
      if (creditCol === -1 && (cell === "단위수" || cell === "단위" || cell === "이수단위" || cell.endsWith("단위수"))) creditCol = j;
      if (cell === "석차등급" || cell.endsWith("석차등급")) gradeCol = j;
      else if (gradeCol === -1 && (cell === "등급" || cell.endsWith("등급"))) gradeCol = j;
      if (achieveCol === -1 && cell.includes("성취도")) achieveCol = j;
    }

    if (subjectCol === -1 && headerRow.length >= 6) subjectCol = 5;
    if (creditCol === -1 && headerRow.length >= 7) creditCol = 6;
    if (gradeCol === -1 && headerRow.length >= 10) gradeCol = 9;

    const dataStartIndex = headerRowIdx + 1;
    const extractedCourses = [], achieveOnlyCourses = [];
    let totalWeightedSum = 0, totalCredits = 0, currentStudent = "";

    for (let i = dataStartIndex; i < jsonData.length; i++) {
      const row = jsonData[i]; if (!row) continue;
      const cn = String(row[nameCol] || "").replace(/\s+/g, "");
      if (cn) currentStudent = cn;
      if (!currentStudent || currentStudent !== tgt) continue;

      let subject = subjectCol !== -1 ? String(row[subjectCol] || "").trim() : "";
      if (!subject && subjectCol2 !== -1) subject = String(row[subjectCol2] || "").trim();
      if (!subject || subject === "undefined") continue;
      if (subject.includes("평균") || subject.includes("합계") || subject.includes("소계")) continue;
      if (subject === "계") continue;
      extractedCourses.push(subject);

      let credit = 0;
      if (creditCol !== -1 && row[creditCol] != null) {
        const cm = String(row[creditCol]).match(/\d+(\.\d+)?/);
        if (cm) credit = parseFloat(cm[0]);
      }
      if (credit <= 0) credit = 1;

      let gradeVal = NaN;
      if (gradeCol !== -1 && row[gradeCol] != null) {
        const grStr = String(row[gradeCol]).trim();
        const isP = /^[Pp]$/.test(grStr) || (grStr.toUpperCase().includes("P") && !/\d/.test(grStr));
        if (!isP) {
          const gm = grStr.match(/^(\d+)(\.\d+)?$/);
          if (gm) gradeVal = parseFloat(grStr);
        }
      }

      if (!isNaN(gradeVal) && gradeVal >= 1 && gradeVal <= 9) {
        totalWeightedSum += credit * gradeVal;
        totalCredits += credit;
      } else {
        const achieve = achieveCol !== -1 ? String(row[achieveCol] || "").trim() : "";
        if (achieve && achieve.toUpperCase() !== "P") achieveOnlyCourses.push(subject + "(" + achieve + ")");
      }
    }

    const coursesInput = document.getElementById("courses");
    if (extractedCourses.length > 0) {
      if (coursesInput) coursesInput.value = extractedCourses.join(", ");
      const avgLabel = totalCredits > 0
        ? "가중평균 " + (totalWeightedSum / totalCredits).toFixed(2) + "등급"
        : "등급 산출 불가";
      alert("'" + targetName + "' 학생의 이수과목 " + extractedCourses.length + "개 추출 완료. (" + avgLabel + ")");
    } else {
      if (coursesInput) coursesInput.value = "";
      alert("해당 파일에서 '" + targetName + "' 학생의 데이터를 찾을 수 없습니다.");
    }
    const agInput = document.getElementById("average-grade");
    const afInput = document.getElementById("average-formula");
    if (totalCredits > 0) {
      if (agInput) agInput.value = (totalWeightedSum / totalCredits).toFixed(2) + " 등급";
      if (afInput) afInput.value = "∑(" + totalWeightedSum.toFixed(1) + ") / " + totalCredits + "단위";
    } else {
      if (agInput) agInput.value = "등급 없음";
      if (afInput) afInput.value = "성취도(A, B, C) 전용 과목 등으로 산출 불가";
    }
    const aoInput = document.getElementById("achievement-only");
    if (aoInput) aoInput.value = achieveOnlyCourses.length > 0 ? achieveOnlyCourses.join(", ") : "해당 없음";
  }
'@

$replacementLines = $replacement -split "`r?`n"

# Replace lines 1809 to 1917 (1808 to 1916 0-indexed)
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -eq 1808) {
        foreach ($rLine in $replacementLines) {
            $newContent.Add($rLine)
        }
    } elseif ($i -gt 1808 -and $i -lt 1917) {
    } else {
        $newContent.Add($lines[$i])
    }
}

Set-Content -Path $path -Value $newContent -Encoding UTF8
Write-Output "Range 1809-1917 fixed."
