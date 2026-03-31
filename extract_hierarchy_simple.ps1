$sharedStringsPath = "c:\tmp\curriculum_xml\sharedStrings.xml"
$sheet1Path = "c:\tmp\curriculum_xml\sheet1.xml"

[xml]$ss = Get-Content -Path $sharedStringsPath
$strings = $ss.sst.si.t

[xml]$sheet = Get-Content -Path $sheet1Path
$rows = $sheet.worksheet.sheetData.row

$hierarchy = @{}

foreach ($row in $rows) {
    if ($row.r -eq "1") { continue } # Header
    $cells = $row.c
    if ($cells.Count -lt 4) { continue }
    
    # PowerShell [xml] might map .v differently if it's a single value or node
    # Let's ensure we get the text value
    $curIndex = [int]($cells | Where-Object { $_.r -like "A*" }).v
    $catIndex = [int]($cells | Where-Object { $_.r -like "B*" }).v
    $selIndex = [int]($cells | Where-Object { $_.r -like "C*" }).v
    $subIndex = [int]($cells | Where-Object { $_.r -like "D*" }).v
    
    $cur = $strings[$curIndex]
    $cat = $strings[$catIndex]
    $sel = $strings[$selIndex]
    $sub = $strings[$subIndex]
    
    if ($cur -eq "교육과정") { continue } # Header

    if (-not $hierarchy.ContainsKey($cur)) { $hierarchy[$cur] = @{} }
    if (-not $hierarchy[$cur].ContainsKey($cat)) { $hierarchy[$cur][$cat] = @{} }
    if (-not $hierarchy[$cur][$cat].ContainsKey($sel)) { $hierarchy[$cur][$cat][$sel] = @() }
    
    # Handle cases where $sub might be an object instead of string if it has different XML children
    if ($sub -is [System.Xml.XmlElement]) { $sub = $sub.InnerText }
    if ($sel -is [System.Xml.XmlElement]) { $sel = $sel.InnerText }
    if ($cat -is [System.Xml.XmlElement]) { $cat = $cat.InnerText }
    if ($cur -is [System.Xml.XmlElement]) { $cur = $cur.InnerText }

    if ($hierarchy[$cur][$cat][$sel] -notcontains $sub) {
        $hierarchy[$cur][$cat][$sel] += $sub
    }
}

$hierarchy | ConvertTo-Json -Depth 10
