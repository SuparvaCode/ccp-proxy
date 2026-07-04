# ═══════════════════════════════════════════════════════════════
#   ██████╗ ██████╗██████╗ 
#  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
#  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
#  ██║     ██║     ██╔═══╝ 
#  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
#   ╚═════╝ ╚═════╝╚═╝ 
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host "⚡ Installing Claude Code Proxy (CCP)..." -ForegroundColor Violet

# 1. Check Node.js
try {
    $nodeVersion = node -v
    Write-Host "✔ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠ Node.js is not installed." -ForegroundColor Yellow
    Write-Host "Attempting to install Node.js via winget..." -ForegroundColor Cyan
    try {
        winget install OpenJS.NodeJS
        Write-Host "✔ Node.js installed successfully. Please restart your terminal and re-run this command." -ForegroundColor Green
        Exit
    } catch {
        Write-Host "❌ Failed to install Node.js automatically. Please install it manually from https://nodejs.org/" -ForegroundColor Red
        Exit
    }
}

# 2. Install Project Dependencies
Write-Host "📦 Installing dependencies (server & admin)..." -ForegroundColor Cyan
npm run install:all

# 3. Create .env Configuration
$envFile = "server\.env"
$envExample = "server\.env.example"

if (-not (Test-Path $envFile)) {
    Write-Host "⚙ Generating secure environment configuration..." -ForegroundColor Cyan
    Copy-Item $envExample -Destination $envFile
    
    # Generate a random 32-character encryption key
    $bytes = New-Object Byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $encryptionKey = [System.Convert]::ToBase64String($bytes).Replace('+', '').Replace('/', '').Substring(0, 32)
    
    # Update .env file
    $content = Get-Content $envFile
    $content = $content -replace "CCP_AUTH_TOKEN=super", "CCP_AUTH_TOKEN=super"
    $content = $content -replace "CCP_ENCRYPTION_SECRET=change_this_to_a_long_random_secret_value_32chars", "CCP_ENCRYPTION_SECRET=$encryptionKey"
    Set-Content -Path $envFile -Value $content
    Write-Host "✔ Created server/.env with secure encryption key." -ForegroundColor Green
} else {
    Write-Host "✔ Existing server/.env found. Keeping configuration." -ForegroundColor Green
}

# 4. Build Production Frontend
Write-Host "🏗 Building production frontend assets..." -ForegroundColor Cyan
npm run build:admin

# 5. Create ccp command helper
Write-Host "🚀 Creating ccp launch command..." -ForegroundColor Cyan
$ccpCmd = @"
@echo off
node "%~dp0server\src\index.js"
"@

Set-Content -Path "ccp.cmd" -Value $ccpCmd
Write-Host "✔ Created ccp launcher script (./ccp.cmd)" -ForegroundColor Green

Write-Host "`n🎉 CCP installation completed successfully!" -ForegroundColor Green
Write-Host "▶ Run './ccp.cmd' to start the proxy server." -ForegroundColor Green
