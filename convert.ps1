$enc = [System.Text.Encoding]::GetEncoding(949)
$text = [System.IO.File]::ReadAllText("app.js", $enc)
[System.IO.File]::WriteAllText("app.js", $text, [System.Text.Encoding]::UTF8)
