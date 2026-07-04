# ===============================================================
#   CCP (Claude Code Proxy) - Installer
#   Copyright (c) 2026 Suparva (SuparvaCode)
# ===============================================================

# Keep window open always
$ErrorActionPreference = "Continue"

# -- Self-relaunch when piped via irm|iex --------------------------------------
# When run as  irm ... | iex  the script has no file path ($PSCommandPath is empty)
# and the PowerShell window closes the instant the script ends.
# Fix: download to a temp file and open a proper persistent window.

if (-not $PSCommandPath) {
    $tempScript = Join-Path $env:TEMP "ccp_install_$([System.IO.Path]::GetRandomFileName()).ps1"
    try {
        Write-Host "Downloading installer..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri "https://raw.githubusercontent.com/SuparvaCode/ccp-proxy/main/install.ps1" `
            -UseBasicParsing -OutFile $tempScript
        Start-Process powershell.exe -ArgumentList @(
            "-NoExit",
            "-ExecutionPolicy", "Bypass",
            "-File", $tempScript
        )
    } catch {
        Write-Host "ERROR: Could not download installer: $_" -ForegroundColor Red
        Write-Host "Press Enter to close..." -ForegroundColor DarkGray
        Read-Host
    }
    exit 0
}

# -- Main installer (runs from file, window stays open via -NoExit) -------------
$ErrorActionPreference = "Continue"

Clear-Host

Write-Host ""
Write-Host "  CCP - Claude Code Proxy" -ForegroundColor Magenta
Write-Host "  by SuparvaCode" -ForegroundColor Magenta
Write-Host ""
Write-Host "Starting CCP Installer..." -ForegroundColor Cyan
Write-Host "----------------------------------------------------" -ForegroundColor DarkGray

$InstallDir = "$env:USERPROFILE\.ccp-proxy"
Write-Host "Install location: $InstallDir" -ForegroundColor Cyan
Write-Host ""

# -- Helpers --------------------------------------------------------------------
function Step($n, $total, $msg) {
    Write-Host "[ $n/$total ] $msg" -ForegroundColor White
}
function OK($msg)   { Write-Host "          [OK] $msg" -ForegroundColor Green }
function FAIL($msg) { Write-Host "          [ERROR] $msg" -ForegroundColor Red }
function INFO($msg) { Write-Host "               $msg" -ForegroundColor DarkGray }

# -- 1. Node.js ----------------------------------------------------------------
Step 1 5 "Checking Node.js..."
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $ver = & node -v 2>&1
    OK "Node.js $ver"
} else {
    FAIL "Node.js not found."
    Write-Host ""
    Write-Host "  Please install Node.js v18+ from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "  On Windows you can also run:  winget install OpenJS.NodeJS" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  After installing, open a new terminal and run the installer again." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}
Write-Host ""

# -- 2. Git --------------------------------------------------------------------
Step 2 5 "Checking Git..."
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    INFO "Git not found - trying winget..."
    & winget install --id Git.Git -e --silent 2>&1 | Out-Null
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
}
if ($gitCmd) {
    OK "$(& git --version 2>&1)"
} else {
    FAIL "Git could not be installed automatically."
    Write-Host "  Install Git from https://git-scm.com/ then re-run." -ForegroundColor Yellow
    Read-Host "Press Enter to close"
    exit 1
}
Write-Host ""

# -- 3. Clone / update ---------------------------------------------------------
Step 3 5 "Fetching CCP source..."
$repoUrl = "https://github.com/SuparvaCode/ccp-proxy.git"

if (Test-Path (Join-Path $InstallDir ".git")) {
    INFO "Existing install found - pulling latest..."
    & git -C $InstallDir pull --ff-only 2>&1 | Out-Null
    OK "Updated to latest version"
} else {
    if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
    INFO "Cloning from GitHub..."
    & git clone $repoUrl $InstallDir 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        FAIL "Git clone failed. Check your internet connection."
        Read-Host "Press Enter to close"
        exit 1
    }
    OK "Downloaded to $InstallDir"
}
Write-Host ""

# -- 4. Install deps + build ---------------------------------------------------
Step 4 5 "Installing dependencies and building..."

INFO "Installing server dependencies..."
$r = & npm --prefix "$InstallDir\server" install 2>&1
if ($LASTEXITCODE -ne 0) {
    FAIL "Server npm install failed:"
    $r | ForEach-Object { INFO $_ }
    Read-Host "Press Enter to close"
    exit 1
}
OK "Server dependencies ready"

INFO "Installing admin dependencies..."
$r = & npm --prefix "$InstallDir\admin" install 2>&1
if ($LASTEXITCODE -ne 0) {
    FAIL "Admin npm install failed"
    $r | ForEach-Object { INFO $_ }
    Read-Host "Press Enter to close"
    exit 1
}
OK "Admin dependencies ready"

$envFile    = Join-Path $InstallDir "server\.env"
$envExample = Join-Path $InstallDir "server\.env.example"
if (-not (Test-Path $envFile)) {
    INFO "Generating server/.env with secure key..."
    Copy-Item $envExample -Destination $envFile
    $bytes = New-Object Byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $key = ([System.Convert]::ToBase64String($bytes) -replace '[^A-Za-z0-9]', '').Substring(0, 32)
    $content = Get-Content $envFile -Raw
    $content  = $content -replace 'CCP_ENCRYPTION_SECRET=change_this_to_a_long_random_secret_value_32chars', "CCP_ENCRYPTION_SECRET=$key"
    Set-Content -Path $envFile -Value $content -NoNewline
    OK "Created server/.env"
} else {
    OK "Existing server/.env kept"
}

INFO "Building admin UI (this takes ~30s)..."
$r = & npm --prefix "$InstallDir\admin" run build 2>&1
if ($LASTEXITCODE -ne 0) {
    FAIL "Admin build failed"
    $r | ForEach-Object { INFO $_ }
    Read-Host "Press Enter to close"
    exit 1
}
OK "Admin UI built"
Write-Host ""

# -- 5. Register ccp-start -----------------------------------------------------
Step 5 5 "Registering 'ccp-start' command..."

$npmPrefix  = (& npm prefix -g 2>&1).Trim()
$cmdTarget  = Join-Path $npmPrefix "ccp-start.cmd"
$serverPath = Join-Path $InstallDir "server\src\index.js"

$cmdContent = "@echo off`r`nsetlocal`r`nset CCP_DIR=$InstallDir`r`n:loop`r`nnode `"%CCP_DIR%\server\src\index.js`"`r`nif %errorlevel% equ 42 (`r`n    echo Restarting CCP server...`r`n    timeout /t 1 /nobreak >nul`r`n    goto loop`r`n)`r`nendlocal`r`n"

try {
    Set-Content -Path $cmdTarget -Value $cmdContent -Encoding ASCII
    OK "Registered: $cmdTarget"
} catch {
    FAIL "Could not write to $cmdTarget (try running as Administrator)"
}

# Also write a local launcher in the install dir
$localCmd = Join-Path $InstallDir "ccp.cmd"
Set-Content -Path $localCmd -Value $cmdContent -Encoding ASCII
OK "Local launcher: $localCmd"

# -- Done -----------------------------------------------------------------------
Write-Host ""
Write-Host "----------------------------------------------------" -ForegroundColor DarkGray
Write-Host " CCP installed successfully!" -ForegroundColor Green
Write-Host "----------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Start server:     " -NoNewline -ForegroundColor White
Write-Host "ccp-start" -ForegroundColor Cyan
Write-Host "  Admin panel:      " -NoNewline -ForegroundColor White
Write-Host "http://127.0.0.1:8082/admin" -ForegroundColor Cyan
Write-Host "  Installed to:     " -NoNewline -ForegroundColor White
Write-Host $InstallDir -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Set env vars for Claude Code:" -ForegroundColor White
Write-Host '    $env:ANTHROPIC_BASE_URL    = "http://127.0.0.1:8082"' -ForegroundColor DarkGray
Write-Host '    $env:ANTHROPIC_AUTH_TOKEN  = "super"' -ForegroundColor DarkGray
Write-Host ""
Write-Host "----------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Read-Host "Press Enter to close"
