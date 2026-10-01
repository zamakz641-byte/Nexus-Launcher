$repository = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$launcher = Join-Path $repository 'LANCER_NEXUS.cmd'
if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) { throw "Launcher not found: $launcher" }
$icon = Join-Path (Split-Path -Parent $PSScriptRoot) 'public\assets\brand\nexus-mark.ico'
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Nexus Launcher (Developpement).lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcher
$shortcut.WorkingDirectory = $repository
$shortcut.IconLocation = "$icon,0"
$shortcut.Description = "Lancer la version actuelle de Nexus Launcher"
$shortcut.Save()
Write-Output $shortcutPath
