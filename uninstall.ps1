# ===============================================================
#   CCP (Claude Code Proxy) - Uninstaller
#   Copyright (c) 2026 Suparva (SuparvaCode)
# ===============================================================

$ErrorActionPreference = "Continue"

# Re-launch in a persistent window when piped via irm|iex
if (-not $PSCommandPath) {
    $tempScript = Join-Path $env:TEMP "ccp_uninstall_$([System.IO.Path]::GetRandomFileName()).ps1"
    try {
        Invoke-WebRequest -Uri "https://raw.githubusercontent.com/SuparvaCode/ccp-proxy/main/uninstall.ps1" `
            -UseBasicParsing -OutFile $tempScript
        Start-Process powershell.exe -ArgumentList @(
            "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $tempScript
        )
    } catch {
        Write-Host "ERROR: Could not download uninstaller: $_" -ForegroundColor Red
        Read-Host "Press Enter to close"
    }
    exit 0
}

Clear-Host

Write-Host ""
Write-Host "  CCP - Claude Code Proxy" -ForegroundColor Magenta
Write-Host "  by SuparvaCode" -ForegroundColor Magenta
Write-Host ""
Write-Host "Uninstalling CCP..." -ForegroundColor Red
Write-Host "----------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

$InstallDir  = "$env:USERPROFILE\.ccp-proxy"
$npmPrefix   = ""
$ccpStartCmd = ""

try {
    $npmPrefix   = (& npm prefix -g 2>&1).Trim()
    $ccpStartCmd = Join-Path $npmPrefix "ccp-start.cmd"
} catch {}

Write-Host "This will remove:" -ForegroundColor White
if (Test-Path $InstallDir) {
    Write-Host "  * $InstallDir" -ForegroundColor DarkGray
}
if ($ccpStartCmd -and (Test-Path $ccpStartCmd)) {
    Write-Host "  * $ccpStartCmd" -ForegroundColor DarkGray
}
Write-Host ""

$confirm = Read-Host "Type 'yes' to confirm complete uninstall"
if ($confirm -ne 'yes') {
    Write-Host ""
    Write-Host "Uninstall cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to close"
    exit 0
}

Write-Host ""

# -- 1. Remove global ccp-start command -------------------------
Write-Host "[ 1/3 ] Removing global 'ccp-start' command..." -ForegroundColor White

if ($ccpStartCmd -and (Test-Path $ccpStartCmd)) {
    try {
        Remove-Item $ccpStartCmd -Force
        Write-Host "          [OK] Removed $ccpStartCmd" -ForegroundColor Green
    } catch {
        Write-Host "          [WARN] Could not remove $ccpStartCmd - try running as Administrator." -ForegroundColor Yellow
    }
} else {
    Write-Host "          [-] Global command not found (already removed or not installed)" -ForegroundColor DarkGray
}

# Also try npm unlink in case it was linked (non-fatal)
if (Test-Path $InstallDir) {
    Push-Location $InstallDir
    & npm unlink 2>&1 | Out-Null
    Pop-Location
}

Write-Host ""

# -- 2. Remove install directory -------------------------------
Write-Host "[ 2/3 ] Removing install directory ($InstallDir)..." -ForegroundColor White

if (Test-Path $InstallDir) {
    try {
        Remove-Item $InstallDir -Recurse -Force
        Write-Host "          [OK] Removed $InstallDir" -ForegroundColor Green
    } catch {
        Write-Host "          [WARN] Could not fully remove $InstallDir" -ForegroundColor Yellow
        Write-Host "                 Close any terminals running ccp-start and try again," -ForegroundColor DarkGray
        Write-Host "                 or delete the folder manually." -ForegroundColor DarkGray
    }
} else {
    Write-Host "          [-] Directory not found (already removed)" -ForegroundColor DarkGray
}

Write-Host ""

# -- 3. Remind user to clean env vars --------------------------
Write-Host "[ 3/3 ] Environment variable reminder..." -ForegroundColor White
Write-Host "          If you added these to your PowerShell profile, remove them:" -ForegroundColor DarkGray
Write-Host '          $env:ANTHROPIC_BASE_URL' -ForegroundColor DarkGray
Write-Host '          $env:ANTHROPIC_AUTH_TOKEN' -ForegroundColor DarkGray

Write-Host ""
Write-Host "----------------------------------------------------" -ForegroundColor DarkGray
Write-Host " CCP has been completely uninstalled." -ForegroundColor Green
Write-Host "----------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Read-Host "Press Enter to close"
