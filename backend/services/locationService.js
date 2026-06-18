/**
 * Location Service - Handles geofencing and location-based access control
 * Provides functions for distance calculation, location validation, and access logging
 */

const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  function toRad(v) {
    return v * Math.PI / 180;
  }
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get user's current location (from request)
 * @param {object} req - Express request object
 * @returns {object} Object with lat, lon properties or null
 */
exports.getCurrentLocation = (req) => {
  const lat = req.body?.geo_lat_current || req.query?.geo_lat_current;
  const lon = req.body?.geo_lon_current || req.query?.geo_lon_current;

  if (lat != null && lon != null) {
    return {
      lat: Number(lat),
      lon: Number(lon),
      timestamp: new Date()
    };
  }
  return null;
};

/**
 * Validate if user is within allowed location(s)
 * @param {object} rule - Access rule object
 * @param {object} currentLocation - Current location {lat, lon}
 * @returns {object} {isValid: boolean, reason: string}
 */
exports.validateLocationAccess = (rule, currentLocation) => {
  // If no location restriction, allow access
  if (!rule.is_location_restricted && !rule.geo_lat) {
    return { isValid: true, reason: 'No location restriction' };
  }

  // If location restriction is enabled but no current location provided
  if (rule.is_location_restricted && (!currentLocation || currentLocation.lat == null)) {
    return { isValid: false, reason: 'Location data required but not provided' };
  }

  // If single location is set (legacy support)
  if (rule.geo_lat != null && rule.geo_lon != null && currentLocation) {
    const distance = calculateDistance(
      Number(currentLocation.lat),
      Number(currentLocation.lon),
      Number(rule.geo_lat),
      Number(rule.geo_lon)
    );

    const radius = rule.geo_radius_m != null ? Number(rule.geo_radius_m) : 100; // Default 100m
    const isWithinRadius = distance <= radius;

    return {
      isValid: isWithinRadius,
      distance: Math.round(distance),
      radius,
      reason: isWithinRadius ?
        `Within allowed location (${Math.round(distance)}m from center)` :
        `Outside allowed location (${Math.round(distance)}m from center, max allowed: ${radius}m)`
    };
  }

  // If multiple locations are defined
  if (rule.allowed_locations) {
    try {
      const locations = typeof rule.allowed_locations === 'string' ?
        JSON.parse(rule.allowed_locations) : rule.allowed_locations;

      if (!Array.isArray(locations) || locations.length === 0) {
        return { isValid: false, reason: 'No valid locations configured' };
      }

      for (const location of locations) {
        const distance = calculateDistance(
          Number(currentLocation.lat),
          Number(currentLocation.lon),
          Number(location.lat),
          Number(location.lon)
        );

        const radius = location.radius_m || 100;
        if (distance <= radius) {
          return {
            isValid: true,
            distance: Math.round(distance),
            radius,
            locationName: location.name || 'Allowed location',
            reason: `Within allowed location: ${location.name || 'Location 1'} (${Math.round(distance)}m from center)`
          };
        }
      }

      return {
        isValid: false,
        reason: 'Outside all allowed locations'
      };
    } catch (err) {
      return { isValid: false, reason: 'Error parsing location configuration' };
    }
  }

  return { isValid: true, reason: 'No location restriction' };
};

/**
 * Log location-based access attempt
 * @param {string} userEmail - User email
 * @param {number} fileId - File ID
 * @param {string} accessType - 'view', 'download', 'grant', 'denied'
 * @param {object} currentLocation - Current location
 * @param {boolean} allowed - Access allowed?
 * @param {string} reason - Reason for decision
 */
exports.logLocationAccess = async (userEmail, fileId, accessType, currentLocation, allowed, reason) => {
  try {
    if (currentLocation && currentLocation.lat != null) {
      await db.query(
        `INSERT INTO user_location_access 
         (user_email, file_id, access_type, access_lat, access_lon, allowed, reason) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userEmail,
          fileId,
          accessType,
          currentLocation.lat,
          currentLocation.lon,
          allowed ? 1 : 0,
          reason || null
        ]
      );
    }
  } catch (err) {
    console.error('Error logging location access:', err);
    // Don't throw, just log warning
  }
};

/**
 * Get location access history for a file
 * @param {number} fileId - File ID
 * @param {number} limit - Number of records
 * @returns {array} Access history records
 */
exports.getLocationAccessHistory = async (fileId, limit = 50) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM user_location_access 
       WHERE file_id = ? 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [fileId, limit]
    );
    return rows;
  } catch (err) {
    console.error('Error fetching location access history:', err);
    return [];
  }
};

/**
 * Get location-based denial attempts (security auditing)
 * @param {number} fileId - File ID
 * @returns {array} Records of denied access attempts
 */
exports.getLocationDeniedAttempts = async (fileId) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM user_location_access 
       WHERE file_id = ? AND allowed = 0 
       ORDER BY timestamp DESC 
       LIMIT 100`,
      [fileId]
    );
    return rows;
  } catch (err) {
    console.error('Error fetching denied attempts:', err);
    return [];
  }
};

/**
 * Create multiple allowed locations for an access rule
 * @param {number} accessRuleId - Access rule ID
 * @param {array} locations - Array of location objects [{name, lat, lon, radius_m}, ...]
 */
exports.setAllowedLocations = async (accessRuleId, locations) => {
  try {
    if (!Array.isArray(locations) || locations.length === 0) {
      return false;
    }

    // Validate location objects
    const validLocations = locations.filter(loc =>
      loc && loc.lat != null && loc.lon != null &&
      typeof Number(loc.lat) === 'number' &&
      typeof Number(loc.lon) === 'number'
    );

    if (validLocations.length === 0) {
      return false;
    }

    const locationsJson = JSON.stringify(validLocations);

    await db.query(
      `UPDATE access_rules 
       SET allowed_locations = ?, is_location_restricted = 1 
       WHERE id = ?`,
      [locationsJson, accessRuleId]
    );

    return true;
  } catch (err) {
    console.error('Error setting allowed locations:', err);
    return false;
  }
};

/**
 * Get current location from device (to be called from frontend and passed to backend)
 * This is a utility function for documentation purposes
 */
exports.getDeviceLocation = () => {
  return `
  // Usage in frontend:
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        // Send these with API request as geo_lat_current and geo_lon_current
      },
      error => console.error('Location error:', error)
    );
  }
  `;
};

/**
 * Check if location is configured as primary access point
 * @param {object} rule - Access rule
 * @returns {boolean} Whether location-based access is primary control
 */
exports.isLocationPrimaryControl = (rule) => {
  return rule.is_location_restricted === 1 || (rule.geo_lat != null && rule.geo_lon != null);
};

module.exports = exports;
