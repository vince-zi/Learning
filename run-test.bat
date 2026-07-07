@echo off
cd /d "%~dp0"
echo Running Learniny System Validation Tests...
echo.
call npx vitest --run tests/validation.test.ts
