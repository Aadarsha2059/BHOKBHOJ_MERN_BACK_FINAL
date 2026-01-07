@echo off
REM Security Headers Test Script (Command Prompt / Batch)
REM Tests all security headers on localhost:5050/api/restaurants

echo ==========================================
echo Security Headers Test Script
echo Testing: http://localhost:5050/api/restaurants
echo ==========================================
echo.

REM Test URL
set URL=http://localhost:5050/api/restaurants

echo Making request to: %URL%
echo.

REM Make request using PowerShell (available on all Windows systems)
powershell -Command "try { $response = Invoke-WebRequest -Uri '%URL%' -Method GET -UseBasicParsing -ErrorAction Stop; Write-Host 'Connection successful!' -ForegroundColor Green; Write-Host ''; Write-Host '==========================================' -ForegroundColor Cyan; Write-Host 'Security Headers Analysis' -ForegroundColor Cyan; Write-Host '==========================================' -ForegroundColor Cyan; Write-Host ''; $headers = @('Content-Security-Policy', 'Strict-Transport-Security', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'X-Powered-By'); foreach ($header in $headers) { if ($response.Headers[$header]) { Write-Host 'Present: ' -NoNewline -ForegroundColor Green; Write-Host $header -ForegroundColor Green; Write-Host '  Value: ' -NoNewline; Write-Host $response.Headers[$header] -ForegroundColor Gray } else { if ($header -eq 'X-Powered-By') { Write-Host 'Removed (correct): ' -NoNewline -ForegroundColor Green; Write-Host $header -ForegroundColor Green } else { Write-Host 'Missing: ' -NoNewline -ForegroundColor Red; Write-Host $header -ForegroundColor Red } } Write-Host '' }; Write-Host '==========================================' -ForegroundColor Cyan; Write-Host 'Full Response Headers' -ForegroundColor Cyan; Write-Host '==========================================' -ForegroundColor Cyan; Write-Host ''; $response.Headers.GetEnumerator() | ForEach-Object { Write-Host ('$($_.Key): $($_.Value)') -ForegroundColor Gray }; Write-Host ''; Write-Host '==========================================' -ForegroundColor Cyan; Write-Host 'Test Complete' -ForegroundColor Cyan; Write-Host '==========================================' -ForegroundColor Cyan } catch { Write-Host 'Error: Could not connect to server' -ForegroundColor Red; Write-Host 'Make sure the backend server is running on localhost:5050' -ForegroundColor Yellow; Write-Host ('Error: ' + $_.Exception.Message) -ForegroundColor Red; exit 1 }"

echo.
pause

