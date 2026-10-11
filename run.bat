@echo off
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
echo Starting RentDrive Enterprise Vehicle Rental DBMS...
start http://localhost:5173
npm run dev
