$ErrorActionPreference = "Stop"
$dest = "D:\manhwa studio\Nexus\frontend\public\assets\sfx"
$items = @(
  @{n="ui-move.mp3";u="https://dnznrvs05pmza.cloudfront.net/audio_sfx/504f461c-fc52-41a8-9e1d-ffce6a4bd383/Nexus_UI_Move.mp3?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZGJkZTQ1NTg3OTYzOWQ3NCIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDMwOTg0OH0.hYBKzQGoQsU0hOYfZ6JBRhCAM_1qKeLsncMp-Tzirgo"},
  @{n="ui-confirm.mp3";u="https://dnznrvs05pmza.cloudfront.net/audio_sfx/9b92ec49-b62c-4488-bc5a-02c5564f88f9/Nexus_UI_Confirm.mp3?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMDc5YjRkNzU2NDRiOWZmOCIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDMwMDAyMX0.T2NyZ5JVGSzQf0docJaysTuYZfB4YwOc9WY0mWJbGWA"},
  @{n="ui-back.mp3";u="https://dnznrvs05pmza.cloudfront.net/audio_sfx/b24c6726-6315-418e-ade8-a87eeb3b8c08/Nexus_UI_Back.mp3?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiNmQ3NDE2ZmE3NjNjMjZlYiIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDM1OTgwMn0.NIkGowX8EjGTn2Djh7FTf7gjFxpF0LXEwRm7zYymCds"},
  @{n="ui-tab.mp3";u="https://dnznrvs05pmza.cloudfront.net/audio_sfx/2cde5383-6fec-4cb3-8168-06e1e9d4dc77/Nexus_Tab_Switch.mp3?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOTRjZTA5NWM3YzFhOWU4ZiIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDI5NzE4MH0.eamTa650ltjT8S64Cov3CI4zvZAHbnECjMGuxZ-wch0"},
  @{n="game-launch.mp3";u="https://dnznrvs05pmza.cloudfront.net/audio_sfx/a27799f9-ea39-47a9-aa84-cee2a06ab006/Nexus_Game_Launch.mp3?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZTNjMzg2NjI1NjY4ZWMxMCIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDMyMzU1NH0._UIzY6Nv-L509oXXZNNqQDs_bg9WgPyl-4Tap75_nAg"},
  @{n="startup.mp3";u="https://dnznrvs05pmza.cloudfront.net/audio_sfx/e19bb03b-22f6-4751-87a6-9c2b3ba7ecd0/Nexus_Startup.mp3?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMmVjZDA0NDJlMDgyNTIyOSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDM2NTUwNn0.pALRbqhjlhqu16fymBnKyJeeRzZWVdV4VBlX0NQmg40"}
)
foreach ($i in $items) { Invoke-WebRequest -Uri $i.u -OutFile (Join-Path $dest $i.n) -UseBasicParsing }
Get-ChildItem $dest | Select-Object Name,Length | Format-Table -AutoSize
