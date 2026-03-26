$path = "app.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

$replacements = Get-Content "replacements.txt" -Encoding UTF8
foreach ($line in $replacements) {
    if ($line -match '\|') {
        $parts = $line.Split('|')
        $old = $parts[0]
        $new = $parts[1]
        if ($old) {
            $content = $content.Replace($old, $new)
        }
    }
}

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Output "Fix complete."
