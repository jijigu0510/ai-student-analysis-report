
$file = Get-ChildItem -Filter "*2026*.xlsx" | Select-Object -First 1
if (-not $file) {
    Write-Host "File not found using wildcard *2026*.xlsx"
    exit 1
}
$filePath = $file.FullName
Write-Host "Opening file: $filePath"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
try {
    $wb = $excel.Workbooks.Open($filePath)
    $ws = $wb.Sheets.Item(1)
    $range = $ws.UsedRange
    $data = $range.Value2
    $wb.Close($false)
    
    $rowCount = $data.GetLength(0)
    $colCount = $data.GetLength(1)
    
    $nameIdx = -1
    $gradeIdx = -1
    
    for ($i = 1; $i -le $colCount; $i++) {
        $header = $data[1, $i]
        if ($header -eq "성명") { $nameIdx = $i }
        if ($header -eq "일반등급") { $gradeIdx = $i }
    }
    
    if ($nameIdx -ne -1 -and $gradeIdx -ne -1) {
        for ($j = 2; $j -le $rowCount; $j++) {
            $name = $data[$j, $nameIdx]
            $grade = $data[$j, $gradeIdx]
            if ($name) {
                Write-Host "$name : $grade"
            }
        }
    } else {
        Write-Host "Headers '성명' or '일반등급' not found."
    }
} catch {
    Write-Error $_.Exception.Message
} finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
