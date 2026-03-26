
$file = Get-ChildItem -Filter "*2026*.xlsx" | Select-Object -First 1
if (-not $file) { Write-Host "File not found"; exit 1 }
$filePath = $file.FullName
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
try {
    $wb = $excel.Workbooks.Open($filePath)
    $ws = $wb.Sheets.Item(1)
    $range = $ws.UsedRange
    $data = $range.Value2
    $wb.Close($false)
    
    $rowCount = $data.GetLength(0)
    $list = @()
    for ($j = 2; $j -le $rowCount; $j++) {
        $name = $data[$j, 4]
        $grade = $data[$j, 18]
        if ($name) {
            $obj = New-Object PSObject -Property @{
                Name = $name
                Grade = $grade
            }
            $list += $obj
        }
    }
    $list | ConvertTo-Json | Out-File -FilePath "grades.json" -Encoding utf8
    Write-Host "Success: Extracted $($list.Count) records to grades.json"
} catch {
    Write-Error $_.Exception.Message
} finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
