$path = "app.js"
$lines = Get-Content $path -Encoding UTF8
$newContent = New-Object System.Collections.Generic.List[string]

$replacement = @'
            // '최종단계' 헤더를 바탕으로 합불합 결과 추출
            let rawResult = resultCol !== -1 ? String(row[resultCol] || "").replace(/\s+/g, "") : "";
            let result = "";
            if (rawResult.includes("불합격") || rawResult.includes("탈락") || rawResult === "불") result = "불합격";
            else if (rawResult.includes("충원") || rawResult.includes("추합") || rawResult.includes("예비")) result = "충원합격";
            else if (rawResult.includes("합격") || rawResult.includes("최초") || rawResult === "합") result = "합격";
            else result = rawResult;
            
            pfStudents.push({ name, univ, dept, result, type: admissionType, grade });
            const option = document.createElement("option");
            option.value = pfStudents.length - 1; 
            option.textContent = `[${univ} ${dept}] ${name} - ${result}`;
            pfStudentSelect.appendChild(option);
          }
          alert(`분석 완료: 학생부종합 전형 대상자 총 ${pfStudents.length}명의 데이터를 추출했습니다.`);
'@

$replacementLines = $replacement -split "`r?`n"

# Replace lines 111 to 125 (110 to 124 0-indexed)
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -eq 110) {
        foreach ($rLine in $replacementLines) {
            $newContent.Add($rLine)
        }
    } elseif ($i -gt 110 -and $i -lt 125) {
    } else {
        $newContent.Add($lines[$i])
    }
}

Set-Content -Path $path -Value $newContent -Encoding UTF8
Write-Output "Range 111-125 fixed."
