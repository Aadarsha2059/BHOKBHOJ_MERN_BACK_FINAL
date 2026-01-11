# Real-Time Session Activity Tracking - White Box Testing Guide

## Overview
This dashboard demonstrates the **Session Activity Tracking and Inactivity Timeout** mechanism for white box testing purposes.

## How to Access

1. **Login** to your application first (store token in localStorage as `adminToken` or `token`)
2. **Navigate** to: `http://localhost:YOUR_PORT/session-realtime-tracking.html`
3. The dashboard will automatically start tracking your sessions in real-time

## Features Demonstrated

### 1. Real-Time Activity Updates
- **What it shows**: Every time you make an authenticated API request, the session's `lastActivity` timestamp is updated
- **Visual indicator**: Session cards flash and highlight when activity is detected
- **Activity log**: Shows timestamped entries when sessions are updated

### 2. Automatic Session Extension
- **Mechanism**: When activity is detected, the `expiresAt` time is automatically extended by **15 minutes**
- **Visualization**: 
  - Countdown timer shows time remaining until expiration
  - Progress bar shows percentage of 15-minute window remaining
  - Color coding: Green (safe) → Yellow (warning) → Red (danger)

### 3. Inactivity Timeout
- **Timeout duration**: 15 minutes of inactivity
- **What happens**: Sessions inactive beyond 15 minutes are automatically invalidated
- **Visual feedback**: Expired sessions are marked with red border and reduced opacity

### 4. Real-Time Monitoring
- **Update frequency**: Dashboard polls every 2 seconds for changes
- **Connection status**: Shows if real-time tracking is active
- **Activity counter**: Tracks total number of activity updates detected

## Testing the Mechanism

### Test 1: Trigger Activity Update
1. Click the **"Make Test API Request"** button
2. Watch the dashboard:
   - Session card will flash/highlight
   - "Last Activity" timestamp will update
   - Countdown timer will reset to 15:00
   - Progress bar will reset to 100%
   - Activity log will show a new entry

### Test 2: Observe Inactivity
1. Stop making any API requests
2. Watch the countdown timer decrease
3. After 15 minutes of inactivity, the session will expire
4. The session card will turn red and show "EXPIRED"

### Test 3: Multiple Sessions
1. Open the application in multiple browsers/devices
2. Each session will appear as a separate card
3. Activity on one session only updates that session
4. Other sessions continue their countdown independently

## Technical Details

### Session Model Fields
- `lastActivity`: Updated on every authenticated request
- `expiresAt`: Extended by 15 minutes when activity is detected
- `isActive`: Set to `false` when session expires or is ended

### Middleware Behavior
The `sessionCheck` middleware in `sessionMiddleware.js`:
1. Verifies JWT token
2. Checks if session exists and is valid
3. Updates `lastActivity` to current time
4. Extends `expiresAt` by 15 minutes (900,000 ms)
5. Saves session to database

### API Endpoints Used
- `GET /api/sessions/my-sessions` - Get all active sessions
- `GET /api/sessions/session-stats` - Get session statistics
- `GET /api/sessions/realtime-track` - Server-Sent Events endpoint (optional)
- `GET /api/sessions/activity-log` - Get activity history

## White Box Testing Scenarios

### Scenario 1: Normal Activity Flow
**Expected Behavior**:
1. User makes API request
2. `lastActivity` updates to current timestamp
3. `expiresAt` extends by 15 minutes
4. Dashboard shows activity update

**How to Verify**:
- Check activity log for "Activity Updated" entries
- Verify countdown timer resets
- Confirm progress bar resets to 100%

### Scenario 2: Inactivity Timeout
**Expected Behavior**:
1. No API requests for 15 minutes
2. Session `expiresAt` passes current time
3. Session becomes invalid
4. Next API request with that session fails

**How to Verify**:
- Watch countdown timer reach 0:00
- Session card turns red
- Activity log shows "Session Expired"

### Scenario 3: Concurrent Sessions
**Expected Behavior**:
1. User logs in from multiple devices
2. Each device has separate session
3. Activity on one device doesn't affect others
4. Each session has independent timeout

**How to Verify**:
- Multiple session cards appear
- Each has independent countdown
- Activity updates only affect the active session

## Code Locations

### Backend Files
- `Backend/models/Session.js` - Session model with activity tracking
- `Backend/middlewares/sessionMiddleware.js` - Middleware that updates activity
- `Backend/routes/sessionRoutes.js` - API endpoints for session management

### Frontend Files
- `Backend/public/session-realtime-tracking.html` - Real-time tracking dashboard

## Troubleshooting

### Dashboard shows "No Active Session"
- **Solution**: Make sure you're logged in and token is stored in localStorage
- Check browser console for authentication errors

### Activity updates not showing
- **Solution**: Make sure you're making authenticated requests (with Authorization header)
- Check that `sessionCheck` middleware is applied to your routes

### Countdown not updating
- **Solution**: Refresh the page or check browser console for JavaScript errors
- Verify the polling interval is working (should update every 2 seconds)

## Security Notes

This dashboard is for **white box testing and demonstration purposes only**. In production:
- Remove or restrict access to this dashboard
- Don't expose session details to end users
- Use proper authentication and authorization
- Consider rate limiting for session endpoints
