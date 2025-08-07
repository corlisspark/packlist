// Location Utilities for PacksList
// Shared location functions across all pages

// Metro area configurations
const METRO_AREAS = {
  'boston': {
    name: 'Greater Boston',
    center: { lat: 42.3601, lng: -71.0589 },
    radius: 25,
    cities: ['boston', 'cambridge', 'somerville', 'brookline', 'newton'],
    deliveryRadius: 15
  },
  'providence': {
    name: 'Providence Metro',
    center: { lat: 41.8240, lng: -71.4128 },
    radius: 20,
    cities: ['providence', 'cranston', 'warwick', 'pawtucket'],
    deliveryRadius: 12
  },
  'worcester': {
    name: 'Central Mass',
    center: { lat: 42.2626, lng: -71.8023 },
    radius: 20,
    cities: ['worcester', 'shrewsbury', 'auburn'],
    deliveryRadius: 15
  },
  'newport': {
    name: 'Newport County',
    center: { lat: 41.4901, lng: -71.3128 },
    radius: 15,
    cities: ['newport', 'middletown', 'portsmouth'],
    deliveryRadius: 10
  },
  'southcoast-ma': {
    name: 'South Coast',
    center: { lat: 41.6362, lng: -70.9342 },
    radius: 20,
    cities: ['new-bedford', 'fall-river', 'dartmouth'],
    deliveryRadius: 15
  },
  'north-shore-ma': {
    name: 'North Shore',
    center: { lat: 42.5584, lng: -70.8648 },
    radius: 20,
    cities: ['salem', 'lynn', 'peabody', 'beverly'],
    deliveryRadius: 15
  },
  'woonsocket': {
    name: 'Northern RI',
    center: { lat: 42.0029, lng: -71.5153 },
    radius: 15,
    cities: ['woonsocket', 'cumberland'],
    deliveryRadius: 12
  }
};

// Default location for fallback
const DEFAULT_LOCATION = {
  lat: 41.8240,
  lng: -71.4128,
  metro: 'providence'
};

class LocationManager {
  constructor() {
    this.userLocation = null;
    this.userMetro = null;
    this.deliveryRadius = 20; // Default radius in miles
    this.locationCallbacks = [];
  }

  // Calculate distance between two points using Haversine formula
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

  // Detect user's location via GPS
  async detectUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported');
        this.setDefaultLocation();
        resolve(this.userLocation);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.userMetro = this.detectMetroArea(this.userLocation.lat, this.userLocation.lng);
          this.saveLocationToStorage();
          this.notifyLocationChange();
          resolve(this.userLocation);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          this.loadLocationFromStorage() || this.setDefaultLocation();
          resolve(this.userLocation);
        },
        {
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  // Detect which metro area user is in
  detectMetroArea(lat, lng) {
    let closestMetro = 'providence';
    let minDistance = Infinity;

    for (const [key, metro] of Object.entries(METRO_AREAS)) {
      const distance = this.calculateDistance(lat, lng, metro.center.lat, metro.center.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closestMetro = key;
      }
    }

    return closestMetro;
  }

  // Set default location (Providence)
  setDefaultLocation() {
    this.userLocation = DEFAULT_LOCATION;
    this.userMetro = DEFAULT_LOCATION.metro;
    this.notifyLocationChange();
  }

  // Save location to localStorage
  saveLocationToStorage() {
    if (this.userLocation) {
      localStorage.setItem('packslist_location', JSON.stringify({
        location: this.userLocation,
        metro: this.userMetro,
        timestamp: Date.now()
      }));
    }
  }

  // Load location from localStorage
  loadLocationFromStorage() {
    try {
      const stored = localStorage.getItem('packslist_location');
      if (stored) {
        const data = JSON.parse(stored);
        // Check if location is less than 24 hours old
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          this.userLocation = data.location;
          this.userMetro = data.metro;
          this.notifyLocationChange();
          return true;
        }
      }
    } catch (error) {
      console.warn('Error loading location from storage:', error);
    }
    return false;
  }

  // Filter vendors by distance from user
  filterVendorsByDistance(vendors, maxDistance = null) {
    if (!this.userLocation) {
      return vendors;
    }

    const radius = maxDistance || this.getLocalDeliveryRadius();
    
    return vendors.filter(vendor => {
      const distance = this.calculateDistance(
        this.userLocation.lat,
        this.userLocation.lng,
        vendor.lat,
        vendor.lng
      );
      vendor.distance = Math.round(distance * 10) / 10; // Round to 1 decimal
      return distance <= radius;
    }).sort((a, b) => a.distance - b.distance); // Sort by distance
  }

  // Get vendors in user's metro area
  filterVendorsByMetro(vendors) {
    if (!this.userMetro) {
      return vendors;
    }

    const metro = METRO_AREAS[this.userMetro];
    if (!metro) {
      return vendors;
    }

    return vendors.filter(vendor => {
      // Check if vendor's city is in the metro area
      return metro.cities.includes(vendor.city) ||
             // Or check if vendor is within metro radius
             this.calculateDistance(
               metro.center.lat,
               metro.center.lng,
               vendor.lat,
               vendor.lng
             ) <= metro.radius;
    });
  }

  // Get smart filtered vendors (combines distance and metro filtering)
  getLocalVendors(vendors, options = {}) {
    const {
      useDistance = true,
      useMetro = true,
      maxDistance = null,
      minResults = 3
    } = options;

    let filtered = vendors;

    // First try distance-based filtering
    if (useDistance && this.userLocation) {
      filtered = this.filterVendorsByDistance(vendors, maxDistance);
      
      // If too few results, expand radius
      if (filtered.length < minResults) {
        const expandedRadius = (maxDistance || this.deliveryRadius) * 1.5;
        filtered = this.filterVendorsByDistance(vendors, expandedRadius);
      }
    }

    // If still too few results, try metro-based filtering
    if (filtered.length < minResults && useMetro) {
      filtered = this.filterVendorsByMetro(vendors);
    }

    // If still no results, return all vendors
    if (filtered.length === 0) {
      filtered = vendors;
    }

    return filtered;
  }

  // Get delivery radius for current metro
  getLocalDeliveryRadius() {
    if (this.userMetro && METRO_AREAS[this.userMetro]) {
      return METRO_AREAS[this.userMetro].deliveryRadius;
    }
    return this.deliveryRadius;
  }

  // Get user's metro area info
  getUserMetroInfo() {
    if (this.userMetro && METRO_AREAS[this.userMetro]) {
      return METRO_AREAS[this.userMetro];
    }
    return METRO_AREAS['providence']; // Default
  }

  // Get location display text
  getLocationDisplayText() {
    const metro = this.getUserMetroInfo();
    return metro.name;
  }

  // Get suggested cities for posting (based on user location)
  getSuggestedCities() {
    const metro = this.getUserMetroInfo();
    return metro.cities.map(city => ({
      value: city,
      name: city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      distance: this.userLocation ? this.calculateDistance(
        this.userLocation.lat,
        this.userLocation.lng,
        this.getCityCoordinates(city).lat,
        this.getCityCoordinates(city).lng
      ) : 0
    })).sort((a, b) => a.distance - b.distance);
  }

  // Get coordinates for a city
  getCityCoordinates(cityKey) {
    // This would need to be expanded with actual city coordinates
    const cityCoords = {
      'providence': { lat: 41.8240, lng: -71.4128 },
      'boston': { lat: 42.3601, lng: -71.0589 },
      'cambridge': { lat: 42.3736, lng: -71.1097 },
      'worcester': { lat: 42.2626, lng: -71.8023 },
      'newport': { lat: 41.4901, lng: -71.3128 },
      'woonsocket': { lat: 42.0029, lng: -71.5153 },
      'southcoast-ma': { lat: 41.6362, lng: -70.9342 },
      'north-shore-ma': { lat: 42.5584, lng: -70.8648 }
    };
    return cityCoords[cityKey] || DEFAULT_LOCATION;
  }

  // Add callback for location changes
  onLocationChange(callback) {
    this.locationCallbacks.push(callback);
  }

  // Notify all callbacks of location change
  notifyLocationChange() {
    this.locationCallbacks.forEach(callback => {
      try {
        callback(this.userLocation, this.userMetro);
      } catch (error) {
        console.error('Location callback error:', error);
      }
    });
  }

  // Initialize location manager
  async init() {
    // Try to load from storage first
    if (!this.loadLocationFromStorage()) {
      // If no stored location, detect current location
      await this.detectUserLocation();
    }
    return this.userLocation;
  }
}

// Global instance
window.locationManager = new LocationManager();

// Utility functions for backward compatibility
window.calculateDistance = (lat1, lng1, lat2, lng2) => {
  return window.locationManager.calculateDistance(lat1, lng1, lat2, lng2);
};

window.getLocalVendors = (vendors, options) => {
  return window.locationManager.getLocalVendors(vendors, options);
};