$exe = "D:\manhwa studio\Nexus\frontend\release\win-unpacked\Nexus Launcher.exe"
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
