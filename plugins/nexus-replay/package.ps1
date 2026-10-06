param([Parameter(Mandatory=$true)][string]$QtRoot,[Parameter(Mandatory=$true)][string]$CompilerRoot,[Parameter(Mandatory=$true)][string]$BuildRoot,[Parameter(Mandatory=$true)][string]$OutputRoot)
$ErrorActionPreference='Stop'
$PSNativeCommandUseErrorActionPreference=$true
$pluginSource=[IO.Path]::GetFullPath($PSScriptRoot)
$pluginOutput=[IO.Path]::GetFullPath($OutputRoot)
$payload=Join-Path $pluginOutput 'payload'
New-Item -ItemType Directory -Path $payload -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $BuildRoot 'NexusReplay.exe') -Destination $payload
$queue=[Collections.Generic.Queue[string]]::new()
$queue.Enqueue((Join-Path $payload 'NexusReplay.exe'))
$copied=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
while($queue.Count){
  $binary=$queue.Dequeue()
  $imports=& (Join-Path $CompilerRoot 'objdump.exe') -p $binary
  foreach($line in $imports){
    if($line -notmatch 'DLL Name:\s*(\S+)'){continue}
    $dll=$Matches[1]
    if(-not $copied.Add($dll)){continue}
    $candidate=Join-Path (Join-Path $QtRoot 'bin') $dll
    if(-not(Test-Path -LiteralPath $candidate)){$candidate=Join-Path $CompilerRoot $dll}
    if(Test-Path -LiteralPath $candidate){Copy-Item -LiteralPath $candidate -Destination $payload;$queue.Enqueue((Join-Path $payload $dll))}
  }
}
Copy-Item -LiteralPath (Join-Path $pluginSource 'LICENSE') -Destination $payload
Copy-Item -LiteralPath (Join-Path $pluginSource 'THIRD_PARTY_NOTICES.md') -Destination $payload
Copy-Item -LiteralPath (Join-Path $pluginSource 'README.md') -Destination $payload
# Keep the reviewed license texts with replaceable runtime DLLs. Minimal AQT
# archives do not include Qt's documentation/license directory consistently.
$runtimeLicenses=Join-Path $pluginSource 'licenses'
if(-not(Test-Path -LiteralPath (Join-Path $runtimeLicenses 'LGPL-3.0-only.txt'))){throw 'Bundled Qt license text missing'}
Copy-Item -LiteralPath $runtimeLicenses -Destination (Join-Path $payload 'licenses') -Recurse
$originalPath=$env:PATH
try {$env:PATH=Join-Path $env:SystemRoot 'System32'; & (Join-Path $payload 'NexusReplay.exe') --self-test; if($LASTEXITCODE -ne 0){throw 'Standalone package self-test failed'}}finally{$env:PATH=$originalPath}
if($LASTEXITCODE -ne 0){throw 'Packaged engine self-test failed'}
$files=@(Get-ChildItem -LiteralPath $payload -Recurse -File | ForEach-Object {
  @{path=[IO.Path]::GetRelativePath($payload,$_.FullName).Replace('\','/');size=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
})
$zipName='nexus-replay-0.1.0-win-x64.zip'
$zipPath=Join-Path $pluginOutput $zipName
Compress-Archive -Path (Join-Path $payload '*') -DestinationPath $zipPath -CompressionLevel Optimal
# Source archive includes exact copied code, modifications, CMake and packaging script.
$sourceName='nexus-replay-0.1.0-source.zip'
Compress-Archive -Path (Join-Path $pluginSource '*') -DestinationPath (Join-Path $pluginOutput $sourceName) -CompressionLevel Optimal
$manifest=@{schema=1;id='nexus-replay';version='0.1.0';protocol=1;entry='NexusReplay.exe';license='GPL-3.0-only';asset=$zipName;sha256=(Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant();downloadBytes=(Get-Item -LiteralPath $zipPath).Length;installedBytes=($files | Measure-Object -Property size -Sum).Sum;files=$files;sourceAsset=$sourceName;permissions=@('game-window-capture','game-audio','owned-cache');capabilities=@('start-buffer','stop-buffer','save-replay','screenshot','status')}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $pluginOutput 'nexus-replay.json') -Encoding utf8NoBOM
Get-ChildItem -LiteralPath $pluginOutput -File | Select-Object Name,Length | ConvertTo-Json -Compress | Write-Output
