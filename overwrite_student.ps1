$path = "app.js"
$lines = Get-Content $path -Encoding UTF8
$newContent = New-Object System.Collections.Generic.List[string]

$replacement = @'
  if (excelUpload) {
    excelUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (evt) {
        try {
          const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
          if (!studentSelect) return;
          studentSelect.innerHTML = "<option value='' disabled selected>학생을 선택하세요</option>";
          let studentCount = 0;
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
            if (!jsonData[i]) continue;
            const rowStr = jsonData[i].join("").replace(/\s+/g, "");
            if (rowStr.includes("성명") || rowStr.includes("이름")) { headerRowIndex = i; break; }
          }
          if (headerRowIndex !== -1) {
            const headerRow = jsonData[headerRowIndex];
            const nameCol = headerRow.findIndex(c => c && (String(c).replace(/\s+/g, "").includes("성명") || String(c).replace(/\s+/g, "").includes("이름")));
            const gradeCol = headerRow.findIndex(c => c && String(c).replace(/\s+/g, "") === "학년");
            const classCol = headerRow.findIndex(c => c && String(c).replace(/\s+/g, "") === "반");
            const numCol = headerRow.findIndex(c => c && String(c).replace(/\s+/g, "").includes("번호"));
            const hakbunCol = headerRow.findIndex(c => c && String(c).replace(/\s+/g, "").includes("학번"));
            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (!row) continue;
              let sName = nameCol !== -1 ? String(row[nameCol] || "").trim() : "";
              if (!sName || sName === "undefined") continue;
              let sGrade = gradeCol !== -1 ? String(row[gradeCol] || "").replace(/[^0-9]/g, "") : "";
              let sClass = classCol !== -1 ? String(row[classCol] || "").replace(/[^0-9]/g, "") : "";
              let sNum = numCol !== -1 ? String(row[numCol] || "").replace(/[^0-9]/g, "") : "";
              if (hakbunCol !== -1 && row[hakbunCol]) {
                let hakbun = String(row[hakbunCol]).replace(/[^0-9]/g, "");
                if (hakbun.length >= 4) {
                  if (!sGrade) sGrade = hakbun.substring(0, 1);
                  if (!sClass) sClass = hakbun.substring(1, 3).replace(/^0+/, "");
                  if (!sNum) sNum = hakbun.substring(3).replace(/^0+/, "");
                }
              }
              const option = document.createElement("option");
              option.value = sName;
              option.dataset.grade = sGrade; option.dataset.class = sClass; option.dataset.number = sNum;
              let label = [];
              if (sGrade) label.push(sGrade + "학년");
              if (sClass) label.push(sClass + "반");
              if (sNum) label.push(sNum + "번");
              label.push(sName);
              option.textContent = label.join(" ");
              studentSelect.appendChild(option);
              studentCount++;
            }
          }
          if (studentCount > 0) {
            alert("총 " + studentCount + "명의 인적사항을 불러왔습니다. 아래에서 학생을 선택하세요.");
            studentSelect.focus();
          } else {
            alert("인적사항 데이터를 불러오지 못했거나 해당 형식을 찾을 수 없습니다.");
          }
        } catch (error) { console.error(error); alert("파일 읽는 중 오류가 발생했습니다."); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  if (studentSelect) {
    studentSelect.addEventListener("change", () => {
      console.log("studentSelect change event triggered.");
      saveState();
      const selected = studentSelect.options[studentSelect.selectedIndex];
      if (!selected || selected.disabled) return;
      if (gradeInput) gradeInput.value = selected.dataset.grade || "";
      if (classInput) classInput.value = selected.dataset.class || "";
      if (numberInput) numberInput.value = selected.dataset.number || "";
      if (nameInput) nameInput.value = selected.value || "";
      const targetName = nameInput.value.trim();
      if (targetName) {
        if (globalCourseJson) extractCourseData(globalCourseJson, targetName);
        if (globalBatchJsons.length > 0) extractBatchData(globalBatchJsons, targetName);
      }
    });
  }

  if (courseExcelUpload) {
    courseExcelUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (evt) {
        try {
          const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
          const allRows = [];
          for (const sheetName of workbook.SheetNames) {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            if (rows.length > 0) allRows.push(...rows);
          }
          globalCourseJson = allRows;
          const targetName = nameInput ? nameInput.value.trim() : "";
          if (targetName) { extractCourseData(globalCourseJson, targetName); }
          else { alert("이수과목 파일을 불러왔습니다. 먼저 학생을 선택하시면 이수과목이 자동 추출됩니다."); }
          saveState();
        } catch (error) { console.error(error); alert("파일 읽는 중 오류가 발생했습니다."); }
      };
      reader.readAsArrayBuffer(file);
    });
  }
'@

$replacementLines = $replacement -split "`r?`n"

# Replace lines 1700 to 1807 (1699 to 1806 0-indexed)
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -eq 1699) {
        foreach ($rLine in $replacementLines) {
            $newContent.Add($rLine)
        }
    } elseif ($i -gt 1699 -and $i -lt 1807) {
        # Skip original lines in this range
    } else {
        $newContent.Add($lines[$i])
    }
}

Set-Content -Path $path -Value $newContent -Encoding UTF8
Write-Output "Range 1700-1807 fixed."
