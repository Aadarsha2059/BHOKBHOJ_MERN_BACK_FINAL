/**
 * Geolocation Service
 * Gets location information from IP address
 * Uses ip-api.com (free tier: 45 requests/minute, no API key required)
 */

const https = require('https');

/**
 * Get location information from IP address
 * @param {string} ipAddress - IP address to lookup
 * @returns {Promise<Object>} Location information {city, region, country, locationString}
 */
const getLocationFromIP = async (ipAddress) => {
  try {
    // Skip local/private IPs
    if (!ipAddress || ipAddress === 'Unknown' || ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('172.')) {
      return {
        city: null,
        region: null,
        country: null,
        locationString: 'Local/Private Network'
      };
    }

    // Use ip-api.com free API (no API key required, 45 req/min limit)
    const url = `https://ip-api.com/json/${ipAddress}?fields=status,message,country,regionName,city,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query`;

    return new Promise((resolve, reject) => {
      https.get(url, { timeout: 5000 }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(data);

            if (result.status === 'success') {
              const locationParts = [];
              
              if (result.city) locationParts.push(result.city);
              if (result.regionName) locationParts.push(result.regionName);
              if (result.country) locationParts.push(result.country);

              const locationString = locationParts.length > 0 
                ? locationParts.join(', ')
                : result.country || 'Unknown Location';

              resolve({
                city: result.city || null,
                region: result.regionName || null,
                country: result.country || null,
                locationString: locationString,
                latitude: result.lat || null,
                longitude: result.lon || null,
                timezone: result.timezone || null,
                isp: result.isp || null,
                isMobile: result.mobile || false,
                isProxy: result.proxy || false,
                isHosting: result.hosting || false
              });
            } else {
              // API returned error
              resolve({
                city: null,
                region: null,
                country: null,
                locationString: 'Unknown Location',
                error: result.message || 'Location lookup failed'
              });
            }
          } catch (parseError) {
            resolve({
              city: null,
              region: null,
              country: null,
              locationString: 'Unknown Location',
              error: 'Failed to parse location data'
            });
          }
        });
      }).on('error', (error) => {
        // Network error or timeout - silently fail and return unknown
        resolve({
          city: null,
          region: null,
          country: null,
          locationString: 'Unknown Location',
          error: error.message
        });
      }).on('timeout', () => {
        resolve({
          city: null,
          region: null,
          country: null,
          locationString: 'Unknown Location',
          error: 'Location lookup timeout'
        });
      });
    });
  } catch (error) {
    // Fallback on any error
    return {
      city: null,
      region: null,
      country: null,
      locationString: 'Unknown Location',
      error: error.message
    };
  }
};

/**
 * Get formatted device information string
 * @param {Object} deviceInfo - Device info from extractDeviceInfo
 * @returns {string} Formatted device string (e.g., "Chrome 141.0 on Windows 10")
 */
const getFormattedDeviceInfo = (deviceInfo) => {
  if (!deviceInfo) return 'Unknown Device';

  const parts = [];

  // Browser info
  if (deviceInfo.browserName && deviceInfo.browserName !== 'Unknown') {
    const browserVersion = deviceInfo.browserVersion ? deviceInfo.browserVersion.split('.')[0] : '';
    parts.push(`${deviceInfo.browserName}${browserVersion ? ' ' + browserVersion : ''}`);
  }

  // OS info
  if (deviceInfo.osName && deviceInfo.osName !== 'Unknown') {
    const osVersion = deviceInfo.osVersion ? deviceInfo.osVersion.split('.')[0] : '';
    parts.push(`on ${deviceInfo.osName}${osVersion ? ' ' + osVersion : ''}`);
  }

  // Device type
  if (deviceInfo.deviceType && deviceInfo.deviceType !== 'unknown') {
    const deviceTypeCapitalized = deviceInfo.deviceType.charAt(0).toUpperCase() + deviceInfo.deviceType.slice(1);
    parts.push(`(${deviceTypeCapitalized})`);
  }

  if (parts.length > 0) {
    return parts.join(' ');
  }

  return 'Unknown Device';
};

module.exports = {
  getLocationFromIP,
  getFormattedDeviceInfo
};
