$env:PATH = "C:\Program Files\nodejs;$env:LOCALAPPDATA\Programs\nodejs;$env:PATH"
Write-Host "Starting RentDrive Enterprise Vehicle Rental DBMS..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"
npm run dev
