@echo off
echo Cronos X402 Agent-to-Agent Payment Setup
echo ========================================

echo Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    echo Then run this script again.
    pause
    exit /b 1
)

echo Node.js found. Installing dependencies...
npm install

if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Setup complete! Next steps:
echo 1. Create a .env file with your wallet configurations
echo 2. Run 'npm run start:agent-b' to start the seller agent
echo 3. Run 'npm run start:agent-a' to start the buyer agent
echo.
pause
