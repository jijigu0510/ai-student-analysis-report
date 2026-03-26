$filePath = "c:\Users\user\OneDrive - 부안고등학교\부안고등학교(1)\새 폴더\app.js"
$content = Get-Content $filePath -Raw -Encoding UTF8

$newContent = @"
    "\uc131\uade0\uad00\ub300\ud559\uad50": {
      "무전공/자유전공": ["자유전공계열"],
      "계열모집(광역/전공예약)": ["인문과학계열", "사회과학계열", "자연과학계열", "공학계열"],
      "독립모집(인문/사회/상경)": ["경영학과", "글로벌리더학부", "글로벌경제학과", "글로벌경영학과", "영상학과", "의상학과", "교육학과", "한문교육과"],
      "독립모집(자연/공학/사범)": ["전자전기공학부", "소프트웨어학과", "글로벌바이오메디컬공학과", "건축학과(5년제)", "수학교육과", "컴퓨터교육과"],
      "첨단 및 계약학과": ["반도체시스템공학과", "지능형소프트웨어학과", "배터리학과", "반도체융합공학과", "에너지학과", "양자정보공학과", "바이오신약·규제과학과", "글로벌융합학부(인공지능융합전공)"],
      "의·약학 및 예체능": ["의예과", "약학과", "스포츠과학과", "연기예술학과", "무용학과"],
      "기타": ["미래융합대학(응용AI융합학부)"]
    },
"@

# Regex to match the SKKU block in universityData
# We use the unicode escaped key as the anchor
$regex = '(?s)    "\\uc131\\uade0\\uad00\\ub300\\ud559\\uad50": \{.*?\n    \},'

if ($content -match $regex) {
    $content = [regex]::Replace($content, $regex, $newContent)
    Set-Content $filePath $content -Encoding UTF8
    Write-Host "Successfully updated SKKU data."
} else {
    Write-Host "Could not find SKKU data block using regex."
}
