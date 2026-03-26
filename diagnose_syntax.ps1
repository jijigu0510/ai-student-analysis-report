$path = "app.js"
$lines = Get-Content $path -Encoding UTF8
$newContent = New-Object System.Collections.Generic.List[string]

# Comment out lines 385 to 1655
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -ge 384 -and $i -le 1654) {
        $newContent.Add("// " + $lines[$i])
    } else {
        $newContent.Add($lines[$i])
    }
}

Set-Content -Path $path -Value $newContent -Encoding UTF8
Write-Output "University criteria commented out for diagnosis."
