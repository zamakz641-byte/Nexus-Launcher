$exe = Join-Path (Split-Path -Parent $PSScriptRoot) 'release\win-unpacked\Nexus Launcher.exe'
if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { throw "Packaged app not found: $exe" }
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Nexus Launcher.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exe
$shortcut.WorkingDirectory = Split-Path $exe
$shortcut.IconLocation = "$exe,0"
$shortcut.Description = "Nexus Launcher"
$shortcut.Save()
Write-Output $shortcutPath
