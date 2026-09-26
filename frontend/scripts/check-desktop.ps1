$processes = Get-Process | Where-Object { $_.ProcessName -like 'Nexus*' }
$processes | Select-Object Id,ProcessName,MainWindowTitle,Responding | Format-Table -AutoSize
Write-Output '---LOCALHOST---'
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalAddress -eq '127.0.0.1' } |
  Select-Object LocalAddress,LocalPort,OwningProcess |
  Sort-Object LocalPort |
  Format-Table -AutoSize
