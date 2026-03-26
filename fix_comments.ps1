$path = "app.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# Remove the line comments I added earlier (// ) from line 388 to 1655 of the ORIGINAL file
# Actually, it's easier to just block comment the current mess.
# I'll find the old declaration and wrap it.

$content = $content -replace '(?s)const universityEvalCriteria = \{.*?서울대학교', 'const universityEvalCriteria = {}; /* 서울대학교'
$content = $content + ' */'

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Output "Block comments applied."
