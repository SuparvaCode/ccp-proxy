@echo off
:loop
node "%~dp0server\src\index.js"
if %errorlevel% equ 42 (
  echo 🔄 Restarting Claude Code Proxy (CCP) server...
  goto loop
)
