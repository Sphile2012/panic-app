@echo off
echo Clearing Expo cache and restarting...
cd mobile
rmdir /s /q .expo 2>nul
rmdir /s /q node_modules\.cache 2>nul
echo Cache cleared!
echo.
echo Starting Expo with fresh cache...
npx expo start --clear
