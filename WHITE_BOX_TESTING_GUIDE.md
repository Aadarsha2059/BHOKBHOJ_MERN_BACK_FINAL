# White Box Security Testing Guide with Burp Suite

## 🔒 Security Features Implemented

This guide explains how to test the security features implemented for **register**, **login**, and **OTP** endpoints using Burp Suite.

### Security Features:

1. **Security Validation Middleware** (`securityValidation.js`)
   - Detects SQL Injection attempts
   - Detects Cross-Site Scripting (XSS) attempts
   - Detects Command Injection attempts
   - Detects Path Traversal attempts
   - Detects NoSQL Injection attempts
   - Provides detailed error responses visible in Burp Suite

2. **Rate Limiting Middleware** (`rateLimiter.js`)
   - Limits registration attempts: **5 requests per 15 minutes**
   - Limits login attempts: **10 requests per 15 minutes**
   - Limits OTP verification: **10 requests per 5 minutes**
   - Provides rate limit information in response headers

---

## 🧪 Testing with Burp Suite

### Prerequisites

1. **Burp Suite** installed and running
2. **Browser configured** to use Burp Suite proxy (usually `127.0.0.1:8080`)
3. **Burp Suite Intercept** enabled (Proxy → Intercept → Intercept is on)

---

## 📋 Test Case 1: SQL Injection Detection

### Objective
Test if the application detects and blocks SQL injection attempts.

### Steps

1. **Open Burp Suite → Proxy → Intercept**
   - Make sure "Intercept is on"

2. **Navigate to Registration Page**
   - Fill the registration form
   - In the **username** field, enter: `admin' OR '1'='1`
   - Fill other required fields normally
   - Submit the form

3. **In Burp Suite Intercept:**
   - You will see the POST request
   - **Forward** the OPTIONS request first
   - Then you will see the POST request with your payload

4. **Modify the Request (Optional):**
   - Right-click on the POST request → **Send to Repeater**
   - In **Repeater** tab, modify the request body:
   ```json
   {
     "username": "admin' OR '1'='1",
     "email": "test@test.com",
     "password": "password123"
   }
   ```
   - Click **Send**

5. **Check the Response:**
   - Look at the **Response** tab in Burp Suite
   - You should see a **400 Bad Request** response
   - Response body will contain:
   ```json
   {
     "success": false,
     "message": "Security validation failed: Malicious input detected",
     "security": {
       "violations": 1,
       "highestSeverity": "HIGH",
       "details": [
         {
           "field": "username",
           "value": "admin' OR '1'='1",
           "attackTypes": [
             {
               "type": "SQL Injection",
               "severity": "HIGH",
               "description": "Potential SQL injection attempt detected..."
             }
           ]
         }
       ]
     }
   }
   ```

### Expected Result
- ✅ Request is blocked with **400 Bad Request**
- ✅ Detailed security violation information in response
- ✅ Attack type, severity, and description are provided

---

## 📋 Test Case 2: XSS (Cross-Site Scripting) Detection

### Objective
Test if the application detects and blocks XSS attempts.

### Steps

1. **In Burp Suite Repeater**, create a POST request to `/api/auth/register`

2. **Set the Request Body:**
   ```json
   {
     "username": "<script>alert('XSS')</script>",
     "email": "test@test.com",
     "password": "password123"
   }
   ```

3. **Send the Request**

4. **Check the Response:**
   - Response should be **400 Bad Request**
   - Response body will show:
   ```json
   {
     "security": {
       "details": [
         {
           "field": "username",
           "value": "<script>alert('XSS')</script>",
           "attackTypes": [
             {
               "type": "Cross-Site Scripting (XSS)",
               "severity": "HIGH",
               "description": "Potential XSS attack detected..."
             }
           ]
         }
       ]
     }
   }
   ```

### Other XSS Payloads to Test:
- `<img src=x onerror=alert('XSS')>`
- `<svg onload=alert('XSS')>`
- `javascript:alert('XSS')`
- `<body onload=alert('XSS')>`

---

## 📋 Test Case 3: Command Injection Detection

### Objective
Test if the application detects and blocks command injection attempts.

### Steps

1. **In Burp Suite Repeater**, create a POST request to `/api/auth/login`

2. **Set the Request Body:**
   ```json
   {
     "username": "admin; rm -rf /",
     "password": "password123"
   }
   ```

3. **Send the Request**

4. **Check the Response:**
   - Response should be **400 Bad Request**
   - Response will show **Command Injection** detected with **CRITICAL** severity

### Other Command Injection Payloads:
- `admin | cat /etc/passwd`
- `admin && whoami`
- `admin $(id)`
- `admin `ls -la``

---

## 📋 Test Case 4: NoSQL Injection Detection

### Objective
Test if the application detects and blocks NoSQL injection attempts.

### Steps

1. **In Burp Suite Repeater**, create a POST request to `/api/auth/login`

2. **Set the Request Body:**
   ```json
   {
     "username": {"$ne": null},
     "password": {"$ne": null}
   }
   ```
   Or as a string:
   ```json
   {
     "username": "$ne",
     "password": "password123"
   }
   ```

3. **Send the Request**

4. **Check the Response:**
   - Response should be **400 Bad Request**
   - Response will show **NoSQL Injection** detected

### Other NoSQL Injection Payloads:
- `$where`
- `$gt`
- `$or`
- `$regex`

---

## 📋 Test Case 5: Rate Limiting

### Objective
Test if rate limiting prevents brute force attacks.

### Steps

1. **In Burp Suite Repeater**, create a POST request to `/api/auth/login`

2. **Set the Request Body:**
   ```json
   {
     "username": "testuser",
     "password": "wrongpassword"
   }
   ```

3. **Send the Request Multiple Times:**
   - Click **Send** button repeatedly (more than 10 times within 15 minutes)
   - Or use **Intruder** tab for automated testing

4. **Check Response Headers:**
   - After a few requests, check the **Response Headers**:
     ```
     X-RateLimit-Limit: 10
     X-RateLimit-Remaining: 7
     X-RateLimit-Reset: 2025-01-XX...
     X-RateLimit-Window: 900 seconds
     ```

5. **After Exceeding Limit:**
   - Response status: **429 Too Many Requests**
   - Response body:
   ```json
   {
     "success": false,
     "message": "Too many login attempts. Please try again later.",
     "rateLimit": {
       "limit": 10,
       "remaining": 0,
       "resetTime": "2025-01-XX...",
       "resetInSeconds": 450,
       "currentCount": 11,
       "clientIP": "127.0.0.1"
     }
   }
   ```

### Using Burp Suite Intruder for Rate Limit Testing:

1. **Right-click** on the request → **Send to Intruder**
2. In **Intruder** tab:
   - Go to **Positions** tab
   - Set attack type: **Sniper**
   - Mark the password field: `§password§`
3. Go to **Payloads** tab:
   - Add multiple password payloads (e.g., `pass1`, `pass2`, `pass3`, ...)
4. Click **Start attack**
5. Watch the responses - after 10 requests, you'll get **429** responses

---

## 📋 Test Case 6: Path Traversal Detection

### Objective
Test if the application detects path traversal attempts.

### Steps

1. **In Burp Suite Repeater**, create a POST request to `/api/auth/register`

2. **Set the Request Body:**
   ```json
   {
     "username": "../../etc/passwd",
     "email": "test@test.com",
     "password": "password123"
   }
   ```

3. **Send the Request**

4. **Check the Response:**
   - Response should be **400 Bad Request**
   - Response will show **Path Traversal** detected

---

## 🔍 Viewing Security Violations in Burp Suite

### Method 1: Using Intercept Tab
1. **Proxy → Intercept** (Intercept is on)
2. Submit form with malicious payload
3. Forward OPTIONS request
4. View POST request with payload
5. Forward POST request
6. Check **Response** tab for security violation details

### Method 2: Using HTTP History
1. **Proxy → HTTP history**
2. Submit form with malicious payload
3. Find the POST request in history
4. Click on it → **Response** tab
5. View security violation details

### Method 3: Using Repeater
1. **Right-click** on request → **Send to Repeater**
2. Modify request body with payload
3. Click **Send**
4. View **Response** tab for security violation details

### Method 4: Using Intruder (for Rate Limiting)
1. **Right-click** on request → **Send to Intruder**
2. Configure payloads
3. **Start attack**
4. View responses - rate limit headers and 429 responses

---

## 📊 Response Format

### Security Validation Response (400 Bad Request):
```json
{
  "success": false,
  "message": "Security validation failed: Malicious input detected",
  "security": {
    "violations": 1,
    "highestSeverity": "HIGH",
    "details": [
      {
        "field": "username",
        "value": "malicious_payload",
        "attackTypes": [
          {
            "type": "SQL Injection",
            "severity": "HIGH",
            "description": "Potential SQL injection attempt detected..."
          }
        ]
      }
    ],
    "timestamp": "2025-01-XX...",
    "endpoint": "POST /api/auth/register"
  }
}
```

### Rate Limit Response (429 Too Many Requests):
```json
{
  "success": false,
  "message": "Too many login attempts. Please try again later.",
  "rateLimit": {
    "limit": 10,
    "remaining": 0,
    "resetTime": "2025-01-XX...",
    "resetInSeconds": 450,
    "windowMs": 900000,
    "currentCount": 11,
    "clientIP": "127.0.0.1",
    "endpoint": "POST /api/auth/login"
  }
}
```

### Rate Limit Headers (in all responses):
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 2025-01-XX...
X-RateLimit-Window: 900 seconds
```

---

## 🎯 Summary

### Security Features Tested:
- ✅ **SQL Injection Detection** - Blocks SQL injection attempts
- ✅ **XSS Detection** - Blocks cross-site scripting attempts
- ✅ **Command Injection Detection** - Blocks command injection attempts
- ✅ **NoSQL Injection Detection** - Blocks NoSQL injection attempts
- ✅ **Path Traversal Detection** - Blocks path traversal attempts
- ✅ **Rate Limiting** - Prevents brute force attacks

### What to Look For in Burp Suite:
1. **Response Status Codes:**
   - `400` = Security validation failed
   - `429` = Rate limit exceeded

2. **Response Body:**
   - Detailed security violation information
   - Attack type, severity, and description

3. **Response Headers:**
   - `X-RateLimit-*` headers show rate limit status

4. **Server Console:**
   - Detailed security violation logs
   - Rate limit status logs

---

## 💡 Tips for White Box Testing

1. **Test Each Field Separately:**
   - Test username field with malicious payload
   - Test email field with malicious payload
   - Test password field with malicious payload

2. **Combine Multiple Attacks:**
   - Try SQL injection + XSS in the same request
   - See if multiple violations are detected

3. **Test Rate Limits:**
   - Use Burp Suite Intruder for automated rate limit testing
   - Test different endpoints (register, login, OTP)

4. **Check Server Logs:**
   - Backend console will show detailed security violation logs
   - Useful for understanding what was detected

5. **Test Edge Cases:**
   - Encoded payloads (URL encoding, base64)
   - Unicode characters
   - Very long strings

---

## 🚨 Important Notes

- **These security features are for white box testing** - they provide detailed information about security violations
- **In production**, you may want to hide some details to prevent information disclosure
- **Rate limits are per IP address** - using different IPs will reset the limit
- **Rate limit store is in-memory** - server restart will reset limits (use Redis in production)

---

Happy Testing! 🎉

