# ═══════════════════════════════════════════════════════════════
#   ██████╗ ██████╗██████╗ 
#  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
#  ██║     ██║     ██████╔╝   Powered by SuparvaCode
#  ██║     ██║     ██╔═══╝ 
#  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
#   ╚═════╝ ╚═════╝╚═╝ 
# ═══════════════════════════════════════════════════════════════

# Keep window open no matter what
$ErrorActionPreference = "Continue"

function Pause-Exit($code) {
    Write-Host ""
    Write-Host "Press any key to close..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit $code
}

Write-Host ""
Write-Host "  ██████╗ ██████╗██████╗ " -ForegroundColor Magenta
Write-Host " ██╔════╝██╔════╝██╔══██╗  Claude Code Proxy" -ForegroundColor Magenta
Write-Host " ██║     ██║     ██████╔╝  by SuparvaCode" -ForegroundColor Magenta
Write-Host " ╚██████╗╚██████╗██║" -ForegroundColor Magenta
Write-Host "  ╚═════╝ ╚═════╝╚═╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "⚡ CCP Installer" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

# ── Install location ───────────────────────────────────────────────────────────
$InstallDir = "$env:USERPROFILE\.ccp-proxy"
Write-Host "📁 Install location: $InstallDir" -ForegroundColor Cyan

# ── Step 1: Check Node.js ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "[ 1/5 ] Checking Node.js..." -ForegroundColor White

$nodeOk = $false
try {
    $nodePath = (Get-Command node -ErrorAction SilentlyContinue)
    if ($nodePath) {
        $nodeVersion = & node -v 2>&1
        Write-Host "        ✔ Node.js $nodeVersion found" -ForegroundColor Green
        $nodeOk = $true
    }
} catch {}

if (-not $nodeOk) {
    Write-Host "        ✘ Node.js not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please install Node.js v18+ from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "  After installing, restart this terminal and run the command again." -ForegroundColor Yellow
    Pause-Exit 1
}

# ── Step 2: Check / install Git ────────────────────────────────────────────────
Write-Host ""
Write-Host "[ 2/5 ] Checking Git..." -ForegroundColor White

$gitOk = $false
try {
    $gitPath = (Get-Command git -ErrorAction SilentlyContinue)
    if ($gitPath) {
        $gitVersion = & git --version 2>&1
        Write-Host "        ✔ $gitVersion" -ForegroundColor Green
        $gitOk = $true
    }
} catch {}

if (-not $gitOk) {
    Write-Host "        Git not found — attempting install via winget..." -ForegroundColor Yellow
    try {
        & winget install --id Git.Git -e --silent 2>&1 | Out-Null
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        $gitVersion = & git --version 2>&1
        Write-Host "        ✔ Git installed: $gitVersion" -ForegroundColor Green
        $gitOk = $true
    } catch {
        Write-Host "        ✘ Could not install Git automatically." -ForegroundColor Red
        Write-Host "          Install Git from https://git-scm.com/ and re-run." -ForegroundColor Yellow
        Pause-Exit 1
    }
}

# ── Step 3: Clone or update repo ───────────────────────────────────────────────
Write-Host ""
Write-Host "[ 3/5 ] Fetching CCP source..." -ForegroundColor White

$repoUrl = "https://github.com/SuparvaCode/ccp-proxy.git"

if (Test-Path (Join-Path $InstallDir ".git")) {
    Write-Host "        Found existing install — pulling latest updates..." -ForegroundColor Cyan
    Push-Location $InstallDir
    & git pull --ff-only 2>&1 | ForEach-Object { Write-Host "        $_" -ForegroundColor DarkGray }
    Pop-Location
    Write-Host "        ✔ Updated to latest version" -ForegroundColor Green
} else {
    if (Test-Path $InstallDir) {
        Remove-Item $InstallDir -Recurse -Force
    }
    Write-Host "        Cloning from GitHub..." -ForegroundColor Cyan
    & git clone $repoUrl $InstallDir 2>&1 | ForEach-Object { Write-Host "        $_" -ForegroundColor DarkGray }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "        ✘ Git clone failed. Check your internet connection." -ForegroundColor Red
        Pause-Exit 1
    }
    Write-Host "        ✔ Downloaded to $InstallDir" -ForegroundColor Green
}

# ── Step 4: Install dependencies + build ──────────────────────────────────────
Write-Host ""
Write-Host "[ 4/5 ] Installing dependencies & building..." -ForegroundColor White

Push-Location $InstallDir

# Install server deps
Write-Host "        Installing server dependencies..." -ForegroundColor Cyan
Push-Location (Join-Path $InstallDir "server")
& npm install --silent 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "        ✘ Server npm install failed." -ForegroundColor Red
    Pop-Location; Pop-Location; Pause-Exit 1
}
Pop-Location
Write-Host "        ✔ Server dependencies installed" -ForegroundColor Green

# Install admin deps
Write-Host "        Installing admin dependencies..." -ForegroundColor Cyan
Push-Location (Join-Path $InstallDir "admin")
& npm install --silent 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "        ✘ Admin npm install failed." -ForegroundColor Red
    Pop-Location; Pop-Location; Pause-Exit 1
}
Pop-Location
Write-Host "        ✔ Admin dependencies installed" -ForegroundColor Green

# Create .env if missing
$envFile = Join-Path $InstallDir "server\.env"
$envExample = Join-Path $InstallDir "server\.env.example"
if (-not (Test-Path $envFile)) {
    Write-Host "        Generating secure .env..." -ForegroundColor Cyan
    Copy-Item $envExample -Destination $envFile
    $bytes = New-Object Byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $key = [System.Convert]::ToBase64String($bytes) -replace '[^A-Za-z0-9]',''
    $key = $key.Substring(0, [Math]::Min(32, $key.Length))
    $content = Get-Content $envFile -Raw
    $content = $content -replace 'CCP_ENCRYPTION_SECRET=change_this_to_a_long_random_secret_value_32chars', "CCP_ENCRYPTION_SECRET=$key"
    Set-Content -Path $envFile -Value $content -NoNewline
    Write-Host "        ✔ Created server/.env with secure encryption key" -ForegroundColor Green
} else {
    Write-Host "        ✔ Existing server/.env kept" -ForegroundColor Green
}

# Build admin UI
Write-Host "        Building admin UI..." -ForegroundColor Cyan
Push-Location (Join-Path $InstallDir "admin")
& npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "        ✘ Admin build failed." -ForegroundColor Red
    Pop-Location; Pop-Location; Pause-Exit 1
}
Pop-Location
Write-Host "        ✔ Admin UI built" -ForegroundColor Green

Pop-Location

# ── Step 5: Register ccp-start globally ───────────────────────────────────────
Write-Host ""
Write-Host "[ 5/5 ] Registering 'ccp-start' command..." -ForegroundColor White

# Write a robust ccp-start.cmd into npm global prefix so it always works
$npmGlobalPrefix = & npm prefix -g 2>&1
$ccpStartCmd = Join-Path $npmGlobalPrefix "ccp-start.cmd"
$serverEntry = Join-Path $InstallDir "server\src\index.js"

$cmdContent = @"
@echo off
setlocal
set CCP_DIR=$InstallDir
:loop
node "%CCP_DIR%\server\src\index.js"
if %errorlevel% equ 42 (
    echo.
    echo Restarting CCP server...
    timeout /t 1 /nobreak >nul
    goto loop
)
endlocal
"@

try {
    Set-Content -Path $ccpStartCmd -Value $cmdContent -Encoding ASCII
    Write-Host "        ✔ 'ccp-start' registered at: $ccpStartCmd" -ForegroundColor Green
} catch {
    Write-Host "        ⚠  Could not write to $ccpStartCmd" -ForegroundColor Yellow
    Write-Host "           Try running PowerShell as Administrator." -ForegroundColor Yellow
}

# Also try npm link as a fallback
Push-Location $InstallDir
& npm link 2>&1 | Out-Null
Pop-Location

# Also add a fallback ccp.cmd in the install dir
$localCmd = Join-Path $InstallDir "ccp.cmd"
Set-Content -Path $localCmd -Value $cmdContent -Encoding ASCII

# ── Done ───────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host " 🎉 CCP installed successfully!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""
Write-Host " ▶  Start server:" -ForegroundColor White
Write-Host "      ccp-start" -ForegroundColor Cyan
Write-Host "    or:  node `"$InstallDir\server\src\index.js`"" -ForegroundColor DarkGray
Write-Host ""
Write-Host " 🌐 Admin panel:  http://127.0.0.1:8082/admin" -ForegroundColor White
Write-Host ""
Write-Host " ⚙  Set in Claude Code:" -ForegroundColor White
Write-Host "      `$env:ANTHROPIC_BASE_URL = 'http://127.0.0.1:8082'" -ForegroundColor DarkGray
Write-Host "      `$env:ANTHROPIC_AUTH_TOKEN = 'super'" -ForegroundColor DarkGray
Write-Host ""
Write-Host " 📁 Installed to: $InstallDir" -ForegroundColor DarkGray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
