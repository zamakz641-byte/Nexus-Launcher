$exe = Join-Path (Split-Path -Parent $PSScriptRoot) 'release\win-unpacked\Nexus Launcher.exe'
if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { throw "Packaged app not found: $exe" }
$work = Split-Path $exe
Start-Process -FilePath $exe -WorkingDirectory $work
Start-Sleep -Seconds 5
Get-Process | Where-Object { $_.ProcessName -like 'Nexus*' } |
  Select-Object Id,ProcessName,MainWindowTitle,Responding |
  Format-Table -AutoSize
