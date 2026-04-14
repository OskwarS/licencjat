@echo off
title Vaultify - Start All Services
echo ==============================================
echo      Vaultify MVP - Uruchamianie Serwisow
echo ==============================================
echo.

echo 1. Startowanie Python AI Service (Port 8000)...
start "Vaultify: Python AI" cmd /k "cd backend-ai && call .\venv\Scripts\activate && uvicorn main:app --port 8000 --reload"

echo 2. Startowanie Bazy Node.js API (Port 3000)...
start "Vaultify: Node Backend" cmd /k "cd backend-node && node index.js"

echo 3. Startowanie React Native Expo...
start "Vaultify: Expo Mobile" cmd /k "cd mobile && npx expo start"

echo.
echo Wcisnij 'w' w oknie terminala Expo, aby odpalic Web Dashboard!
echo.
