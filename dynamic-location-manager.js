// Dynamic Location Management System for PacksList
// Admin-controlled location configuration with no hardcoded cities

class DynamicLocationManager {
  constructor() {
    this.locations = [];
    this.metroAreas = [];
    this.userLocation = null;
    this.currentMetro = null;
    this.isInitialized = false;
    this.db = null;
    this.locationCallbacks = [];
    
    // Fallback configuration (only used if database is empty)
    this.fallbackConfig = {
      locations: [
        {
          id: 'loc-1',
          name: 'Default City',
          slug: 'default-city',
          coordinates: { lat: 42.3601, lng: -71.0589 },
          isActive: true,
          isDefault: true,
          priority: 1,
          timezone: 'America/New_York'
        }
      ],
      metroAreas: [
        {
          id: 'metro-1',
          name: 'Default Metro Area',
          bounds: { north: 43.0, south: 41.5, east: -70.0, west: -72.0 },
          cities: ['default-city'],
          isActive: true
        }
      ]
    };
  }

  // Initialize location manager
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Wait for database to be ready
      await this.waitForDatabase();
      
      // Load location configuration from Firebase
      await this.loadLocationConfig();
      
      // Load metro areas
      await this.loadMetroAreas();
      
      // Initialize user location detection
      await this.initializeUserLocation();
      
      this.isInitialized = true;
      console.log('DynamicLocationManager: Initialized successfully');
      
      // Notify other systems
      document.dispatchEvent(new CustomEvent('locationsLoaded', {
        detail: { locations: this.locations, metroAreas: this.metroAreas }
      }));
      
    } catch (error) {
      console.error('DynamicLocationManager: Initialization failed:', error);
      this.loadFallbackConfig();
    }
  }

  // Wait for database to be available
  async waitForDatabase() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      if (window.db) {
        this.db = window.db;
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    throw new Error('Database not available after waiting');
  }

  // Load location configuration from Firebase
  async loadLocationConfig() {
    try {
      const locationConfigDoc = await this.db.collection('admin_config').doc('locations').get();
      
      if (locationConfigDoc.exists) {
        const config = locationConfigDoc.data();
        this.locations = config.locations || [];
        console.log('DynamicLocationManager: Loaded', this.locations.length, 'locations');
      } else {
        console.log('DynamicLocationManager: No location config found, creating default');
        await this.createDefaultLocationConfig();
      }
      
      // Sort by priority
      this.locations.sort((a, b) => (a.priority || 999) - (b.priority || 999));
      
    } catch (error) {
      console.error('DynamicLocationManager: Error loading locations:', error);
      this.loadFallbackConfig();
    }
  }

  // Load metro areas from Firebase
  async loadMetroAreas() {
    try {
      const metroConfigDoc = await this.db.collection('admin_config').doc('metro_areas').get();
      
      if (metroConfigDoc.exists) {
        const config = metroConfigDoc.data();
        this.metroAreas = config.metroAreas || [];
      } else {
        console.log('DynamicLocationManager: No metro config found, creating default');
        await this.createDefaultMetroConfig();
      }
      
    } catch (error) {
      console.error('DynamicLocationManager: Error loading metro areas:', error);
      this.metroAreas = this.fallbackConfig.metroAreas;
    }
  }

  // Create default location configuration
  async createDefaultLocationConfig() {
    try {
      await this.db.collection('admin_config').doc('locations').set({
        locations: this.fallbackConfig.locations,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      });
      
      this.locations = this.fallbackConfig.locations;
      console.log('DynamicLocationManager: Created default location config');
      
    } catch (error) {
      console.error('DynamicLocationManager: Error creating default locations:', error);
      this.locations = this.fallbackConfig.locations;
    }
  }

  // Create default metro configuration
  async createDefaultMetroConfig() {
    try {
      await this.db.collection('admin_config').doc('metro_areas').set({
        metroAreas: this.fallbackConfig.metroAreas,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      });
      
      this.metroAreas = this.fallbackConfig.metroAreas;
      console.log('DynamicLocationManager: Created default metro config');
      
    } catch (error) {
      console.error('DynamicLocationManager: Error creating default metro areas:', error);
      this.metroAreas = this.fallbackConfig.metroAreas;
    }
  }

  // Load fallback configuration
  loadFallbackConfig() {
    this.locations = this.fallbackConfig.locations;
    this.metroAreas = this.fallbackConfig.metroAreas;
    console.log('DynamicLocationManager: Using fallback configuration');
  }

  // Initialize user location detection
  async initializeUserLocation() {
    try {
      // Try GPS first
      await this.getUserLocationGPS();
    } catch (error) {
      console.log('DynamicLocationManager: GPS not available, using IP-based detection');
      await this.getUserLocationIP();
    }
    
    // Determine current metro area
    this.determineCurrentMetro();
    
    // Notify callbacks
    this.notifyLocationCallbacks();
  }

  // Get user location via GPS
  async getUserLocationGPS() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: 'gps'
          };
          console.log('DynamicLocationManager: GPS location acquired');
          resolve(this.userLocation);
        },
        (error) => {
          console.log('DynamicLocationManager: GPS error:', error.message);
          reject(error);
        },
        {
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
          enableHighAccuracy: true
        }
      );
    });
  }

  // Get user location via IP (fallback)
  async getUserLocationIP() {
    try {
      // Use a simple IP geolocation service
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        this.userLocation = {
          lat: data.latitude,
          lng: data.longitude,
          city: data.city,
          region: data.region,
          country: data.country,
          source: 'ip'
        };
        console.log('DynamicLocationManager: IP location acquired:', data.city);
      } else {
        throw new Error('IP geolocation failed');
      }
    } catch (error) {
      console.error('DynamicLocationManager: IP location failed:', error);
      // Use default location
      const defaultLocation = this.getDefaultLocation();
      if (defaultLocation) {
        this.userLocation = {
          ...defaultLocation.coordinates,
          source: 'default',
          city: defaultLocation.name
        };
      }
    }
  }

  // Determine current metro area based on user location
  determineCurrentMetro() {
    if (!this.userLocation) return;
    
    // Find metro area that contains user location
    this.currentMetro = this.metroAreas.find(metro => {
      if (!metro.bounds) return false;
      
      const { north, south, east, west } = metro.bounds;
      return (
        this.userLocation.lat >= south &&
        this.userLocation.lat <= north &&
        this.userLocation.lng >= west &&
        this.userLocation.lng <= east
      );
    });
    
    if (this.currentMetro) {
      console.log('DynamicLocationManager: Current metro area:', this.currentMetro.name);
    }
  }

  // Get location display text
  getLocationDisplayText() {
    if (this.currentMetro) {
      return this.currentMetro.name;
    }
    
    if (this.userLocation && this.userLocation.city) {
      return this.userLocation.city;
    }
    
    const defaultLocation = this.getDefaultLocation();
    return defaultLocation ? defaultLocation.name : 'Unknown Location';
  }

  // Get default location
  getDefaultLocation() {
    return this.locations.find(loc => loc.isDefault) || this.locations[0];
  }

  // Get coordinates for a location slug
  getLocationCoordinates(locationSlug) {
    const location = this.locations.find(loc => loc.slug === locationSlug);
    return location ? location.coordinates : this.getDefaultLocation()?.coordinates;
  }

  // Get local vendors based on location
  getLocalVendors(allVendors, options = {}) {
    const defaultOptions = {
      useDistance: true,
      useMetro: true,
      minResults: 5,
      maxDistance: 50 // miles
    };
    
    const opts = { ...defaultOptions, ...options };
    
    if (!this.userLocation || !Array.isArray(allVendors)) {
      return allVendors;
    }
    
    // Add distance calculations to vendors
    const vendorsWithDistance = allVendors.map(vendor => {
      const distance = this.calculateDistance(
        this.userLocation.lat,
        this.userLocation.lng,
        vendor.lat || 0,
        vendor.lng || 0
      );
      
      return {
        ...vendor,
        distance: distance.toFixed(1)
      };
    });
    
    // Filter by metro area if available
    let filteredVendors = vendorsWithDistance;
    
    if (opts.useMetro && this.currentMetro) {
      const metroVendors = vendorsWithDistance.filter(vendor => {
        if (!vendor.city) return false;
        return this.currentMetro.cities.includes(vendor.city) ||
               this.isLocationInMetro(vendor.lat, vendor.lng);
      });
      
      if (metroVendors.length >= opts.minResults) {
        filteredVendors = metroVendors;
      }
    }
    
    // Filter by distance if needed
    if (opts.useDistance && opts.maxDistance) {
      const nearbyVendors = filteredVendors.filter(vendor => 
        parseFloat(vendor.distance) <= opts.maxDistance
      );
      
      if (nearbyVendors.length >= opts.minResults) {
        filteredVendors = nearbyVendors;
      }
    }
    
    // Sort by distance
    filteredVendors.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    
    // Ensure minimum results
    if (filteredVendors.length < opts.minResults) {
      const additionalNeeded = opts.minResults - filteredVendors.length;
      const remainingVendors = vendorsWithDistance
        .filter(v => !filteredVendors.includes(v))
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
        .slice(0, additionalNeeded);
      
      filteredVendors = [...filteredVendors, ...remainingVendors];
    }
    
    return filteredVendors;
  }

  // Check if location is in current metro area
  isLocationInMetro(lat, lng) {
    if (!this.currentMetro || !this.currentMetro.bounds) return false;
    
    const { north, south, east, west } = this.currentMetro.bounds;
    return lat >= south && lat <= north && lng >= west && lng <= east;
  }

  // Calculate distance between two points
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Admin functions for managing locations
  async addLocation(locationData) {
    const newLocation = {
      id: 'loc-' + Date.now(),
      slug: this.createLocationSlug(locationData.name),
      isActive: true,
      priority: this.locations.length + 1,
      ...locationData
    };
    
    this.locations.push(newLocation);
    await this.saveLocationConfig();
    
    return newLocation;
  }

  async updateLocation(locationId, updates) {
    const locationIndex = this.locations.findIndex(l => l.id === locationId);
    if (locationIndex === -1) return false;
    
    // Update slug if name changed
    if (updates.name && updates.name !== this.locations[locationIndex].name) {
      updates.slug = this.createLocationSlug(updates.name);
    }
    
    this.locations[locationIndex] = { ...this.locations[locationIndex], ...updates };
    await this.saveLocationConfig();
    
    return this.locations[locationIndex];
  }

  async removeLocation(locationId) {
    // Don't allow removal of default location
    const location = this.locations.find(l => l.id === locationId);
    if (location && location.isDefault) {
      throw new Error('Cannot remove default location');
    }
    
    this.locations = this.locations.filter(l => l.id !== locationId);
    await this.saveLocationConfig();
    
    return true;
  }

  // Create location slug
  createLocationSlug(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  // Save location configuration
  async saveLocationConfig() {
    try {
      await this.db.collection('admin_config').doc('locations').set({
        locations: this.locations,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      });
      
      console.log('DynamicLocationManager: Location configuration saved');
      
      // Notify systems
      document.dispatchEvent(new CustomEvent('locationsUpdated', {
        detail: { locations: this.locations }
      }));
      
    } catch (error) {
      console.error('DynamicLocationManager: Error saving location config:', error);
      throw error;
    }
  }

  // Location change callbacks
  onLocationChange(callback) {
    this.locationCallbacks.push(callback);
  }

  notifyLocationCallbacks() {
    this.locationCallbacks.forEach(callback => {
      try {
        callback(this.userLocation, this.currentMetro);
      } catch (error) {
        console.error('DynamicLocationManager: Callback error:', error);
      }
    });
  }

  // Get all locations
  getAllLocations() {
    return this.locations;
  }

  // Get active locations
  getActiveLocations() {
    return this.locations.filter(loc => loc.isActive);
  }

  // Search locations
  searchLocations(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.locations.filter(location =>
      location.name.toLowerCase().includes(term) ||
      location.slug.toLowerCase().includes(term)
    );
  }
}

// Global instance
window.dynamicLocationManager = new DynamicLocationManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  setTimeout(async () => {
    if (window.dynamicLocationManager && !window.dynamicLocationManager.isInitialized) {
      await window.dynamicLocationManager.initialize();
    }
  }, 300);
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DynamicLocationManager;
}