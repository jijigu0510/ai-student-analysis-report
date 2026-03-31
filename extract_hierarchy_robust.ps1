$sharedStringsPath = "c:\tmp\curriculum_xml\sharedStrings.xml"
$sheet1Path = "c:\tmp\curriculum_xml\sheet1.xml"

# Use [System.Xml.XmlDocument] for better control
$ss = New-Object System.Xml.XmlDocument
$ss.Load($sharedStringsPath)

$strings = @()
$sis = $ss.SelectNodes("//*[local-name()='si']")
foreach ($si in $sis) {
    $text = ""
    # Try <t> nodes
    $ts = $si.SelectNodes(".//*[local-name()='t']")
    foreach ($t in $ts) {
        $text += $t.InnerText
    }
    $strings += $text
}

$sheet = New-Object System.Xml.XmlDocument
$sheet.Load($sheet1Path)
$rows = $sheet.SelectNodes("//*[local-name()='row']")

$hierarchy = @{}

foreach ($row in $rows) {
    $rNum = $row.GetAttribute("r")
    if ($rNum -eq "1") { continue }
    
    $cells = $row.SelectNodes(".//*[local-name()='c']")
    if ($cells.Count -lt 4) { continue }
    
    $curIndex = -1
    $catIndex = -1
    $selIndex = -1
    $subIndex = -1
    
    foreach ($cell in $cells) {
        $ref = $cell.GetAttribute("r")
        $valNode = $cell.SelectSingleNode(".//*[local-name()='v']")
        if (-not $valNode) { continue }
        $val = [int]$valNode.InnerText
        
        if ($ref -like "A*") { $curIndex = $val }
        elseif ($ref -like "B*") { $catIndex = $val }
        elseif ($ref -like "C*") { $selIndex = $val }
        elseif ($ref -like "D*") { $subIndex = $val }
    }

    if ($curIndex -eq -1 -or $catIndex -eq -1 -or $selIndex -eq -1 -or $subIndex -eq -1) { continue }
    
    $cur = $strings[$curIndex]
    $cat = $strings[$catIndex]
    $sel = $strings[$selIndex]
    $sub = $strings[$subIndex]
    
    if ($cur -eq "교육과정") { continue }

    if (-not $hierarchy.ContainsKey($cur)) { $hierarchy[$cur] = @{} }
    if (-not $hierarchy[$cur].ContainsKey($cat)) { $hierarchy[$cur][$cat] = @{} }
    if (-not $hierarchy[$cur][$cat].ContainsKey($sel)) { $hierarchy[$cur][$cat][$sel] = @() }
    
    if ($hierarchy[$cur][$cat][$sel] -notcontains $sub) {
        $hierarchy[$cur][$cat][$sel] += $sub
    }
}

$hierarchy | ConvertTo-Json -Depth 10 | Out-File -FilePath "c:\tmp\curriculum_xml\hierarchy.json" -Encoding utf8
