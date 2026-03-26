$path = "app.js"
$lines = Get-Content $path -Encoding UTF8
$newLines = New-Object System.Collections.Generic.List[string]

# Fixed lines 111-117 using single quotes for the array elements to avoid escaping double quotes
$fixed111to117 = @(
    "            // '최종단계' 헤더를 바탕으로 합불 결과 추출",
    '            let rawResult = resultCol !== -1 ? String(row[resultCol] || "").replace(/\s+/g, "") : "";',
    '            let result = "";',
    '            if (rawResult.includes("불합격") || rawResult.includes("탈락") || rawResult === "불") result = "불합격";',
    '            else if (rawResult.includes("충원") || rawResult.includes("추합") || rawResult.includes("예비")) result = "충원합격";',
    '            else if (rawResult.includes("합격") || rawResult.includes("최초합") || rawResult === "합") result = "합격";',
    '            else result = rawResult;'
)

for ($i = 0; $i -lt $lines.Length; $i++) {
    # Line indices are 0-based, so line 111 is index 110
    if ($i -ge 110 -and $i -le 116) {
        $newLines.Add($fixed111to117[$i - 110])
    } else {
        $newLines.Add($lines[$i])
    }
}

Set-Content -Path $path -Value $newLines -Encoding UTF8
