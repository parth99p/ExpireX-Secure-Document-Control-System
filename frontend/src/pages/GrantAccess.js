import React, { useState, useEffect } from 'react';
import accessService from '../services/accessService';
import locationService from '../services/locationService';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

function GrantAccess() {
  const { fileId } = useParams();
  const navigate = useNavigate();

  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState('read');
  const [expiry, setExpiry] = useState('');
  
  // Current location
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);
  const [currentLocationError, setCurrentLocationError] = useState('');

  // Selected location
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [radius, setRadius] = useState('100');
  
  // Multiple locations
  const [allowMultipleLocations, setAllowMultipleLocations] = useState(false);
  const [allowedLocations, setAllowedLocations] = useState([]);
  const [useLocationRestriction, setUseLocationRestriction] = useState(false);

  // Loading states
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const defaultCenter = { lat: 18.5204, lng: 73.8567 };

  const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
  });

  // Load current location on component mount
  useEffect(() => {
    loadCurrentLocation();
  }, []);

  const loadCurrentLocation = async () => {
    setCurrentLocationLoading(true);
    setCurrentLocationError('');
    try {
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
      // Auto-set current location as the initial selected location
      setSelectedLocation({ lat: location.lat, lng: location.lon });
    } catch (error) {
      setCurrentLocationError(
        error.message === 'User denied geolocation'
          ? 'Location permission denied. You can still manually select a location.'
          : 'Could not get current location. You can manually select a location.'
      );
      console.error('Location error:', error);
    } finally {
      setCurrentLocationLoading(false);
    }
  };

  const addLocationToList = () => {
    if (!selectedLocation) {
      alert('Please select a location first');
      return;
    }

    const newLocation = {
      name: `Location ${allowedLocations.length + 1}`,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      radius_m: Number(radius) || 100
    };

    setAllowedLocations([...allowedLocations, newLocation]);
    // Reset for next location
    setSelectedLocation(null);
    setRadius('100');
  };

  const removeLocationFromList = (index) => {
    setAllowedLocations(allowedLocations.filter((_, i) => i !== index));
  };

  const updateLocationName = (index, name) => {
    const updated = [...allowedLocations];
    updated[index].name = name;
    setAllowedLocations(updated);
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!userEmail.trim()) {
      alert('Please enter user email');
      return;
    }

    if (useLocationRestriction && allowMultipleLocations && allowedLocations.length === 0) {
      alert('Please add at least one allowed location');
      return;
    }

    if (useLocationRestriction && !allowMultipleLocations && !selectedLocation) {
      alert('Please select a location');
      return;
    }

    try {
      setSubmitting(true);

      const grantData = {
        fileId,
        userEmail,
        role,
        expiry_time: expiry || null,
        is_location_restricted: useLocationRestriction ? 1 : 0
      };

      if (allowMultipleLocations && allowedLocations.length > 0) {
        grantData.allowed_locations = allowedLocations.map(loc => ({
          name: loc.name,
          lat: loc.lat,
          lon: loc.lng,
          radius_m: loc.radius_m
        }));
      } else if (selectedLocation && !allowMultipleLocations) {
        grantData.geo_lat = selectedLocation.lat;
        grantData.geo_lon = selectedLocation.lng;
        grantData.geo_radius_m = Number(radius) || 100;
      }

      await accessService.grant(grantData);
      alert('Access granted successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error granting access:', error);
      alert('Failed to grant access: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setSelectedLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    return (
      <>
        {/* Show current location */}
        {currentLocation && (
          <>
            <Marker
              position={{ lat: currentLocation.lat, lng: currentLocation.lon }}
              icon={new L.Icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                iconSize: [25, 41],
                className: 'current-location-marker'
              })}
              title="Your current location"
            />
            <Circle
              center={{ lat: currentLocation.lat, lng: currentLocation.lon }}
              radius={50}
              pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
            />
          </>
        )}

        {/* Show selected location */}
        {selectedLocation && currentLocation &&
          (selectedLocation.lat !== currentLocation.lat || selectedLocation.lng !== currentLocation.lon) && (
            <>
              <Marker
                position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                icon={markerIcon}
                title="Selected location"
              />
              <Circle
                center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                radius={Number(radius) || 100}
                pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1 }}
              />
            </>
          )}

        {/* Show only selected location if no current location */}
        {selectedLocation && !currentLocation && (
          <>
            <Marker
              position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
              icon={markerIcon}
            />
            <Circle
              center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
              radius={Number(radius) || 100}
              pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1 }}
            />
          </>
        )}

        {/* Show all allowed locations in multi-location mode */}
        {allowMultipleLocations &&
          allowedLocations.map((loc, idx) => (
            <React.Fragment key={idx}>
              <Marker
                position={{ lat: loc.lat, lng: loc.lng }}
                icon={markerIcon}
                title={loc.name}
              />
              <Circle
                center={{ lat: loc.lat, lng: loc.lng }}
                radius={loc.radius_m}
                pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.1 }}
              />
            </React.Fragment>
          ))}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-100 to-purple-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">🔑</span>
          <h2 className="text-3xl font-extrabold text-green-700 tracking-tight">
            Grant Access for File ID: {fileId}
          </h2>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {/* User Email */}
          <div>
            <label className="block text-base text-gray-700 mb-1 font-bold">User Email</label>
            <input
              required
              placeholder="user@example.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full p-3 border-2 border-green-300 focus:border-blue-400 rounded-xl focus:outline-none transition"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-base text-gray-700 mb-1 font-bold">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-3 border-2 border-green-300 focus:border-blue-400 rounded-xl focus:outline-none transition"
            >
              <option value="read">🔎 Read Only</option>
              <option value="download">⬇️ Download</option>
              <option value="share">🔗 Share</option>
            </select>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-base text-gray-700 mb-1 font-bold">
              Expiry (Optional)
            </label>
            <input
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full p-3 border-2 border-green-300 focus:border-blue-400 rounded-xl focus:outline-none transition"
            />
          </div>

          {/* Location-Based Access Control */}
          <div className="pt-4 border-t-2 border-green-100">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="useLocationRestriction"
                checked={useLocationRestriction}
                onChange={(e) => setUseLocationRestriction(e.target.checked)}
                className="w-5 h-5 cursor-pointer"
              />
              <label
                htmlFor="useLocationRestriction"
                className="text-lg font-bold text-blue-600 cursor-pointer flex items-center gap-2"
              >
                📍 Enable Location-Based Access Control
              </label>
            </div>

            {useLocationRestriction && (
              <>
                {/* Current Location Display */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                  <h4 className="font-bold text-blue-700 mb-2">📍 Your Current Location</h4>
                  {currentLocationLoading ? (
                    <p className="text-gray-600">🔄 Getting your location...</p>
                  ) : currentLocation ? (
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold">
                        Lat: {currentLocation.lat.toFixed(5)}, Lon:{' '}
                        {currentLocation.lon.toFixed(5)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Accuracy: ±{Math.round(currentLocation.accuracy)}m
                      </p>
                    </div>
                  ) : (
                    <p className="text-orange-600 text-sm">
                      {currentLocationError}
                      <button
                        type="button"
                        onClick={loadCurrentLocation}
                        className="ml-2 underline font-semibold hover:text-orange-700"
                      >
                        Retry
                      </button>
                    </p>
                  )}
                </div>

                {/* Multiple Locations Toggle */}
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="allowMultiple"
                    checked={allowMultipleLocations}
                    onChange={(e) => setAllowMultipleLocations(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="allowMultiple" className="font-semibold text-gray-700 cursor-pointer">
                    Allow Multiple Locations
                  </label>
                </div>

                {/* Map */}
                <div className="mb-4" style={{ height: '280px', width: '100%' }}>
                  <MapContainer
                    center={currentLocation || defaultCenter}
                    zoom={currentLocation ? 14 : 10}
                    style={{
                      height: '100%',
                      width: '100%',
                      borderRadius: 14,
                      overflow: 'hidden',
                      border: '2px solid #cbd5e1'
                    }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="&copy; OpenStreetMap contributors"
                    />
                    <LocationMarker />
                  </MapContainer>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 <strong>Blue circle:</strong> Your current location | <strong>Red circle:</strong> Selected location
                  </p>
                </div>

                {/* Radius Input */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    min="10"
                    step="10"
                    placeholder="Radius (meters)"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className="w-2/3 p-3 border-2 border-green-300 focus:border-blue-400 rounded-xl focus:outline-none transition"
                  />
                  <span className="inline-block self-center text-gray-500 font-semibold">meters</span>
                </div>

                {/* Add Multiple Location Button */}
                {allowMultipleLocations && (
                  <button
                    type="button"
                    onClick={addLocationToList}
                    disabled={!selectedLocation}
                    className="w-full mb-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
                  >
                    + Add Location
                  </button>
                )}

                {/* Display Selected Location Info */}
                {selectedLocation && (
                  <div className="text-sm text-green-700 mb-2 p-2 bg-green-50 rounded-lg">
                    ✓ Selected: lat {selectedLocation.lat.toFixed(5)}, lon{' '}
                    {selectedLocation.lng.toFixed(5)} | Radius: {radius}m
                  </div>
                )}

                {/* Allowed Locations List */}
                {allowedLocations.length > 0 && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
                    <h4 className="font-bold text-green-700 mb-3">📍 Allowed Locations ({allowedLocations.length})</h4>
                    <div className="space-y-2">
                      {allowedLocations.map((loc, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-green-200 flex items-center justify-between">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={loc.name}
                              onChange={(e) => updateLocationName(idx, e.target.value)}
                              className="text-sm font-semibold text-gray-700 bg-transparent border-b border-gray-300 w-full mb-1"
                              placeholder="Location name"
                            />
                            <p className="text-xs text-gray-500">
                              {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} | Radius: {loc.radius_m}m
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLocationFromList(idx)}
                            className="ml-2 text-red-500 hover:text-red-700 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || (useLocationRestriction && allowMultipleLocations && allowedLocations.length === 0)}
            className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 hover:from-green-500 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-2xl shadow-lg font-bold text-lg w-full transition-all duration-150"
          >
            {submitting ? '⏳ Granting Access...' : '✅ Grant Access'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default GrantAccess;

