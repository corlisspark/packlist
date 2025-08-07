// Map Manager for PacksList
// Handles Google Maps integration, markers, and map-related functionality

class MapManager {
  constructor() {
    this.map = null;
    this.userLocation = null;
    this.markers = [];
    this.highlightedMarkers = [];
    this.isLocationInitialized = false;
    this.isInitialized = false;
    
    // City coordinates mapping
    this.cityCoordinates = {
      'providence': { lat: 41.8240, lng: -71.4128 },
      'woonsocket': { lat: 42.0029, lng: -71.5153 },
      'newport': { lat: 41.4901, lng: -71.3128 },
      'southcoast-ma': { lat: 41.6362, lng: -70.9342 },
      'boston': { lat: 42.3601, lng: -71.0589 },
      'cambridge': { lat: 42.3736, lng: -71.1097 },
      'worcester': { lat: 42.2626, lng: -71.8023 },
      'north-shore-ma': { lat: 42.5584, lng: -70.8648 }
    };
  }

  // Initialize Google Map
  async initialize() {
    if (this.isInitialized) return;

    try {
      if (window.errorHandler) {
        window.errorHandler.debug('Initializing map manager');
      }

      // Wait for Google Maps API to be loaded
      if (typeof google === 'undefined' || !google.maps) {
        await this.waitForGoogleMaps();
      }

      this.createMap();
      await this.initializeLocationAwareness();
      this.setupEventListeners();

      this.isInitialized = true;

      if (window.errorHandler) {
        window.errorHandler.info('Map manager initialized successfully');
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Map Manager Initialization');
      }
    }
  }

  // Wait for Google Maps API to load
  waitForGoogleMaps() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 10 seconds max wait

      const checkGoogleMaps = () => {
        attempts++;
        
        if (typeof google !== 'undefined' && google.maps) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Google Maps API failed to load'));
        } else {
          setTimeout(checkGoogleMaps, 200);
        }
      };

      checkGoogleMaps();
    });
  }

  // Create the Google Map instance
  createMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      throw new Error('Map container not found');
    }

    // Get API key from secure config
    const apiKey = window.secureConfig?.getGoogleMapsApiKey();
    if (!apiKey) {
      if (window.errorHandler) {
        window.errorHandler.warn('Google Maps API key not available');
      }
    }

    // Create map with custom styling
    this.map = new google.maps.Map(mapContainer, {
      zoom: 10,
      center: { lat: 41.8240, lng: -71.4128 }, // Default to Providence
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'transit',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });

    // Initialize map integration system if available
    if (window.mapIntegration) {
      window.mapIntegration.initialize(this.map);
    }

    if (window.errorHandler) {
      window.errorHandler.debug('Google Map created successfully');
    }
  }

  // Initialize location awareness
  async initializeLocationAwareness() {
    try {
      if (window.dynamicLocationManager) {
        await window.dynamicLocationManager.initialize();
        
        // Listen for location changes
        window.dynamicLocationManager.onLocationChange((location) => {
          this.handleLocationChange(location);
        });
      }

      // Try to get user's current location
      await this.getCurrentLocation();

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Location Awareness Initialization');
      }
    }
  }

  // Get user's current location
  getCurrentLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        if (window.errorHandler) {
          window.errorHandler.warn('Geolocation not supported');
        }
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          this.addUserLocationMarker();
          this.isLocationInitialized = true;

          if (window.errorHandler) {
            window.errorHandler.debug('User location obtained', this.userLocation);
          }

          resolve(this.userLocation);
        },
        (error) => {
          if (window.errorHandler) {
            window.errorHandler.warn('Failed to get user location', error);
          }
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  // Handle location change
  handleLocationChange(location) {
    if (location && location.coordinates) {
      this.centerMapOnLocation(location.coordinates);
      this.updateLocationDisplay(location.name);
    }
  }

  // Center map on location
  centerMapOnLocation(coordinates) {
    if (this.map && coordinates) {
      this.map.setCenter(coordinates);
      this.map.setZoom(12);

      if (window.errorHandler) {
        window.errorHandler.debug('Map centered on location', coordinates);
      }
    }
  }

  // Update location display
  updateLocationDisplay(locationText) {
    const indicator = document.getElementById('location-indicator');
    if (indicator && window.domUtils) {
      window.domUtils.setText(indicator, locationText || 'Location Detection');
    }
  }

  // Add user location marker
  addUserLocationMarker() {
    if (!this.map || !this.userLocation) return;

    // Remove existing user location marker
    this.removeUserLocationMarker();

    // Create user location marker
    this.userLocationMarker = new google.maps.Marker({
      position: this.userLocation,
      map: this.map,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      },
      zIndex: 1000
    });

    // Center map on user location
    this.map.setCenter(this.userLocation);
    this.map.setZoom(13);

    if (window.errorHandler) {
      window.errorHandler.debug('User location marker added');
    }
  }

  // Remove user location marker
  removeUserLocationMarker() {
    if (this.userLocationMarker) {
      this.userLocationMarker.setMap(null);
      this.userLocationMarker = null;
    }
  }

  // Update map with vendor markers
  updateMap(vendors = []) {
    try {
      if (!this.map) return;

      // Clear existing markers
      this.clearMarkers();

      // Get vendor styles
      const vendorStyles = this.getVendorStyles();

      // Create markers for each vendor
      vendors.forEach(vendor => {
        this.createVendorMarker(vendor, vendorStyles);
      });

      if (window.errorHandler) {
        window.errorHandler.debug(`Map updated with ${vendors.length} vendor markers`);
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Map Update');
      }
    }
  }

  // Create vendor marker
  createVendorMarker(vendor, vendorStyles) {
    if (!vendor.coordinates || !vendor.coordinates.lat || !vendor.coordinates.lng) {
      return;
    }

    const vendorKey = vendor.vendor ? vendor.vendor.toLowerCase().replace(/\s+/g, '-') : 'other';
    const style = vendorStyles[vendorKey] || vendorStyles['other'];

    // Create custom marker icon
    const markerIcon = this.createCustomMarkerIcon(style.color, style.icon);

    const marker = new google.maps.Marker({
      position: vendor.coordinates,
      map: this.map,
      title: vendor.title || 'Pack',
      icon: markerIcon,
      zIndex: 100
    });

    // Add click listener
    marker.addListener('click', () => {
      this.handleMarkerClick(marker, vendor);
    });

    // Add hover listeners
    marker.addListener('mouseover', () => {
      this.highlightMarker(marker, true);
    });

    marker.addListener('mouseout', () => {
      this.highlightMarker(marker, false);
    });

    // Store marker reference
    marker.vendorData = vendor;
    this.markers.push(marker);

    return marker;
  }

  // Create custom marker icon
  createCustomMarkerIcon(color, icon) {
    const svg = `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="${color}" stroke="#ffffff" stroke-width="3"/>
        <text x="16" y="21" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12" font-weight="bold">${icon}</text>
      </svg>
    `;

    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 16)
    };
  }

  // Handle marker click
  handleMarkerClick(marker, vendor) {
    try {
      // Animate marker
      this.animateMarkerClick(marker);

      // Track interaction
      this.trackVendorInteraction(vendor, 'pin_click');

      // Show vendor modal
      if (window.vendorDisplayManager) {
        window.vendorDisplayManager.showVendorModal(vendor);
      } else {
        // Fallback modal creation
        this.createFallbackModal(vendor);
      }

    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Marker Click Handling');
      }
    }
  }

  // Animate marker click
  animateMarkerClick(marker) {
    if (!marker) return;

    // Bounce animation
    marker.setAnimation(google.maps.Animation.BOUNCE);
    
    setTimeout(() => {
      marker.setAnimation(null);
    }, 1400);

    // Scale animation via icon
    const originalIcon = marker.getIcon();
    const scaledIcon = { ...originalIcon, scaledSize: new google.maps.Size(40, 40) };
    
    marker.setIcon(scaledIcon);
    
    setTimeout(() => {
      marker.setIcon(originalIcon);
    }, 300);
  }

  // Highlight marker
  highlightMarker(marker, highlight) {
    if (!marker) return;

    const vendorData = marker.vendorData;
    if (!vendorData) return;

    const vendorKey = vendorData.vendor ? vendorData.vendor.toLowerCase().replace(/\s+/g, '-') : 'other';
    const vendorStyles = this.getVendorStyles();
    const style = vendorStyles[vendorKey] || vendorStyles['other'];

    if (highlight) {
      // Highlighted state
      const highlightIcon = this.createCustomMarkerIcon(this.lightenColor(style.color, 0.3), style.icon);
      const scaledHighlightIcon = { ...highlightIcon, scaledSize: new google.maps.Size(36, 36) };
      marker.setIcon(scaledHighlightIcon);
      marker.setZIndex(200);
      
      if (!this.highlightedMarkers.includes(marker)) {
        this.highlightedMarkers.push(marker);
      }
    } else {
      // Normal state
      const normalIcon = this.createCustomMarkerIcon(style.color, style.icon);
      marker.setIcon(normalIcon);
      marker.setZIndex(100);
      
      const index = this.highlightedMarkers.indexOf(marker);
      if (index > -1) {
        this.highlightedMarkers.splice(index, 1);
      }
    }
  }

  // Lighten color for highlighting
  lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  // Clear all markers
  clearMarkers() {
    this.markers.forEach(marker => {
      marker.setMap(null);
    });
    this.markers = [];
    this.highlightedMarkers = [];
  }

  // Clear search highlights
  clearSearchHighlights() {
    this.highlightedMarkers.forEach(marker => {
      this.highlightMarker(marker, false);
    });
    this.highlightedMarkers = [];
  }

  // Highlight packs on map
  highlightPacksOnMap(packs) {
    this.clearSearchHighlights();

    if (!packs || packs.length === 0) return;

    packs.forEach(pack => {
      const marker = this.markers.find(m => 
        m.vendorData && m.vendorData.id === pack.id
      );
      
      if (marker) {
        this.highlightMarker(marker, true);
      }
    });

    // Focus on highlighted area if packs found
    if (packs.length > 0) {
      this.focusOnPacks(packs);
    }
  }

  // Focus map on specific packs
  focusOnPacks(packs) {
    if (!packs || packs.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    
    packs.forEach(pack => {
      if (pack.coordinates) {
        bounds.extend(pack.coordinates);
      }
    });

    if (!bounds.isEmpty()) {
      this.map.fitBounds(bounds);
      
      // Ensure minimum zoom level
      const listener = google.maps.event.addListener(this.map, 'idle', () => {
        if (this.map.getZoom() > 15) {
          this.map.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }

  // Focus on city
  focusOnCity(cityData) {
    if (!cityData || !cityData.coordinates) return;

    this.map.setCenter(cityData.coordinates);
    this.map.setZoom(cityData.zoom || 12);

    if (window.errorHandler) {
      window.errorHandler.debug('Map focused on city', cityData);
    }
  }

  // Search current map area
  searchCurrentMapArea() {
    if (!this.map) return [];

    const bounds = this.map.getBounds();
    if (!bounds) return [];

    // Find markers within current view
    const visibleMarkers = this.markers.filter(marker => {
      return bounds.contains(marker.getPosition());
    });

    const visibleVendors = visibleMarkers.map(marker => marker.vendorData).filter(Boolean);

    if (window.errorHandler) {
      window.errorHandler.debug(`Found ${visibleVendors.length} vendors in current map area`);
    }

    return visibleVendors;
  }

  // Get vendor styles
  getVendorStyles() {
    if (window.configManager && window.configManager.isInitialized) {
      const vendorConfig = window.configManager.getConfig('vendor-categories');
      if (vendorConfig && vendorConfig.items) {
        const styles = {};
        vendorConfig.items.forEach(vendor => {
          if (vendor.isActive) {
            styles[vendor.key] = {
              color: vendor.color,
              icon: vendor.icon
            };
          }
        });
        return styles;
      }
    }
    
    // Fallback vendor styles
    return {
      'bozo-headstash': { color: '#8e44ad', icon: 'B' },
      'gumbo': { color: '#e74c3c', icon: 'G' },
      'deep-fried': { color: '#f39c12', icon: 'D' },
      'high-tolerance': { color: '#3498db', icon: 'H' },
      'other': { color: '#95a5a6', icon: 'O' }
    };
  }

  // Track vendor interaction
  trackVendorInteraction(vendor, action) {
    try {
      if (window.behaviorAnalytics) {
        window.behaviorAnalytics.trackInteraction({
          action,
          vendor: vendor.vendor,
          packId: vendor.id,
          location: vendor.location,
          timestamp: Date.now()
        });
      }

      if (window.errorHandler) {
        window.errorHandler.debug(`Vendor interaction tracked: ${action}`, vendor);
      }
    } catch (error) {
      if (window.errorHandler) {
        window.errorHandler.handleError(error, 'Vendor Interaction Tracking');
      }
    }
  }

  // Create fallback modal (if VendorDisplayManager not available)
  createFallbackModal(vendor) {
    if (!vendor) return;

    const modal = document.getElementById('vendor-modal');
    if (!modal) return;

    const modalBody = document.getElementById('modal-body');
    if (!modalBody) return;

    const safeTitle = window.domUtils ? window.domUtils.escapeHTML(vendor.title || 'Pack') : (vendor.title || 'Pack');
    const safeDescription = window.domUtils ? window.domUtils.escapeHTML(vendor.description || 'No description available') : (vendor.description || 'No description available');
    const safeVendor = window.domUtils ? window.domUtils.escapeHTML(vendor.vendor || 'Unknown') : (vendor.vendor || 'Unknown');
    const safeLocation = window.domUtils ? window.domUtils.escapeHTML(vendor.location || 'Location not specified') : (vendor.location || 'Location not specified');

    const modalContent = `
      <div class="vendor-modal-content">
        <h3>${safeTitle}</h3>
        <div class="vendor-info">
          <p><strong>Vendor:</strong> ${safeVendor}</p>
          <p><strong>Price:</strong> $${vendor.price || '0.00'}</p>
          <p><strong>Location:</strong> ${safeLocation}</p>
        </div>
        <div class="vendor-description">
          <p>${safeDescription}</p>
        </div>
        ${vendor.images && vendor.images.length > 0 ? `
          <div class="vendor-images">
            ${vendor.images.map(img => `<img src="${img}" alt="Product image" class="vendor-image">`).join('')}
          </div>
        ` : ''}
        <div class="vendor-actions">
          <button class="btn btn-primary" onclick="mapManager.contactVendor('${vendor.id}')">
            Contact Vendor
          </button>
        </div>
      </div>
    `;

    if (window.domUtils) {
      window.domUtils.setHTML(modalBody, modalContent);
    } else {
      modalBody.innerHTML = modalContent;
    }

    modal.classList.add('active');
  }

  // Contact vendor
  contactVendor(vendorId) {
    // This would integrate with contact system
    if (window.errorHandler) {
      window.errorHandler.info('Contact vendor functionality would be implemented here');
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Location button
    const locationBtn = document.getElementById('location-btn');
    if (locationBtn) {
      locationBtn.addEventListener('click', () => {
        this.getCurrentLocation();
      });
    }

    // Map click to close modals
    if (this.map) {
      this.map.addListener('click', () => {
        this.closeModals();
      });
    }
  }

  // Close modals
  closeModals() {
    const modal = document.getElementById('vendor-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // Get map instance
  getMap() {
    return this.map;
  }

  // Get user location
  getUserLocation() {
    return this.userLocation;
  }

  // Get all markers
  getMarkers() {
    return [...this.markers];
  }

  // Get city coordinates
  getCityCoordinates(cityKey) {
    return this.cityCoordinates[cityKey] || null;
  }

  // Cleanup
  destroy() {
    this.clearMarkers();
    this.removeUserLocationMarker();
    
    if (this.map) {
      // Clear map listeners
      google.maps.event.clearInstanceListeners(this.map);
    }

    this.isInitialized = false;

    if (window.errorHandler) {
      window.errorHandler.debug('Map manager destroyed');
    }
  }
}

// Export for global use
if (typeof window !== 'undefined') {
  window.MapManager = MapManager;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MapManager;
}