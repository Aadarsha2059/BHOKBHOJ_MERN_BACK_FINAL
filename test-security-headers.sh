#!/bin/bash

# Security Headers Test Script
# Tests all security headers on localhost:5050/api/restaurants
# Simple bash script to verify helmet.js security headers configuration

echo "=========================================="
echo "Security Headers Test Script"
echo "Testing: http://localhost:5050/api/restaurants"
echo "=========================================="
echo ""

# Test URL
URL="http://localhost:5050/api/restaurants"

echo "📡 Making request to: $URL"
echo ""

# Make request and capture headers
response=$(curl -s -I "$URL")

# Check if server is running
if [ $? -ne 0 ]; then
    echo "❌ Error: Could not connect to server"
    echo "   Make sure the backend server is running on localhost:5050"
    exit 1
fi

echo "✅ Connection successful!"
echo ""
echo "=========================================="
echo "Security Headers Analysis"
echo "=========================================="
echo ""

# Check each security header
headers_to_check=(
    "Content-Security-Policy:CSP"
    "Strict-Transport-Security:HSTS"
    "X-Frame-Options:X-Frame-Options"
    "X-Content-Type-Options:X-Content-Type-Options"
    "Referrer-Policy:Referrer-Policy"
    "Permissions-Policy:Permissions-Policy"
    "X-Powered-By:X-Powered-By"
)

# Function to check header
check_header() {
    local header_name=$1
    local display_name=$2
    
    if echo "$response" | grep -qi "^$header_name:"; then
        header_value=$(echo "$response" | grep -i "^$header_name:" | cut -d: -f2- | sed 's/^[[:space:]]*//')
        echo "✅ $display_name: Present"
        echo "   Value: $header_value"
    else
        echo "❌ $display_name: Missing"
    fi
    echo ""
}

# Check Content-Security-Policy
check_header "Content-Security-Policy" "Content-Security-Policy (CSP)"

# Check HSTS
check_header "Strict-Transport-Security" "Strict-Transport-Security (HSTS)"

# Check X-Frame-Options
check_header "X-Frame-Options" "X-Frame-Options"

# Check X-Content-Type-Options
check_header "X-Content-Type-Options" "X-Content-Type-Options"

# Check Referrer-Policy
check_header "Referrer-Policy" "Referrer-Policy"

# Check Permissions-Policy
check_header "Permissions-Policy" "Permissions-Policy"

# Check X-Powered-By (should be removed)
if echo "$response" | grep -qi "^X-Powered-By:"; then
    header_value=$(echo "$response" | grep -i "^X-Powered-By:" | cut -d: -f2- | sed 's/^[[:space:]]*//')
    echo "⚠️  X-Powered-By: Present (should be removed)"
    echo "   Value: $header_value"
    echo "   Note: This header should be removed for security"
else
    echo "✅ X-Powered-By: Removed (correct)"
fi
echo ""

echo "=========================================="
echo "Full Response Headers"
echo "=========================================="
echo ""
echo "$response"
echo ""

echo "=========================================="
echo "Test Complete"
echo "=========================================="

