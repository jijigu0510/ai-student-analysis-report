$path = "app.js"
$lines = Get-Content $path -Encoding UTF8
$newContent = New-Object System.Collections.Generic.List[string]

$replacement = @'
  if (batchExcelUpload) {
    batchExcelUpload.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      globalBatchJsons = [];
      for (const file of files) {
        try {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
          const allSheetData = [];
          for (const sheetName of workbook.SheetNames) {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            if (rows.length > 0) allSheetData.push(...rows);
          }
          globalBatchJsons.push({ fileName: file.name, jsonData: allSheetData });
        } catch (err) { console.error(err); }
      }
      const targetName = nameInput ? nameInput.value.trim() : "";
      if (targetName) { extractBatchData(globalBatchJsons, targetName); }
      else { alert("세부능력 기록 파일을 불러왔습니다. 학생을 선택하시면 자동 추출됩니다."); }
      saveState();
    });
  }

  function extractBatchData(jsonsArray, targetName) {
    if (!targetName) return;
    if (subjectInput) subjectInput.value = "";
    if (creativeInput) creativeInput.value = "";
    if (behaviorInput) behaviorInput.value = "";

    const tgt = targetName.replace(/\s+/g, "");

    for (const dataObj of jsonsArray) {
      const { fileName, jsonData } = dataObj;
      if (!jsonData || jsonData.length === 0) continue;

      let fileTypeHint;
      if (fileName.includes("행동") || fileName.includes("행특") || fileName.includes("종합"))
        fileTypeHint = "behavior";
      else if (fileName.includes("창체") || fileName.includes("자율") || fileName.includes("동아리") ||
        fileName.includes("봉사") || fileName.includes("진로"))
        fileTypeHint = "creative";
      else if (fileName.includes("교과") || fileName.includes("세특") || fileName.includes("과목"))
        fileTypeHint = "subject";
      else
        fileTypeHint = "creative";

      let headerRowIdx = -1, nameCol = -1;
      for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
        if (!jsonData[i]) continue;
        for (let j = 0; j < jsonData[i].length; j++) {
          const ct = String(jsonData[i][j] || "").replace(/\s+/g, "");
          if (ct === "성명" || ct === "이름") { nameCol = j; headerRowIdx = i; break; }
        }
        if (headerRowIdx !== -1) break;
      }
      if (headerRowIdx === -1 || nameCol === -1) continue;

      const headerRow = jsonData[headerRowIdx] || [];
      const subRow = jsonData[headerRowIdx + 1] || [];

      let dataStartIndex = headerRowIdx + 1;
      {
        const sub = subRow.map(c => String(c || "").replace(/\s+/g, ""));
        const hasKeyword = sub.some(c => c === "구분" || c === "특기사항" || c === "활동내용" || c === "시간");
        const hasStudentName = sub.some(c => c.length >= 2 && /[가-힣]/.test(c) && ![
          "구분", "특기사항", "활동내용", "시간", "학기", "학년", "번호"
        ].includes(c));
        if (hasKeyword && !hasStudentName) dataStartIndex = headerRowIdx + 2;
      }

      let detectedType = fileTypeHint;
      let subjCol = -1, detailCol = -1, areaCol = -1, gradeYearCol = -1;

      const maxCols = Math.max(headerRow.length, subRow.length);
      for (let j = 0; j < maxCols; j++) {
        const h = String(headerRow[j] || "").replace(/\s+/g, "");
        const sub = String(subRow[j] || "").replace(/\s+/g, "");
        const combined = h + " " + sub;

        if (combined.includes("행동특성") || combined.includes("종합의견")) {
          detectedType = "behavior"; if (detailCol === -1) detailCol = j;
        }
        if (detectedType !== "behavior" && (h === "교과" || h === "과목" || h === "과목명" || h === "교과목" || h === "교과목명")) {
          detectedType = "subject"; subjCol = j;
        }
        if (detectedType !== "behavior" && combined.includes("세부능력")) {
          detectedType = "subject"; if (detailCol === -1) detailCol = j;
        }
        if (h === "구분" || h === "영역" || h === "활동영역" || sub === "구분" || h.includes("창의")) {
          if (detectedType !== "behavior") { detectedType = "creative"; areaCol = j; }
        }
        if (detailCol === -1 && (h === "특기사항" || sub === "특기사항" || h.includes("특기사항") || sub.includes("특기사항") || h.includes("활동내용") || sub.includes("활동내용"))) {
          detailCol = j;
        }
        if ((h === "학기" || sub === "학기") && gradeYearCol === -1) gradeYearCol = j;
        if (h === "학년" && gradeYearCol === -1) gradeYearCol = j;
      }

      if (detailCol === -1) {
        for (let i = dataStartIndex; i < Math.min(jsonData.length, dataStartIndex + 5); i++) {
          const row = jsonData[i]; if (!row) continue;
          let maxLen = 0;
          for (let j = 0; j < row.length; j++) {
            const len = String(row[j] || "").length;
            if (len > maxLen) { maxLen = len; detailCol = j; }
          }
          if (detailCol !== -1) break;
        }
      }
      if (detailCol === -1) continue;

      let currentStudent = "";
      let extractedText = [];

      if (detectedType === "subject") {
        for (let i = dataStartIndex; i < jsonData.length; i++) {
          const row = jsonData[i]; if (!row) continue;
          const cn = String(row[nameCol] || "").replace(/\s+/g, "");
          if (cn) currentStudent = cn;
          if (!currentStudent || currentStudent !== tgt) continue;
          const subj = subjCol !== -1 ? String(row[subjCol] || "").trim() : "";
          const detail = String(row[detailCol] || "").trim();
          if (detail && detail.length > 2) extractedText.push(subj ? "[" + subj + "]\n" + detail : detail);
        }
        if (extractedText.length > 0)
          subjectInput.value = subjectInput.value
            ? subjectInput.value + "\n\n" + extractedText.join("\n\n")
            : extractedText.join("\n\n");

      } else if (detectedType === "creative") {
        const ag = { "자율": [], "동아리": [], "봉사": [], "진로": [], "기타": [] };
        for (let i = dataStartIndex; i < jsonData.length; i++) {
          const row = jsonData[i]; if (!row) continue;
          const cn = String(row[nameCol] || "").replace(/\s+/g, "");
          if (cn) currentStudent = cn;
          if (!currentStudent || currentStudent !== tgt) continue;
          const area = areaCol !== -1 ? String(row[areaCol] || "").trim() : "";
          const detail = String(row[detailCol] || "").trim();
          if (!detail || detail.length <= 2) continue;
          if (area.includes("자율")) ag["자율"].push(detail);
          else if (area.includes("동아리")) ag["동아리"].push(detail);
          else if (area.includes("봉사")) ag["봉사"].push(detail);
          else if (area.includes("진로")) ag["진로"].push(detail);
          else if (area) ag["기타"].push("[" + area + "]\n" + detail);
          else ag["기타"].push(detail);
        }
        let rt = [];
        if (ag["자율"].length > 0) rt.push("[자율]\n" + ag["자율"].join("\n\n"));
        if (ag["동아리"].length > 0) rt.push("[동아리]\n" + ag["동아리"].join("\n\n"));
        if (ag["봉사"].length > 0) rt.push("[봉사]\n" + ag["봉사"].join("\n\n"));
        if (ag["진로"].length > 0) rt.push("[진로]\n" + ag["진로"].join("\n\n"));
        if (ag["기타"].length > 0) rt.push(ag["기타"].join("\n\n"));
        if (rt.length > 0)
          creativeInput.value = creativeInput.value
            ? creativeInput.value + "\n\n" + rt.join("\n\n")
            : rt.join("\n\n");

      } else { // behavior
        for (let i = dataStartIndex; i < jsonData.length; i++) {
          const row = jsonData[i]; if (!row) continue;
          const cn = String(row[nameCol] || "").replace(/\s+/g, "");
          if (cn) currentStudent = cn;
          if (!currentStudent || currentStudent !== tgt) continue;
          const gd = gradeYearCol !== -1 ? String(row[gradeYearCol] || "").trim() : "";
          const detail = String(row[detailCol] || "").trim();
          if (detail && detail.length > 2) extractedText.push(gd ? "[" + gd + "학기]\n" + detail : detail);
        }
        if (extractedText.length > 0)
          behaviorInput.value = behaviorInput.value
            ? behaviorInput.value + "\n\n" + extractedText.join("\n\n")
            : extractedText.join("\n\n");
      }
    }
  }
'@

$replacementLines = $replacement -split "`r?`n"

# Replace lines 1919 to 2108 (1918 to 2107 0-indexed)
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -eq 1918) {
        foreach ($rLine in $replacementLines) {
            $newContent.Add($rLine)
        }
    } elseif ($i -gt 1918 -and $i -lt 2109) {
    } else {
        $newContent.Add($lines[$i])
    }
}

Set-Content -Path $path -Value $newContent -Encoding UTF8
Write-Output "Range 1919-2108 fixed."
