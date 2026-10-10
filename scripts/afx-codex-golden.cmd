@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0afx-codex-golden.ps1" %*
exit /b %ERRORLEVEL%
