$lines = Get-Content "app.js" -Encoding UTF8
for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    $quotes = $line.Split('"').Length - 1
    if ($quotes % 2 -ne 0) {
        Write-Output "Line $($i+1): $line"
    }
}
