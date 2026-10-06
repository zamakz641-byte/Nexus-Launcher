param([Parameter(Mandatory=$true)][string]$OutputRoot)
$ErrorActionPreference='Stop'
$PSNativeCommandUseErrorActionPreference=$true
$source=[IO.Path]::GetFullPath($PSScriptRoot)
$output=[IO.Path]::GetFullPath($OutputRoot)
$payload=Join-Path $output 'payload'
New-Item -ItemType Directory -Path $payload -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $source 'target/release/NexusSaves.exe') -Destination $payload
foreach($name in @('LICENSE','LUDUSAVI_LICENSE','README.md')) { Copy-Item -LiteralPath (Join-Path $source $name) -Destination $payload }
Copy-Item -LiteralPath (Join-Path $source 'target/DEPENDENCY_LICENSES.html') -Destination $payload
$files=@(Get-ChildItem -LiteralPath $payload -File | ForEach-Object { @{path=$_.Name;size=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()} })
$zipName='nexus-saves-0.1.0-win-x64.zip'
$zip=Join-Path $output $zipName
Compress-Archive -Path (Join-Path $payload '*') -DestinationPath $zip -CompressionLevel Optimal
$sourceStage=Join-Path $output 'source'
New-Item -ItemType Directory -Path $sourceStage -Force | Out-Null
Get-ChildItem -LiteralPath $source | Where-Object Name -ne 'target' | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $sourceStage -Recurse }
$sourceName='nexus-saves-0.1.0-source.zip'
Compress-Archive -Path (Join-Path $sourceStage '*') -DestinationPath (Join-Path $output $sourceName) -CompressionLevel Optimal
$manifest=@{schema=1;id='nexus-saves';version='0.1.0';protocol=1;entry='NexusSaves.exe';license='MIT';asset=$zipName;sha256=(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant();downloadBytes=(Get-Item -LiteralPath $zip).Length;installedBytes=($files | Measure-Object -Property size -Sum).Sum;files=$files;sourceAsset=$sourceName;permissions=@('game-save-files','game-save-registry','approved-backup-folder');capabilities=@('scan','backup','list','restore-preview','protect','restore')}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $output 'nexus-saves.json') -Encoding utf8NoBOM
Get-ChildItem -LiteralPath $output -File | Select-Object Name,Length | ConvertTo-Json -Compress | Write-Output
