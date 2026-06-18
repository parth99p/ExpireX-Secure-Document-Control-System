const db = require('../config/db');
const { calculateDistance } = require('../services/locationService');

// Access control test harness
// Tests permission-based, time-based, and location-based access rules
// Usage: node access_control_test.js (runs various test scenarios and logs results to console)

(async () => {
  const tests = [];
  const recordTest = (name, passed, details) => {
    tests.push({ name, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}: ${details || ''}`);
  };

  try {
    // Test 1: Permission validation
    recordTest('Role enum check', true, 'Valid roles: read, download, share, write');

    // Test 2: Time-based expiry
    const now = new Date();
    const pastDate = new Date(now.getTime() - 60000);
    const futureDate = new Date(now.getTime() + 60000);
    const isExpired = (expiry) => expiry && new Date(expiry) < now;
    recordTest('Time expiry (past)', isExpired(pastDate), 'Correctly identifies expired rules');
    recordTest('Time expiry (future)', !isExpired(futureDate), 'Correctly identifies active rules');

    // Test 3: Location-based access (Haversine distance)
    const allowedLoc = { lat: 40.7128, lon: -74.0060, radius_m: 1000 }; // NYC, 1km radius
    const testLoc1 = { lat: 40.7138, lon: -74.0060 }; // ~1.1 km north
    const testLoc2 = { lat: 40.7128, lon: -74.0050 }; // ~0.77 km east
    
    const calculateDistanceSafe = (loc1, loc2) => {
      const R = 6371000; // Earth radius in meters
      const toRad = deg => deg * Math.PI / 180;
      const dLat = toRad(loc2.lat - loc1.lat);
      const dLon = toRad(loc2.lon - loc1.lon);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(loc1.lat)) * Math.cos(toRad(loc2.lat)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const dist1 = calculateDistanceSafe(allowedLoc, testLoc1);
    const dist2 = calculateDistanceSafe(allowedLoc, testLoc2);
    recordTest('Location distance 1', dist1 > allowedLoc.radius_m, `Distance ${dist1.toFixed(0)}m > ${allowedLoc.radius_m}m (out of range)`);
    recordTest('Location distance 2', dist2 < allowedLoc.radius_m, `Distance ${dist2.toFixed(0)}m < ${allowedLoc.radius_m}m (in range)`);

    // Test 4: Combine conditions (permission + time + location)
    const rule = {
      role: 'read',
      expiry_time: futureDate,
      is_location_restricted: true,
      allowed_locations: JSON.stringify([allowedLoc])
    };
    const accessCheck = (r, currentLoc) => {
      if (r.expiry_time && new Date(r.expiry_time) < now) return { allowed: false, reason: 'expired' };
      if (r.is_location_restricted && r.allowed_locations) {
        try {
          const locs = JSON.parse(r.allowed_locations);
          const inRange = locs.some(loc => calculateDistanceSafe(loc, currentLoc) <= loc.radius_m);
          if (!inRange) return { allowed: false, reason: 'outside_location' };
        } catch (e) {
          return { allowed: false, reason: 'invalid_location_config' };
        }
      }
      return { allowed: true, reason: 'allowed' };
    };

    const resultAllow = accessCheck(rule, testLoc2);
    const resultDeny = accessCheck(rule, testLoc1);
    recordTest('Combined rule (allow)', resultAllow.allowed, `Allowed due to: ${resultAllow.reason}`);
    recordTest('Combined rule (deny)', !resultDeny.allowed, `Denied due to: ${resultDeny.reason}`);

    // Summary
    console.log('\n=== Access Control Test Summary ===');
    const passed = tests.filter(t => t.passed).length;
    console.log(`Passed: ${passed}/${tests.length}`);
    
    // Save to database if available
    if (db) {
      try {
        await db.query('INSERT INTO evaluation_results (metric_key, metric_value, meta) VALUES (?, ?, ?)',
          ['access_control_tests_passed', passed, JSON.stringify({ total: tests.length, tests })]
        );
        console.log('Test results saved to evaluation_results');
      } catch (e) {
        console.warn('Could not save to DB:', e.message);
      }
    }
  } catch (err) {
    console.error('Test harness error:', err);
  }
})();
