
$file = Get-ChildItem -Filter "*2026*.xlsx" | Select-Object -First 1
if (-not $file) {
    Write-Host "File not found"
    exit 1
}
$filePath = $file.FullName
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
try {
    $wb = $excel.Workbooks.Open($filePath)
    $ws = $wb.Sheets.Item(1)
    $range = $ws.UsedRange
    $data = $range.Value2
    $wb.Close($false)
    
    $colCount = $data.GetLength(1)
    $headers = ""
    for ($i = 1; $i -le $colCount; $i++) {
        $headers += "[$i]: " + $data[1, $i] + " | "
    }
    Write-Host "Headers: $headers"
} catch {
    Write-Error $_.Exception.Message
} finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
