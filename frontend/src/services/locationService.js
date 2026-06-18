/**
 * Frontend Location Service
 * Handles geolocation, location display, and location-based access UI
 */

/**
 * Get current location from device
 * @returns {Promise<{lat: number, lon: number}>} Current coordinates or null
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp)
        });
      },
      (error) => {
        console.error('Geolocation error:', error.message);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Watch user's location (continuous)
 * @param {Function} callback - Called with location updates
 * @returns {number} Watch ID for cleanup
 */
export const watchLocation = (callback) => {
  if (!navigator.geolocation) {
    console.error('Geolocation not supported');
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp)
      });
    },
    (error) => {
      console.error('Location watch error:', error.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
};

/**
 * Clear location watch
 * @param {number} watchId - ID returned from watchLocation
 */
export const clearLocationWatch = (watchId) => {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * Calculate distance between two coordinates
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  function toRad(v) {
    return v * Math.PI / 180;
  }
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Format location coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string} Formatted location string
 */
export const formatLocation = (lat, lon) => {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
};

/**
 * Format distance
 * @param {number} distance - Distance in meters
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distance) => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(2)}km`;
};

/**
 * Check if location is within radius
 * @param {object} currentLocation - {lat, lon}
 * @param {object} allowedLocation - {lat, lon}
 * @param {number} radiusMeters - Radius in meters
 * @returns {boolean} Whether within radius
 */
export const isWithinRadius = (currentLocation, allowedLocation, radiusMeters = 100) => {
  const distance = calculateDistance(
    currentLocation.lat,
    currentLocation.lon,
    allowedLocation.lat,
    allowedLocation.lon
  );
  return distance <= radiusMeters;
};

/**
 * Default location (headquarters)
 */
export const DEFAULT_LOCATION = {
  lat: 18.5204,
  lng: 73.8567,
  name: 'Headquarters (Pune)'
};

/**
 * Common location presets
 */
export const LOCATION_PRESETS = [
  {
    name: 'Office Main',
    lat: 18.5204,
    lon: 73.8567,
    radius_m: 100
  },
  {
    name: 'Office Branch',
    lat: 19.0760,
    lon: 72.8777,
    radius_m: 150
  },
  {
    name: 'Home',
    lat: 18.5580,
    lon: 73.7855,
    radius_m: 200
  }
];

export default {
  getCurrentLocation,
  watchLocation,
  clearLocationWatch,
  calculateDistance,
  formatLocation,
  formatDistance,
  isWithinRadius,
  DEFAULT_LOCATION,
  LOCATION_PRESETS
};
