# Browser Fingerprinting & Device Tracking Implementation Guide

## ✅ Implementation Complete

Browser fingerprinting and device tracking has been successfully implemented in your BhokBhoj/final project.

## 📋 What Was Implemented

### 1. **Device Model** (`Backend/models/Device.js`)
- Tracks all device information for each user
- Stores: Device ID (UUID), Browser Info, OS Info, IP Address, User Agent, Fingerprint
- Supports active/inactive device status
- Tracks login attempts per device
- Supports device trust marking

### 2. **Device Fingerprinting Utility** (`Backend/utils/deviceFingerprint.js`)
- Extracts browser information (name, version)
- Extracts OS information (name, version)
- Generates unique device IDs (UUID v4)
- Creates device fingerprints (SHA-256 hash)
- Detects device type (desktop, mobile, tablet)

### 3. **Device Tracking Service** (`Backend/services/deviceTrackingService.js`)
- Automatically tracks devices on successful login
- Manages max devices limit (default: 3, configurable per user)
- Updates existing devices or creates new ones
- Deactivates oldest device when max limit reached

### 4. **User Model Update** (`Backend/models/User.js`)
- Added `maxDevices` field (default: 3, range: 1-10)
- Users can have custom max device limits

### 5. **Login Controller Integration**
- Device tracking automatically happens on:
  - Successful OTP verification (regular users)
  - Successful admin login
- Non-blocking: Login continues even if device tracking fails

### 6. **API Endpoints** (`Backend/routes/deviceRoutes.js`)
- `GET /api/devices` - Get all devices for authenticated user
- `GET /api/devices/:deviceId` - Get specific device details
- `POST /api/devices/:deviceId/deactivate` - Deactivate a device
- `POST /api/devices/:deviceId/trust` - Mark device as trusted

## 📊 Viewing Device Data in MongoDB Compass

### Step 1: Connect to MongoDB
1. Open MongoDB Compass
2. Connect to your database (usually `mongodb://localhost:27017` or your connection string)
3. Select your database (e.g., `bhokbhoj` or your database name)

### Step 2: View Device Collection
1. Look for the **`devices`** collection in the left sidebar
2. Click on `devices` collection
3. You'll see all device documents

### Step 3: Understanding Device Document Structure

Each device document contains:

```json
{
  "_id": "679b9b4bf115bbbb31bfcefc",          // MongoDB ObjectId
  "userId": "507f1f77bcf86cd799439011",       // Reference to User
  "deviceId": "58244f14-e4c3-4029-884c-c9848443b125",  // UUID (unique device identifier)
  "browserName": "Edge",                      // Browser name
  "browserVersion": "132.0.0.0",              // Browser version
  "osName": "Windows",                        // Operating system
  "osVersion": "10",                          // OS version
  "deviceType": "desktop",                    // desktop, mobile, tablet, unknown
  "userAgent": "Mozilla/5.0...",              // Full user agent string
  "ipAddress": "::1",                         // IP address (IPv4 or IPv6)
  "isActive": true,                           // Active device status
  "lastActiveAt": "2025-01-30T15:31:27.970Z", // Last login timestamp
  "firstSeenAt": "2025-01-30T15:31:27.970Z",  // First login timestamp
  "loginAttempts": 0,                         // Login attempts counter
  "isTrusted": false,                         // Trust status
  "fingerprint": "a1b2c3d4e5f6...",           // SHA-256 fingerprint hash
  "createdAt": "2025-01-30T15:31:27.970Z",   // Document creation time
  "updatedAt": "2025-01-30T15:31:27.970Z"    // Last update time
}
```

### Step 4: Query Devices by User

**To view devices for a specific user:**

1. In MongoDB Compass, go to the `devices` collection
2. Click on **"Filter"** button
3. Enter filter: `{ "userId": ObjectId("USER_ID_HERE") }`
   - Replace `USER_ID_HERE` with the actual user's MongoDB ObjectId
4. Click **"Apply"**

**To view only active devices:**

Filter: `{ "userId": ObjectId("USER_ID_HERE"), "isActive": true }`

**To view devices sorted by last active:**

1. Click on **"Sort"** button
2. Sort by: `lastActiveAt`
3. Order: `-1` (descending - most recent first)

### Step 5: View Device Tracking in User Collection

1. Go to the **`users`** collection
2. Find a user document
3. Look for the `maxDevices` field:
   ```json
   {
     "maxDevices": 3
   }
   ```
   - This shows the maximum number of active devices allowed for this user

### Step 6: View Active vs Inactive Devices

**Active Devices (currently logged in):**
- Filter: `{ "isActive": true }`

**Previous/Inactive Devices:**
- Filter: `{ "isActive": false }`

## 🔍 Example Queries in MongoDB Compass

### Get all devices for a user (sorted by last active)
```javascript
{ "userId": ObjectId("507f1f77bcf86cd799439011") }
```
Sort by: `lastActiveAt` descending

### Get active devices only
```javascript
{ "userId": ObjectId("507f1f77bcf86cd799439011"), "isActive": true }
```

### Get devices with specific browser
```javascript
{ "browserName": "Edge" }
```

### Get devices from specific IP
```javascript
{ "ipAddress": "::1" }
```

### Get trusted devices
```javascript
{ "userId": ObjectId("507f1f77bcf86cd799439011"), "isTrusted": true }
```

## 🌐 Using the API Endpoints

### Get My Devices (Requires Authentication)
```bash
GET /api/devices
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Devices retrieved successfully",
  "data": [
    {
      "_id": "679b9b4bf115bbbb31bfcefc",
      "deviceId": "58244f14-e4c3-4029-884c-c9848443b125",
      "browserInfo": "Edge 132.0.0.0",
      "osInfo": "Windows 10",
      "deviceType": "desktop",
      "ipAddress": "::1",
      "isActive": true,
      "lastActiveAt": "2025-01-30T15:31:27.970Z",
      "firstSeenAt": "2025-01-30T15:31:27.970Z",
      "loginAttempts": 0,
      "isTrusted": false
    }
  ],
  "count": 1
}
```

### Get Only Active Devices
```bash
GET /api/devices?activeOnly=true
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Specific Device
```bash
GET /api/devices/58244f14-e4c3-4029-884c-c9848443b125
Authorization: Bearer YOUR_JWT_TOKEN
```

### Deactivate a Device
```bash
POST /api/devices/58244f14-e4c3-4029-884c-c9848443b125/deactivate
Authorization: Bearer YOUR_JWT_TOKEN
```

### Mark Device as Trusted
```bash
POST /api/devices/58244f14-e4c3-4029-884c-c9848443b125/trust
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🎯 How Device Tracking Works

1. **User logs in successfully** (OTP verification or admin login)
2. **Device information is extracted** from request headers:
   - User-Agent (browser/OS detection)
   - IP Address
   - Device fingerprint (hash of browser + OS + IP)
3. **System checks for existing device:**
   - If device with same fingerprint exists → Update `lastActiveAt`
   - If new device → Create new device record
4. **Max devices limit enforced:**
   - If user has reached `maxDevices` limit (default: 3)
   - Oldest inactive device is automatically deactivated
   - New device is registered
5. **Device data stored in MongoDB:**
   - Saved to `devices` collection
   - Linked to user via `userId` field
   - Can be viewed in MongoDB Compass

## 📍 Important Fields Explained

| Field | Description | Example |
|-------|-------------|---------|
| `deviceId` | Unique UUID for the device | `58244f14-e4c3-4029-884c-c9848443b125` |
| `browserName` | Browser name | `Edge`, `Chrome`, `Firefox` |
| `browserVersion` | Browser version | `132.0.0.0` |
| `osName` | Operating system | `Windows`, `macOS`, `Linux` |
| `osVersion` | OS version | `10`, `14.1` |
| `ipAddress` | IP address (IPv4 or IPv6) | `::1`, `192.168.1.1` |
| `isActive` | Device active status | `true` (active), `false` (inactive) |
| `lastActiveAt` | Last login timestamp | `2025-01-30T15:31:27.970Z` |
| `loginAttempts` | Failed login attempts | `0` (resets on successful login) |
| `fingerprint` | Unique device fingerprint hash | `a1b2c3d4e5f6...` |

## ✅ Testing Device Tracking

1. **Login with different browsers:**
   - Login from Chrome → Device 1 created
   - Login from Edge → Device 2 created
   - Login from Firefox → Device 3 created
   - Login from Safari → Device 4 created (oldest device deactivated)

2. **Check MongoDB Compass:**
   - Open `devices` collection
   - You should see all 4 devices
   - 3 should be `isActive: true`
   - 1 should be `isActive: false` (oldest)

3. **View in API:**
   - `GET /api/devices` → Shows all devices
   - `GET /api/devices?activeOnly=true` → Shows only active devices

## 🔒 Security Features

- **Device Fingerprinting:** Unique hash based on browser + OS + IP
- **Max Devices Limit:** Prevents unlimited device access
- **Auto-Deactivation:** Old devices automatically deactivated
- **Login Attempts Tracking:** Per-device failed login tracking
- **Device Trust Marking:** Users can mark trusted devices

## 📝 Notes

- Device tracking happens **automatically** on successful login
- Non-blocking: Login continues even if device tracking fails
- All device data is stored in MongoDB and viewable in Compass
- Device information is extracted from request headers (no client-side code needed)

---

**Implementation Date:** 2025-01-30
**Status:** ✅ Complete and Ready for Use
