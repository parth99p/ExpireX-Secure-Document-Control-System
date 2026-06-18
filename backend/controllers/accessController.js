const db = require('../config/db');
const logger = require('../utils/logger');
const locationService = require('../services/locationService');

// Haversine distance in meters (DEPRECATED - use locationService instead)
function distanceMeters(lat1, lon1, lat2, lon2){
  function toRad(v){ return v * Math.PI / 180; }
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Grant access with strict location-based access control
 * Supports both single location and multiple locations
 */
exports.grantAccess = async (req, res) => {
  try {
    const { fileId, userEmail, role, expiry_time, geo_lat, geo_lon, geo_radius_m, is_location_restricted, allowed_locations } = req.body;
    const ownerId = req.user.id;
    
    const [files] = await db.query('SELECT * FROM files WHERE id = ?', [fileId]);
    if (!files.length) return res.status(404).json({ error: 'File not found' });
    if (files[0].owner_id !== ownerId) return res.status(403).json({ error: 'Not authorized' });

    // Validate location data if provided
    if (geo_lat != null && geo_lon != null) {
      if (isNaN(Number(geo_lat)) || isNaN(Number(geo_lon))) {
        return res.status(400).json({ error: 'Invalid latitude or longitude' });
      }
      if (geo_radius_m != null && (isNaN(Number(geo_radius_m)) || Number(geo_radius_m) < 10)) {
        return res.status(400).json({ error: 'Radius must be at least 10 meters' });
      }
    }

    // Validate multiple locations if provided
    if (allowed_locations && Array.isArray(allowed_locations)) {
      for (const loc of allowed_locations) {
        if (!loc.lat || !loc.lon || isNaN(Number(loc.lat)) || isNaN(Number(loc.lon))) {
          return res.status(400).json({ error: 'Invalid location coordinates in allowed_locations' });
        }
        if (loc.radius_m && (isNaN(Number(loc.radius_m)) || Number(loc.radius_m) < 10)) {
          return res.status(400).json({ error: 'Radius must be at least 10 meters' });
        }
      }
    }

    try {
      // Try to insert with new columns
      const [result] = await db.query(
        `INSERT INTO access_rules 
         (file_id, user_email, role, expiry_time, geo_lat, geo_lon, geo_radius_m, is_location_restricted, allowed_locations) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileId,
          userEmail,
          role,
          expiry_time || null,
          geo_lat || null,
          geo_lon || null,
          geo_radius_m || null,
          is_location_restricted ? 1 : 0,
          allowed_locations ? JSON.stringify(allowed_locations) : null
        ]
      );

      logger.logAction(req.user.email, 'grant', fileId, 'success');
      
      res.json({
        message: 'Access granted successfully',
        accessRuleId: result.insertId,
        locationRestricted: is_location_restricted ? true : false,
        locationCount: allowed_locations ? allowed_locations.length : (geo_lat ? 1 : 0)
      });
    } catch (e) {
      // Fallback for older database schema
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        await db.query(
          'INSERT INTO access_rules (file_id, user_email, role, expiry_time, geo_lat, geo_lon, geo_radius_m) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [fileId, userEmail, role, expiry_time || null, geo_lat || null, geo_lon || null, geo_radius_m || null]
        );
        logger.logAction(req.user.email, 'grant', fileId, 'success');
        res.json({ message: 'Access granted successfully' });
      } else {
        throw e;
      }
    }
  } catch (err) {
    console.error('GrantAccess error', err);
    logger.logAction(req.user.email, 'grant', req.body.fileId || null, 'failed');
    res.status(500).json({ error: 'Failed to grant access' });
  }
};

// Get files shared with me
exports.getSharedFiles = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const [rows] = await db.query(
      `SELECT ar.id as access_id, ar.file_id, ar.role, ar.expiry_time, ar.geo_lat, ar.geo_lon, 
              ar.is_location_restricted, ar.allowed_locations, f.originalname, f.filename, u.email as owner_email
       FROM access_rules ar
       JOIN files f ON ar.file_id = f.id
       JOIN users u ON f.owner_id = u.id
       WHERE ar.user_email = ?`,
      [userEmail]
    );
    res.json(rows);
  } catch (err) {
    console.error('GetSharedFiles error', err);
    res.status(500).json({ error: 'Failed to fetch shared files' });
  }
};

/**
 * Enhanced checkAccess middleware with strict location-based access control
 * Checks:
 * 1. Access rule exists
 * 2. Access not expired
 * 3. Location requirement (if configured)
 * 4. Geofence validation (if configured)
 */
exports.checkAccess = async (req, res, next) => {
  try {
    const fileId = req.params.id;
    const userEmail = req.user.email;
    
    const [rules] = await db.query(
      'SELECT * FROM access_rules WHERE file_id = ? AND user_email = ?',
      [fileId, userEmail]
    );

    if (!rules.length) {
      req.accessRole = null;
      req.accessDenialReason = 'No access rule found';
      return next();
    }

    const rule = rules[0];

    // Check expiry
    if (rule.expiry_time && new Date(rule.expiry_time) < new Date()) {
      req.accessRole = null;
      req.accessDenialReason = 'Access expired';
      const currentLoc = locationService.getCurrentLocation(req);
      await locationService.logLocationAccess(userEmail, fileId, 'denied', currentLoc, false, 'Access expired');
      return next();
    }

    // Get current location
    const currentLocation = locationService.getCurrentLocation(req);

    // Perform location validation
    const locationValidation = locationService.validateLocationAccess(rule, currentLocation);

    if (!locationValidation.isValid) {
      req.accessRole = null;
      req.accessDenialReason = locationValidation.reason;
      await locationService.logLocationAccess(
        userEmail,
        fileId,
        'denied',
        currentLocation,
        false,
        locationValidation.reason
      );
      return next();
    }

    // Log successful location-based access
    await locationService.logLocationAccess(
      userEmail,
      fileId,
      'view',
      currentLocation,
      true,
      locationValidation.reason
    );

    // Attach role to request
    req.accessRole = rule.role;
    req.locationValidation = locationValidation;
    next();
  } catch (err) {
    console.error('CheckAccess error', err);
    req.accessRole = null;
    req.accessDenialReason = 'Access check failed';
    next();
  }
};

// Access request workflow
exports.createAccessRequest = async (req, res) => {
  try {
    const { fileId, ownerEmail, role, message, expiry_time, geo_lat, geo_lon, geo_radius_m, is_location_restricted, allowed_locations } = req.body;
    const requesterEmail = req.user.email;

    const [owners] = await db.query('SELECT id FROM users WHERE email = ?', [ownerEmail]);
    if (!owners.length) return res.status(404).json({ error: 'Owner not found' });

    const [files] = await db.query('SELECT * FROM files WHERE id = ?', [fileId]);
    if (!files.length) return res.status(404).json({ error: 'File not found' });
    if (files[0].owner_id !== owners[0].id) return res.status(400).json({ error: 'File not owned by specified user' });

    // Validate location data
    if (geo_lat != null && geo_lon != null) {
      if (isNaN(Number(geo_lat)) || isNaN(Number(geo_lon))) {
        return res.status(400).json({ error: 'Invalid latitude or longitude' });
      }
    }

    try {
      await db.query(
        `INSERT INTO access_requests 
         (file_id, owner_email, requester_email, role, message, expiry_time, geo_lat, geo_lon, geo_radius_m, is_location_restricted, allowed_locations, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileId,
          ownerEmail,
          requesterEmail,
          role,
          message || null,
          expiry_time || null,
          geo_lat || null,
          geo_lon || null,
          geo_radius_m || null,
          is_location_restricted ? 1 : 0,
          allowed_locations ? JSON.stringify(allowed_locations) : null,
          'pending'
        ]
      );
    } catch (e) {
      // Try to create table and retry once
      try {
        await db.query(`CREATE TABLE IF NOT EXISTS access_requests (
          id INT AUTO_INCREMENT PRIMARY KEY,
          file_id INT NOT NULL,
          owner_email VARCHAR(255) NOT NULL,
          requester_email VARCHAR(255) NOT NULL,
          role ENUM('read','download','share') NOT NULL,
          message TEXT NULL,
          expiry_time DATETIME NULL,
          geo_lat DECIMAL(10,8) NULL,
          geo_lon DECIMAL(11,8) NULL,
          geo_radius_m INT NULL,
          is_location_restricted BOOLEAN DEFAULT FALSE,
          allowed_locations JSON NULL,
          status ENUM('pending','approved','denied') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
        )`);
        await db.query(
          `INSERT INTO access_requests 
           (file_id, owner_email, requester_email, role, message, expiry_time, geo_lat, geo_lon, geo_radius_m, is_location_restricted, allowed_locations, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fileId,
            ownerEmail,
            requesterEmail,
            role,
            message || null,
            expiry_time || null,
            geo_lat || null,
            geo_lon || null,
            geo_radius_m || null,
            is_location_restricted ? 1 : 0,
            allowed_locations ? JSON.stringify(allowed_locations) : null,
            'pending'
          ]
        );
      } catch (e2) {
        throw e2;
      }
    }
    res.json({ message: 'Request submitted' });
  } catch (err) {
    console.error('CreateAccessRequest error', err);
    res.status(500).json({ error: 'Failed to submit request' });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const ownerEmail = req.user.email;
    const [rows] = await db.query('SELECT * FROM access_requests WHERE owner_email = ? AND status = ?', [ownerEmail, 'pending']);
    res.json(rows);
  } catch (err) {
    console.error('GetPendingRequests error', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

exports.respondToRequest = async (req, res) => {
  try {
    const { requestId, decision } = req.body; // 'approved' or 'denied'
    const ownerEmail = req.user.email;
    const [rows] = await db.query('SELECT * FROM access_requests WHERE id = ?', [requestId]);
    if (!rows.length) return res.status(404).json({ error: 'Request not found' });
    const reqRow = rows[0];
    if (reqRow.owner_email !== ownerEmail) return res.status(403).json({ error: 'Not authorized' });
    await db.query('UPDATE access_requests SET status = ? WHERE id = ?', [decision, requestId]);
    if (decision === 'approved') {
      // Create access rule
      try {
        const [result] = await db.query(
          `INSERT INTO access_rules (file_id, user_email, role, expiry_time, geo_lat, geo_lon, geo_radius_m, is_location_restricted, allowed_locations) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            reqRow.file_id,
            reqRow.requester_email,
            reqRow.role,
            reqRow.expiry_time,
            reqRow.geo_lat,
            reqRow.geo_lon,
            reqRow.geo_radius_m,
            reqRow.is_location_restricted || 0,
            reqRow.allowed_locations || null
          ]
        );
      } catch (e) {
        // Fallback for older schema
        await db.query(
          'INSERT INTO access_rules (file_id, user_email, role, expiry_time, geo_lat, geo_lon) VALUES (?, ?, ?, ?, ?, ?)',
          [
            reqRow.file_id,
            reqRow.requester_email,
            reqRow.role,
            reqRow.expiry_time,
            reqRow.geo_lat,
            reqRow.geo_lon
          ]
        );
      }
    }
    res.json({ message: 'Response recorded' });
  } catch (err) {
    console.error('RespondToRequest error', err);
    res.status(500).json({ error: 'Failed to respond' });
  }
};

/**
 * Get location access history for a file
 */
exports.getLocationAccessHistory = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;

    // Verify user owns the file
    const [files] = await db.query('SELECT * FROM files WHERE id = ?', [fileId]);
    if (!files.length) return res.status(404).json({ error: 'File not found' });
    if (files[0].owner_id !== userId) return res.status(403).json({ error: 'Not authorized' });

    const history = await locationService.getLocationAccessHistory(fileId);
    res.json(history);
  } catch (err) {
    console.error('GetLocationAccessHistory error', err);
    res.status(500).json({ error: 'Failed to fetch location history' });
  }
};

/**
 * Get denied location access attempts (security audit)
 */
exports.getDeniedAttempts = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;

    // Verify user owns the file
    const [files] = await db.query('SELECT * FROM files WHERE id = ?', [fileId]);
    if (!files.length) return res.status(404).json({ error: 'File not found' });
    if (files[0].owner_id !== userId) return res.status(403).json({ error: 'Not authorized' });

    const deniedAttempts = await locationService.getLocationDeniedAttempts(fileId);
    res.json(deniedAttempts);
  } catch (err) {
    console.error('GetDeniedAttempts error', err);
    res.status(500).json({ error: 'Failed to fetch denied attempts' });
  }
};

/**
 * Get current user location (helper endpoint)
 */
exports.getCurrentUserLocation = async (req, res) => {
  try {
    const currentLocation = locationService.getCurrentLocation(req);
    if (!currentLocation) {
      return res.status(400).json({ error: 'Location not provided' });
    }
    res.json({
      lat: currentLocation.lat,
      lon: currentLocation.lon,
      timestamp: currentLocation.timestamp
    });
  } catch (err) {
    console.error('GetCurrentUserLocation error', err);
    res.status(500).json({ error: 'Failed to get location' });
  }
};

module.exports = exports;

