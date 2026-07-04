# ═══════════════════════════════════════════════════════════════
#   ██████╗ ██████╗██████╗ 
#  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
#  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
#  ██║     ██║     ██╔═══╝ 
#  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
#   ╚═════╝ ╚═════╝╚═╝ 
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host "`n⚡ Installing Claude Code Proxy (CCP)..." -ForegroundColor Magenta

# Resolve install directory (works both from file and irm|iex)
$InstallDir = if ($PSScriptRoot -and (Test-Path $PSScriptRoot)) { $PSScriptRoot } else { (Get-Location).Path }
Write-Host "📁 Install directory: $InstallDir" -ForegroundColor Cyan

# 1. Check Node.js
try {
    $nodeVersion = node -v 2>&1
    if ($LASTEXITCODE -ne 0) { throw "node not found" }
    Write-Host "✔ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠  Node.js is not installed." -ForegroundColor Yellow
    Write-Host "Attempting to install Node.js via winget..." -ForegroundColor Cyan
    try {
        winget install --id OpenJS.NodeJS -e --silent
        Write-Host "✔ Node.js installed. Please restart your terminal and re-run this installer." -ForegroundColor Green
        Exit 0
    } catch {
        Write-Host "❌ Failed to install Node.js automatically." -ForegroundColor Red
        Write-Host "   Please install it manually from https://nodejs.org/ then re-run." -ForegroundColor Red
        Exit 1
    }
}

# 2. Install Project Dependencies
Write-Host "`n📦 Installing dependencies (server & admin)..." -ForegroundColor Cyan
Push-Location $InstallDir
npm run install:all
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Dependency install failed." -ForegroundColor Red; Pop-Location; Exit 1 }
Pop-Location

# 3. Create .env Configuration
$envFile = Join-Path $InstallDir "server\.env"
$envExample = Join-Path $InstallDir "server\.env.example"

if (-not (Test-Path $envFile)) {
    Write-Host "`n⚙  Generating secure environment configuration..." -ForegroundColor Cyan
    Copy-Item $envExample -Destination $envFile

    # Generate a random 32-character encryption key
    $bytes = New-Object Byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $encryptionKey = [System.Convert]::ToBase64String($bytes) -replace '[+/=]','' | Select-Object -First 1
    $encryptionKey = $encryptionKey.Substring(0, [Math]::Min(32, $encryptionKey.Length))

    $content = Get-Content $envFile -Raw
    $content = $content -replace 'CCP_ENCRYPTION_SECRET=change_this_to_a_long_random_secret_value_32chars', "CCP_ENCRYPTION_SECRET=$encryptionKey"
    Set-Content -Path $envFile -Value $content -NoNewline
    Write-Host "✔ Created server/.env with a secure random encryption key." -ForegroundColor Green
} else {
    Write-Host "✔ Existing server/.env found — keeping your configuration." -ForegroundColor Green
}

# 4. Build Production Frontend
Write-Host "`n🏗  Building production frontend assets..." -ForegroundColor Cyan
Push-Location $InstallDir
npm run build:admin
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Frontend build failed." -ForegroundColor Red; Pop-Location; Exit 1 }
Pop-Location

# 5. Create ccp.cmd launcher (Windows batch restart-loop)
Write-Host "`n🚀 Creating ccp.cmd launch command..." -ForegroundColor Cyan
$ccpCmdPath = Join-Path $InstallDir "ccp.cmd"
$ccpCmd = "@echo off`r`nsetlocal`r`nset CCP_DIR=$InstallDir`r`n:loop`r`nnode ""%CCP_DIR%\server\src\index.js""`r`nif %errorlevel% equ 42 (`r`n  echo Restarting CCP server...`r`n  goto loop`r`n)`r`n"
Set-Content -Path $ccpCmdPath -Value $ccpCmd
Write-Host "✔ Created $ccpCmdPath" -ForegroundColor Green

# 6. Global CLI registration (ccp-start)
Write-Host "`n🔗 Registering global 'ccp-start' command..." -ForegroundColor Cyan
Push-Location $InstallDir
try {
    npm link 2>&1 | Out-Null
    Write-Host "✔ Global 'ccp-start' command registered." -ForegroundColor Green
    Write-Host "  You can now start the proxy from anywhere by typing: ccp-start" -ForegroundColor Green
} catch {
    Write-Host "⚠  Could not register 'ccp-start' globally (try running as Administrator)." -ForegroundColor Yellow
    Write-Host "  Manually run: npm link   inside $InstallDir" -ForegroundColor Yellow
}
Pop-Location

Write-Host "`n🎉 CCP installation complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host " ▶ Start server:   ccp-start" -ForegroundColor Cyan
Write-Host "                   OR: .\ccp.cmd" -ForegroundColor Cyan
Write-Host " 🌐 Admin panel:   http://127.0.0.1:8082/admin" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
