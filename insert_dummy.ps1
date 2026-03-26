$path = "app.js"
$lines = Get-Content $path -Encoding UTF8
$newContent = New-Object System.Collections.Generic.List[string]

for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -eq 384) { # Line 385
        $newContent.Add("  const universityEvalCriteria = {};")
    }
    $newContent.Add($lines[$i])
}

Set-Content -Path $path -Value $newContent -Encoding UTF8
Write-Output "Dummy object inserted."
