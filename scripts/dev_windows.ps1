$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$LogDir = Join-Path $Root "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$LogFile = Join-Path $LogDir "startup.log"

try {
    Start-Transcript -Path $LogFile -Force | Out-Null
} catch {
    # Transcript is helpful, but Nexus must still be able to start if it cannot be created.
}

function Invoke-NexusStep {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][scriptblock]$Action
    )
    Write-Host ""
    Write-Host "[Nexus] $Name" -ForegroundColor Cyan
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "$Name a echoue (code $LASTEXITCODE)."
    }
}

try {
    Write-Host "===============================================" -ForegroundColor DarkCyan
    Write-Host " NEXUS LAUNCHER - diagnostic de demarrage" -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor DarkCyan
    Write-Host "Dossier : $Root"
    Write-Host "Log     : $LogFile"

    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        throw "Python n'est pas trouve dans le PATH. Installe Python 3.12+ et coche 'Add Python to PATH'."
    }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw "npm n'est pas trouve dans le PATH. Installe Node.js 22+ puis relance Nexus."
    }

    Write-Host "Python  : $(python --version 2>&1)"
    Write-Host "Node    : $(node --version 2>&1)"
    Write-Host "npm     : $(npm --version 2>&1)"

    $VenvPython = Join-Path $Root ".venv\Scripts\python.exe"
    if (-not (Test-Path $VenvPython)) {
        Invoke-NexusStep "Creation de l'environnement Python" { python -m venv .venv }
    }

    $RequirementsFile = Join-Path $Root "requirements.txt"
    $RequirementsStamp = Join-Path $Root ".venv\.nexus-requirements.sha256"
    $RequirementsHash = (Get-FileHash $RequirementsFile -Algorithm SHA256).Hash
    $InstalledHash = if (Test-Path $RequirementsStamp) { (Get-Content $RequirementsStamp -Raw).Trim() } else { "" }
    if ($RequirementsHash -ne $InstalledHash) {
        Invoke-NexusStep "Installation/verif des dependances Python" { & $VenvPython -m pip install -r requirements.txt --disable-pip-version-check }
        Set-Content -Path $RequirementsStamp -Value $RequirementsHash -NoNewline
    } else {
        Write-Host ""
        Write-Host "[Nexus] Dependances Python deja a jour, verification ignoree." -ForegroundColor DarkGray
    }

    # All essential PNGs are bundled with Nexus. This validation never needs the network.
    Write-Host ""
    Write-Host "[Nexus] Verification des icones PNG integrees" -ForegroundColor Cyan
    try {
        & $VenvPython .\scripts\fetch_ui_assets.py
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[Nexus] Quelques icones sont invalides, Nexus continue avec les fallbacks locaux." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[Nexus] Verification PNG ignoree; le launcher continue." -ForegroundColor Yellow
    }

    # Optional media assets must NEVER make the launcher fail.
    Write-Host ""
    Write-Host "[Nexus] Verification des SFX (non bloquante)" -ForegroundColor Cyan
    try {
        & $VenvPython .\scripts\fetch_sfx.py
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[Nexus] SFX indisponibles pour le moment, on continue." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[Nexus] SFX indisponibles pour le moment, on continue." -ForegroundColor Yellow
    }

    if (-not (Test-Path (Join-Path $Root "node_modules"))) {
        Invoke-NexusStep "Installation des dependances frontend" { npm install --no-audit --no-fund }
    } else {
        Write-Host ""
        Write-Host "[Nexus] node_modules deja present, npm install ignore." -ForegroundColor DarkGray
    }

    $DistIndex = Join-Path $Root "dist\index.html"
    $NeedsBuild = -not (Test-Path $DistIndex)
    if (-not $NeedsBuild) {
        $DistTime = (Get-Item $DistIndex).LastWriteTimeUtc
        $Inputs = @((Join-Path $Root "package.json"), (Join-Path $Root "vite.config.ts"), (Join-Path $Root "index.html"))
        $Inputs += Get-ChildItem (Join-Path $Root "src") -Recurse -File | Select-Object -ExpandProperty FullName
        $PublicDir = Join-Path $Root "public"
        if (Test-Path $PublicDir) {
            $Inputs += Get-ChildItem $PublicDir -Recurse -File | Select-Object -ExpandProperty FullName
        }
        foreach ($InputFile in $Inputs) {
            if ((Test-Path $InputFile) -and (Get-Item $InputFile).LastWriteTimeUtc -gt $DistTime) {
                $NeedsBuild = $true
                break
            }
        }
    }

    if ($NeedsBuild) {
        Invoke-NexusStep "Build de l'interface React" { npm run build }
    } else {
        Write-Host ""
        Write-Host "[Nexus] Interface deja compilee, build ignore." -ForegroundColor DarkGray
    }

    Invoke-NexusStep "Demarrage de Nexus" { & $VenvPython .\nexus_launcher.py }

    try { Stop-Transcript | Out-Null } catch {}
    exit 0
}
catch {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host " NEXUS N'A PAS PU DEMARRER" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Le terminal reste ouvert. Envoie-moi cette erreur ou le fichier :" -ForegroundColor White
    Write-Host $LogFile -ForegroundColor Cyan
    Write-Host ""
    try {
        Add-Content -Path $LogFile -Value "`r`n[NEXUS FATAL] $($_.Exception.ToString())"
        Stop-Transcript | Out-Null
    } catch {}
    Read-Host "Appuie sur ENTREE pour fermer"
    exit 1
}
