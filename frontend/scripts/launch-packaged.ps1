$exe = "D:\manhwa studio\Nexus\frontend\release\win-unpacked\Nexus Launcher.exe"
$work = Split-Path $exe
Start-Process -FilePath $exe -WorkingDirectory $work
Start-Sleep -Seconds 5
Get-Process | Where-Object { $_.ProcessName -like 'Nexus*' } |
  Select-Object Id,ProcessName,MainWindowTitle,Responding |
  Format-Table -AutoSize
