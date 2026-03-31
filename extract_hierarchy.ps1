$sharedStringsPath = "c:\Users\user\OneDrive - 부안고등학교\부안고등학교(1)\프로그램\setuek_1\tmp_curriculum\xl\sharedStrings.xml"
$sheet1Path = "c:\Users\user\OneDrive - 부안고등학교\부안고등학교(1)\프로그램\setuek_1\tmp_curriculum\xl\worksheets\sheet1.xml"

[xml]$ss = Get-Content -Path $sharedStringsPath
$strings = $ss.sst.si.t

[xml]$sheet = Get-Content -Path $sheet1Path
$rows = $sheet.worksheet.sheetData.row

$hierarchy = @{}

foreach ($row in $rows) {
    $cells = $row.c
    if ($cells.Count -lt 4) { continue }
    
    $curIndex = [int]$cells[0].v
    $catIndex = [int]$cells[1].v
    $selIndex = [int]$cells[2].v
    $subIndex = [int]$cells[3].v
    
    $cur = $strings[$curIndex]
    $cat = $strings[$catIndex]
    $sel = $strings[$selIndex]
    $sub = $strings[$subIndex]
    
    if ($cur -eq "교육과정") { continue } # Header

    if (-not $hierarchy.ContainsKey($cur)) { $hierarchy[$cur] = @{} }
    if (-not $hierarchy[$cur].ContainsKey($cat)) { $hierarchy[$cur][$cat] = @{} }
    if (-not $hierarchy[$cur][$cat].ContainsKey($sel)) { $hierarchy[$cur][$cat][$sel] = @() }
    if ($hierarchy[$cur][$cat][$sel] -notcontains $sub) {
        $hierarchy[$cur][$cat][$sel] += $sub
    }
}

$hierarchy | ConvertTo-Json -Depth 10
