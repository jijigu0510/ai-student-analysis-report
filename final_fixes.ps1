$path = "app.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# Fix community modal line
$content = $content.Replace('bindModal("btnCom", "공동체역량, reportData.competencies.community || {});', 'bindModal("btnCom", "공동체역량", reportData.competencies.community || {});')

# Fix profileInfo in generateAIReport
$content = $content.Replace('profileInfo = data.grade + "?숇뀈 " + (data.class ? data.class + "諛?" : "") + (data.number ? data.number + "踰?" : "") + "(?깅챸 ?앸왂)";', 'profileInfo = data.grade + "학년 " + (data.class ? data.class + "반 " : "") + (data.number ? data.number + "번 " : "") + "(성명 생략)";')

# Fix formula in generateAIReport
$content = $content.Replace('report.calculationFormula = `醫낇빀?먯닔(${calcTotal}) = (?숈뾽 ${sAca}??횞 ${weights.academic}) + (진로 ${sCar}??횞 ${weights.career}) + (怨듬룞泥?${sCom}??횞 ${weights.community})`;', 'report.calculationFormula = `종합점수(${calcTotal}) = (학업 ${sAca} * ${weights.academic}) + (진로 ${sCar} * ${weights.career}) + (공동체 ${sCom} * ${weights.community})`;')

# Fix evaluation property in reportData (Line 2551)
$content = $content.Replace('{ id: "community", title: "ü }', '{ id: "community", title: "공동체역량" }')

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Output "Final touches complete."
