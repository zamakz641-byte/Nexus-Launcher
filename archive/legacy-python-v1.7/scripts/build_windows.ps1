$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
python .\scripts\fetch_ui_assets.py --strict
if ($LASTEXITCODE -ne 0) { throw "Echec preparation icones PNG" }
python .\scripts\fetch_sfx.py
if ($LASTEXITCODE -ne 0) { throw "Echec préparation du pack SFX intégré complet" }
Write-Host "[Nexus] Installation frontend..." -ForegroundColor Cyan
npm install --no-audit --no-fund
Write-Host "[Nexus] Vérification TypeScript..." -ForegroundColor Cyan
npm run lint
Write-Host "[Nexus] Build interface..." -ForegroundColor Cyan
npm run build
Write-Host "[Nexus] Installation Python..." -ForegroundColor Cyan
python -m pip install --upgrade pip
python -m pip install -r requirements-build.txt
Write-Host "[Nexus] Tests backend..." -ForegroundColor Cyan
python -m pytest -q
Write-Host "[Nexus] Création de l'exécutable..." -ForegroundColor Cyan
python -m PyInstaller --noconfirm --clean --distpath build/release --workpath build/pyinstaller NexusLauncher.spec
Write-Host "[Nexus] EXE: build/release/NexusLauncher.exe" -ForegroundColor Green
