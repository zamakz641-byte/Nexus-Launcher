$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$Repo = "https://github.com/zamakz641-byte/Nexus-Launcher.git"
$Branch = "main"

function Run-Git {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
    & git @Args
    if ($LASTEXITCODE -ne 0) { throw "git $($Args -join ' ') a échoué (code $LASTEXITCODE)." }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git n'est pas installé ou n'est pas dans le PATH."
}

if (-not (Test-Path ".git")) {
    Run-Git init -b $Branch
}

# Do not probe a missing origin by asking Git for its URL: under
# Windows PowerShell 5.1 + $ErrorActionPreference=Stop, Git stderr can be
# promoted to NativeCommandError before we can inspect $LASTEXITCODE.
# `git remote` is safe even when there are no remotes.
$remotes = @(& git remote)
if ($LASTEXITCODE -ne 0) {
    throw "Impossible de lire les remotes Git (code $LASTEXITCODE)."
}

if ($remotes -notcontains "origin") {
    Write-Host "[Nexus] Aucun remote origin : ajout automatique." -ForegroundColor Cyan
    Run-Git remote add origin $Repo
} else {
    $origin = (& git config --get remote.origin.url)
    if ($LASTEXITCODE -ne 0 -or -not $origin) {
        Run-Git remote set-url origin $Repo
    } elseif ($origin.Trim() -ne $Repo) {
        Write-Host "[Nexus] origin actuel : $origin" -ForegroundColor Yellow
        Write-Host "[Nexus] origin corrigé : $Repo" -ForegroundColor Yellow
        Run-Git remote set-url origin $Repo
    }
}

# A fresh Windows machine often has Git installed but no author configured.
# Keep this identity local to this repository only.
$userName = (& git config --get user.name)
if ($LASTEXITCODE -ne 0 -or -not $userName) {
    Run-Git config user.name "zamakz641-byte"
}
$userEmail = (& git config --get user.email)
if ($LASTEXITCODE -ne 0 -or -not $userEmail) {
    Run-Git config user.email "274003170+zamakz641-byte@users.noreply.github.com"
}

Run-Git fetch origin $Branch
Run-Git checkout -B $Branch

# Stage first so the local Nexus tree is the source of truth.
Run-Git add -A
& git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    Run-Git commit -m "Nexus Launcher v1.6.4 boot-stability full source"
}

# fetch above guarantees origin/main exists when the remote repository is healthy.
$remoteMain = "origin/$Branch"
& git show-ref --verify --quiet "refs/remotes/origin/$Branch"
if ($LASTEXITCODE -eq 0) {
    & git merge-base HEAD "origin/$Branch" *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[Nexus] Historique local et GitHub sans ancêtre commun." -ForegroundColor Yellow
        Write-Host "[Nexus] Fusion du bootstrap distant en gardant les fichiers locaux Nexus." -ForegroundColor Yellow
        Run-Git merge "origin/$Branch" --allow-unrelated-histories -s ours -m "Merge GitHub bootstrap history"
    } else {
        $behind = [int](& git rev-list --count "HEAD..origin/$Branch")
        if ($behind -gt 0) {
            Write-Host "[Nexus] GitHub contient $behind commit(s) absent(s) localement : rebase." -ForegroundColor Cyan
            Run-Git rebase "origin/$Branch"
        }
    }
}

Run-Git push -u origin $Branch
Write-Host "" 
Write-Host "[Nexus] Push terminé : $Repo" -ForegroundColor Green
