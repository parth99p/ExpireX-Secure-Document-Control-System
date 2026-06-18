import React, { useState, useEffect } from 'react';
import accessService from '../services/accessService';
import locationService from '../services/locationService';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

function RequestAccess() {
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    fileId: '',
    ownerEmail: '',
    role: 'read',
    message: '',
    expiry_time: '',
    geo_lat: null,
    geo_lon: null,
    geo_radius_m: 100,
    is_location_restricted: false,
    allowed_locations: []
  });

  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);
  const [currentLocationError, setCurrentLocationError] = useState('');
  const [allowMultipleLocations, setAllowMultipleLocations] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const defaultCenter = { lat: 18.5204, lng: 73.8567 };

  const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
  });

  // Load current location on mount
  useEffect(() => {
    loadCurrentLocation();
  }, []);

  const loadCurrentLocation = async () => {
    setCurrentLocationLoading(true);
    setCurrentLocationError('');
    try {
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
      // Auto-set current location
      setForm(prev => ({
        ...prev,
        geo_lat: location.lat,
        geo_lon: location.lon
      }));
    } catch (error) {
      setCurrentLocationError('Could not get current location. You can manually select one.');
      console.error('Location error:', error);
    } finally {
      setCurrentLocationLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      const requestData = {
        ...form,
        allowed_locations: allowMultipleLocations ? form.allowed_locations : null
      };

      await accessService.requestAccess(requestData);
      alert('Request sent successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error sending request:', error);
      alert('Failed to send request: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const addLocationToList = () => {
    if (form.geo_lat == null || form.geo_lon == null) {
      alert('Please select a location first');
      return;
    }

    const newLocation = {
      name: `Location ${form.allowed_locations.length + 1}`,
      lat: form.geo_lat,
      lon: form.geo_lon,
      radius_m: form.geo_radius_m
    };

    setForm(prev => ({
      ...prev,
      allowed_locations: [...prev.allowed_locations, newLocation]
    }));

    // Reset for next location
    setForm(prev => ({
      ...prev,
      geo_lat: null,
      geo_lon: null
    }));
  };

  const removeLocationFromList = (index) => {
    setForm(prev => ({
      ...prev,
      allowed_locations: prev.allowed_locations.filter((_, i) => i !== index)
    }));
  };

  const updateLocationName = (index, name) => {
    setForm(prev => ({
      ...prev,
      allowed_locations: prev.allowed_locations.map((loc, i) =>
        i === index ? { ...loc, name } : loc
      )
    }));
  };

  function LocationPicker() {
    useMapEvents({
      click(e) {
        setForm(prev => ({
          ...prev,
          geo_lat: e.latlng.lat,
          geo_lon: e.latlng.lng
        }));
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
        {form.geo_lat != null && form.geo_lon != null && currentLocation &&
          (form.geo_lat !== currentLocation.lat || form.geo_lon !== currentLocation.lon) && (
            <>
              <Marker
                position={{ lat: form.geo_lat, lng: form.geo_lon }}
                icon={markerIcon}
              />
              <Circle
                center={{ lat: form.geo_lat, lng: form.geo_lon }}
                radius={form.geo_radius_m || 100}
                pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1 }}
              />
            </>
          )}

        {/* Show only selected if no current location */}
        {form.geo_lat != null && form.geo_lon != null && !currentLocation && (
          <>
            <Marker position={{ lat: form.geo_lat, lng: form.geo_lon }} icon={markerIcon} />
            <Circle
              center={{ lat: form.geo_lat, lng: form.geo_lon }}
              radius={form.geo_radius_m || 100}
              pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1 }}
            />
          </>
        )}

        {/* Show all allowed locations */}
        {form.allowed_locations.map((loc, idx) => (
          <React.Fragment key={idx}>
            <Marker
              position={{ lat: loc.lat, lng: loc.lon }}
              icon={markerIcon}
              title={loc.name}
            />
            <Circle
              center={{ lat: loc.lat, lng: loc.lon }}
              radius={loc.radius_m}
              pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.1 }}
            />
          </React.Fragment>
        ))}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-blue-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">🔐</span>
          <h2 className="text-3xl font-extrabold text-purple-700 tracking-tight">Request File Access</h2>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {/* File ID */}
          <div>
            <label className="block text-base text-gray-700 mb-1 font-bold">File ID</label>
            <input
              required
              placeholder="Enter file ID"
              value={form.fileId}
              onChange={(e) => setForm({ ...form, fileId: e.target.value })}
              className="w-full p-3 border-2 border-blue-300 focus:border-purple-500 rounded-xl focus:outline-none transition"
            />
          </div>

          {/* Owner Email */}
          <div>
            <label className="block text-base text-gray-700 mb-1 font-bold">Owner Email</label>
            <input
              required
              placeholder="owner@example.com"
              value={form.ownerEmail}
              onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
              className="w-full p-3 border-2 border-blue-300 focus:border-purple-500 rounded-xl focus:outline-none transition"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-base text-gray-700 mb-1 font-bold">Requested Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full p-3 border-2 border-blue-300 focus:border-green-400 rounded-xl focus:outline-none transition"
            >
              <option value="read">🔎 Read Only</option>
              <option value="download">⬇️ Download</option>
              <option value="share">🔗 Share</option>
            </select>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-base text-gray-700 mb-1 font-bold">Expiry (Optional)</label>
            <input
              type="datetime-local"
              value={form.expiry_time}
              onChange={(e) => setForm({ ...form, expiry_time: e.target.value })}
              className="w-full p-3 border-2 border-blue-300 focus:border-purple-400 rounded-xl focus:outline-none transition"
            />
          </div>

          {/* Location-Based Access Section */}
          <div className="pt-4 border-t-2 border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="useLocationRestriction"
                checked={form.is_location_restricted}
                onChange={(e) => setForm({ ...form, is_location_restricted: e.target.checked })}
                className="w-5 h-5 cursor-pointer"
              />
              <label
                htmlFor="useLocationRestriction"
                className="text-lg font-bold text-blue-600 cursor-pointer flex items-center gap-2"
              >
                📍 Request Location-Restricted Access
              </label>
            </div>

            {form.is_location_restricted && (
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
                    Include Multiple Locations
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
                    <LocationPicker />
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
                    value={form.geo_radius_m}
                    onChange={(e) => setForm({ ...form, geo_radius_m: Number(e.target.value) })}
                    className="w-2/3 p-3 border-2 border-blue-300 focus:border-green-400 rounded-xl focus:outline-none transition"
                  />
                  <span className="inline-block self-center text-gray-500 font-semibold">meters</span>
                </div>

                {/* Add Multiple Location Button */}
                {allowMultipleLocations && (
                  <button
                    type="button"
                    onClick={addLocationToList}
                    disabled={form.geo_lat == null || form.geo_lon == null}
                    className="w-full mb-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
                  >
                    + Add Location
                  </button>
                )}

                {/* Display Selected Location Info */}
                {form.geo_lat != null && form.geo_lon != null && (
                  <div className="text-sm text-green-700 mb-2 p-2 bg-green-50 rounded-lg">
                    ✓ Selected: lat {form.geo_lat.toFixed(5)}, lon{' '}
                    {form.geo_lon.toFixed(5)} | Radius: {form.geo_radius_m}m
                  </div>
                )}

                {/* Allowed Locations List */}
                {form.allowed_locations.length > 0 && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
                    <h4 className="font-bold text-green-700 mb-3">📍 Requested Locations ({form.allowed_locations.length})</h4>
                    <div className="space-y-2">
                      {form.allowed_locations.map((loc, idx) => (
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
                              {loc.lat.toFixed(5)}, {loc.lon.toFixed(5)} | Radius: {loc.radius_m}m
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

          {/* Message */}
          <div>
            <label className="block text-base text-gray-700 mb-1 font-bold">Message (Optional)</label>
            <textarea
              placeholder="Explain why you need access..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full min-h-[80px] p-3 border-2 border-blue-300 focus:border-purple-400 rounded-xl focus:outline-none transition"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !form.fileId || !form.ownerEmail}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 focus:bg-blue-800 text-white px-6 py-3 rounded-2xl shadow-lg font-bold text-lg w-full transition"
          >
            {submitting ? '⏳ Sending Request...' : '✅ Send Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default RequestAccess;

