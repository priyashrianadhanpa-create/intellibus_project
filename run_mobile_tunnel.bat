@echo off
title IntelliBus Expo Go Tunnel Launcher
color 0B
cls
echo =======================================================================
echo          INTELLIBUS EXPO GO TUNNEL LAUNCHER (FIREWALL BYPASS)         
echo =======================================================================
echo.
echo Launching Expo Dev Server in Tunnel Mode...
echo (This bypasses local Wi-Fi router isolation and Windows Firewall)
echo.

cd /d "%~dp0mobile"
npx expo start --tunnel

pause
