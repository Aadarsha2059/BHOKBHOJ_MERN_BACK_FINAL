# Security Headers Test Script (PowerShell)
# Tests all security headers on localhost:5050/api/restaurants
# Simple PowerShell script to verify helmet.js security headers configuration

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Security Headers Test Script" -ForegroundColor Cyan
Write-Host "Testing: http://localhost:5050/api/restaurants" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test URL
$url = "http://localhost:5050/api/restaurants"

Write-Host "📡 Making request to: $url" -ForegroundColor Yellow
Write-Host ""

try {
    # Make request and capture headers
    $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -ErrorAction Stop
    
    Write-Host "✅ Connection successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Security Headers Analysis" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Function to check header
    function Check-Header {
        param(
            [string]$HeaderName,
            [string]$DisplayName
        )
        
        if ($response.Headers[$HeaderName]) {
            $headerValue = $response.Headers[$HeaderName]
            Write-Host "✅ $DisplayName : Present" -ForegroundColor Green
            Write-Host "   Value: $headerValue" -ForegroundColor Gray
        } else {
            Write-Host "❌ $DisplayName : Missing" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    # Check Content-Security-Policy
    Check-Header "Content-Security-Policy" "Content-Security-Policy (CSP)"
    
    # Check HSTS
    Check-Header "Strict-Transport-Security" "Strict-Transport-Security (HSTS)"
    
    # Check X-Frame-Options
    Check-Header "X-Frame-Options" "X-Frame-Options"
    
    # Check X-Content-Type-Options
    Check-Header "X-Content-Type-Options" "X-Content-Type-Options"
    
    # Check Referrer-Policy
    Check-Header "Referrer-Policy" "Referrer-Policy"
    
    # Check Permissions-Policy
    Check-Header "Permissions-Policy" "Permissions-Policy"
    
    # Check X-Powered-By (should be removed)
    if ($response.Headers["X-Powered-By"]) {
        $headerValue = $response.Headers["X-Powered-By"]
        Write-Host "⚠️  X-Powered-By: Present (should be removed)" -ForegroundColor Yellow
        Write-Host "   Value: $headerValue" -ForegroundColor Gray
        Write-Host "   Note: This header should be removed for security" -ForegroundColor Yellow
    } else {
        Write-Host "✅ X-Powered-By: Removed (correct)" -ForegroundColor Green
    }
    Write-Host ""
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Full Response Headers" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Display all headers
    $response.Headers.GetEnumerator() | ForEach-Object {
        Write-Host "$($_.Key): $($_.Value)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Test Complete" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error: Could not connect to server" -ForegroundColor Red
    Write-Host "   Make sure the backend server is running on localhost:5050" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

