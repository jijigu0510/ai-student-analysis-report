$path = "app.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 1. Fix unclosed quotes in classCol (Line 1722)
$content = $content -replace 'String\(c\)\.replace\(/\\s\+/g, ""\) === "諛\?', 'String(c).replace(/\s+/g, "") === "반"'

# 2. Fix unclosed label quotes (Line 1746, 1747)
$content = $content -replace 'label\.push\(sClass \+ "諛\?', 'label.push(sClass + "반"'
$content = $content -replace 'label\.push\(sNum \+ "踰\?', 'label.push(sNum + "번"'

# 3. Fix achieveCol unclosed quote (Line 1840)
$content = $content -replace 'cell\.includes\("성취\?\?\)\)', 'cell.includes("성취도"))'

# 4. Fix ag object missing quote (Line 2066)
$content = $content -replace '"자율": \[\], "동아리: \[\],', '"자율": [], "동아리": [],'

# 5. Fix community modal missing quote (Line 2182)
$content = $content -replace 'bindModal\("btnCom", "공동체역량,', 'bindModal("btnCom", "공동체역량",'

# 6. Fix profileInfo broken strings (Line 2218)
$content = $content -replace '\+ "諛\?"', '+ "반"'
$content = $content -replace '\+ "踰\?"', '+ "번"'

# 7. Fix formula broken strings (Line 2336)
$content = $content -replace '\+ "\(?숈뾽 ', '+ "(학업 '
$content = $content -replace '\??횞 ', '* '

# 8. Fix community title in reportData (Line 2551)
$content = $content -replace 'title: "공동체역\?\? }', 'title: "공동체역량" }'

# 9. Fix university name keys in criteria object (Mass fix)
$content = $content.Replace('?쒖슱?€?숆탳', '서울대학교')
$content = $content.Replace('?곗꽭?€?숆탳', '연세대학교')
$content = $content.Replace('怨좊젮?€?숆탳', '고려대학교')
$content = $content.Replace('?쒓컯?€?숆탳', '서강대학교')
$content = $content.Replace('?깃퇏愿€?€?숆탳', '성균관대학교')
$content = $content.Replace('?쒖뼇?€?숆탳', '한양대학교')
$content = $content.Replace('以묒븰?€?숆탳', '중앙대학교')
$content = $content.Replace('寃쏀씗?€?숆탳', '경희대학교')
$content = $content.Replace('?쒓뎅?멸뎅?대??숆탳', '한국외국어대학교')
$content = $content.Replace('?쒖슱?쒕┰?€?숆탳', '서울시립대학교')
$content = $content.Replace('嫄닿뎅?€?숆탳', '건국대학교')
$content = $content.Replace('?숆뎅?€?숆탳', '동국대학교')
$content = $content.Replace('?댁솕?ъ옄?€?숆탳', '이화여자대학교')
$content = $content.Replace('?⑥뎅?€?숆탳', '단국대학교')
$content = $content.Replace('?꾨턿?€?숆탳', '전북대학교')

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Output "Surgical fix complete."
