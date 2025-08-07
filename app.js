// Firebase is initialized in firebase-config.js
// Use the global db variable

// Global Variables
let map;
let userLocation = null;
let vendorData = [];
let filteredVendorData = [];
let currentFilter = 'all';
let markers = [];
let highlightedMarkers = [];
let isLocationInitialized = false;
let isSearchActive = false;
let searchSelectedIndex = -1;

// City coordinates mapping
const cityCoordinates = {
  'providence': { lat: 41.8240, lng: -71.4128 },
  'woonsocket': { lat: 42.0029, lng: -71.5153 },
  'newport': { lat: 41.4901, lng: -71.3128 },
  'southcoast-ma': { lat: 41.6362, lng: -70.9342 },
  'boston': { lat: 42.3601, lng: -71.0589 },
  'cambridge': { lat: 42.3736, lng: -71.1097 },
  'worcester': { lat: 42.2626, lng: -71.8023 },
  'north-shore-ma': { lat: 42.5584, lng: -70.8648 }
};

// Get vendor styles from dynamic config
function getVendorStyles() {
  if (window.configManager && window.configManager.isInitialized) {
    const vendorConfig = window.configManager.getConfig('vendor-categories');
    if (vendorConfig.items) {
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

// Initialize Google Map
function initMap() {
  // Initialize all dynamic systems
  initializeDynamicSystems();
  
  // Center on default location (will be updated dynamically)
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 10,
    center: { lat: 41.8240, lng: -71.4128 },
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

  // Initialize map integration system
  if (window.mapIntegration) {
    window.mapIntegration.initialize(map);
  }

  // Load vendor data after map is initialized (legacy support)
  loadVendorData();
  setupEventListeners();
}

// Initialize all dynamic systems
async function initializeDynamicSystems() {
  try {
    console.log('Initializing dynamic systems...');
    
    // Initialize managers in sequence
    await window.configManager.initialize();
    await window.contentManager.initialize();
    
    // Initialize location awareness
    await initializeLocationAwareness();
    
    // Update UI with dynamic content
    updateDynamicContent();
    
    console.log('Dynamic systems initialized successfully');
  } catch (error) {
    console.error('Dynamic systems initialization failed:', error);
    // Continue with fallback behavior
  }
}

// Initialize location awareness
async function initializeLocationAwareness() {
  try {
    await window.locationManager.init();
    updateLocationDisplay();
    
    // Listen for location changes
    window.locationManager.onLocationChange((location, metro) => {
      updateLocationDisplay();
      if (vendorData.length > 0) {
        applyLocationFiltering();
      }
    });
    
    isLocationInitialized = true;
  } catch (error) {
    console.error('Location initialization error:', error);
    updateLocationDisplay('Location unavailable');
  }
}

// Update dynamic content throughout the UI
function updateDynamicContent() {
  try {
    const content = window.contentManager.getCurrentContent();
    
    // Update search placeholder
    const searchInput = document.getElementById('search-input');
    if (searchInput && content.searchPlaceholder) {
      searchInput.placeholder = content.searchPlaceholder;
    }
    
    // Update location indicator
    updateLocationDisplay();
    
    console.log('Dynamic content updated');
  } catch (error) {
    console.error('Failed to update dynamic content:', error);
  }
}

// Update location display in header
function updateLocationDisplay(customText = null) {
  const indicator = document.getElementById('location-indicator');
  if (indicator) {
    if (customText) {
      indicator.textContent = `• ${customText}`;
    } else {
      const locationText = window.locationManager.getLocationDisplayText();
      indicator.textContent = `• ${locationText}`;
    }
  }
}

// Apply location-based filtering to vendor data
function applyLocationFiltering() {
  if (!isLocationInitialized || vendorData.length === 0) {
    filteredVendorData = vendorData;
    updateMap();
    return;
  }
  
  // Get local vendors with smart filtering
  filteredVendorData = window.locationManager.getLocalVendors(vendorData, {
    useDistance: true,
    useMetro: true,
    minResults: 3
  });
  
  // Center map on user location if available
  if (window.locationManager.userLocation && map) {
    map.setCenter(window.locationManager.userLocation);
    map.setZoom(12);
  }
  
  updateMap();
}

// Load vendor data from Firebase
async function loadVendorData() {
  try {
    const snapshot = await window.db.collection("posts").orderBy("created", "desc").get();
    vendorData = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data && data.title && data.price && data.city && data.vendor) {
        // Convert old city format to coordinates
        const coordinates = cityCoordinates[data.city] || { lat: 41.8240, lng: -71.4128 };
        
        // Add some random offset to avoid overlapping markers
        const randomOffset = 0.01;
        const lat = coordinates.lat + (Math.random() - 0.5) * randomOffset;
        const lng = coordinates.lng + (Math.random() - 0.5) * randomOffset;
        
        // Convert Sprinklez to Bozo Headstash
        let vendorName = data.vendor;
        if (vendorName.toLowerCase().includes('sprinklez')) {
          vendorName = 'Bozo Headstash';
        }
        
        vendorData.push({
          id: doc.id,
          ...data,
          vendor: vendorName.toLowerCase().replace(/\s+/g, '-'),
          vendorDisplay: vendorName,
          lat: lat,
          lng: lng,
          rating: Math.random() * 2 + 3, // Random rating between 3-5
          inStock: Math.random() > 0.3, // 70% chance of being in stock
          verified: Math.random() > 0.5 // 50% chance of being verified
        });
      }
    });
    
    // Apply location filtering once data is loaded
    if (isLocationInitialized) {
      applyLocationFiltering();
    } else {
      filteredVendorData = vendorData;
      updateMap();
    }
    
    // Initialize search data
    window.searchManager.initializeSearchData(vendorData);
  } catch (error) {
    console.error("Error loading vendor data:", error);
    showError("Failed to load vendor data");
  }
}

// Display vendor cards (no longer needed for map page)
function displayVendors() {
  // This function is no longer used since vendors are shown on the listings page
}

// Create individual vendor card
function createVendorCard(vendor) {
  const card = document.createElement('div');
  card.className = 'vendor-card';
  card.onclick = () => showVendorModal(vendor);
  
  const vendorStyle = vendorStyles[vendor.vendor] || vendorStyles.other;
  const stockStatus = vendor.inStock ? 'in-stock' : 'low-stock';
  const stockText = vendor.inStock ? '✓ In Stock' : '⚠ Low Stock';
  
  // Add image section if images exist
  const imageSection = vendor.images && vendor.images.length > 0 ? 
    `<div class="vendor-card-images">
      <img src="${vendor.images[0]}" alt="${vendor.title}" class="vendor-main-image">
      ${vendor.images.length > 1 ? `<div class="image-count">+${vendor.images.length - 1}</div>` : ''}
    </div>` : '';

  card.innerHTML = `
    ${imageSection}
    <div class="vendor-card-header">
      <div class="vendor-avatar ${vendor.vendor}" style="background: ${vendorStyle.color}">
        ${vendorStyle.icon}
      </div>
      <div class="vendor-info">
        <h3>${vendor.vendorDisplay || vendor.vendor.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
        <div class="vendor-location">📍 ${vendor.city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
      </div>
    </div>
    <div class="vendor-card-body">
      <div class="vendor-title">${vendor.title}</div>
      <div class="vendor-description">${vendor.description || 'Premium quality product'}</div>
    </div>
    <div class="vendor-card-footer">
      <div class="vendor-price">$${vendor.price}</div>
      <div class="vendor-meta">
        <div class="vendor-rating">⭐ ${vendor.rating.toFixed(1)}</div>
        <div class="vendor-status ${stockStatus}">${stockText}</div>
        ${vendor.verified ? '<div class="vendor-status verified">✓ Verified</div>' : ''}
      </div>
    </div>
  `;
  
  return card;
}

// Update map with vendor markers
function updateMap() {
  // Clear existing markers
  markers.forEach(marker => marker.setMap(null));
  markers = [];
  
  // Apply current filter to location-filtered data
  const filteredVendors = filteredVendorData.filter(vendor => {
    if (currentFilter === 'all') return true;
    return vendor.vendor === currentFilter;
  });
  
  filteredVendors.forEach(vendor => {
    const vendorStyles = getVendorStyles();
    const vendorStyle = vendorStyles[vendor.vendor] || vendorStyles.other;
    
    // Create custom marker
    const marker = new google.maps.Marker({
      position: { lat: vendor.lat, lng: vendor.lng },
      map: map,
      icon: {
        url: `data:image/svg+xml,${encodeURIComponent(
          `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="${vendorStyle.color}" stroke="white" stroke-width="3"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${vendorStyle.icon}</text>
          </svg>`
        )}`,
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16)
      },
      title: vendor.title
    });

    marker.addListener('click', () => showVendorModal(vendor));
    marker.vendorData = vendor; // Store vendor data for search functionality
    markers.push(marker);
  });
}

// Show vendor details modal
function showVendorModal(vendor) {
  const modal = document.getElementById('vendor-modal');
  const modalBody = document.getElementById('modal-body');
  
  const vendorStyle = vendorStyles[vendor.vendor] || vendorStyles.other;
  const stockStatus = vendor.inStock ? 'in-stock' : 'low-stock';
  const stockText = vendor.inStock ? '✓ In Stock' : '⚠ Low Stock';
  
  modalBody.innerHTML = `
    <div class="vendor-card-header">
      <div class="vendor-avatar ${vendor.vendor}" style="background: ${vendorStyle.color}">
        ${vendorStyle.icon}
      </div>
      <div class="vendor-info">
        <h3>${vendor.vendorDisplay || vendor.vendor.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
        <div class="vendor-location">📍 ${vendor.city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
      </div>
    </div>
    <div style="margin: 20px 0;">
      <h4>${vendor.title}</h4>
      <p style="margin: 10px 0; color: #6c757d;">${vendor.description || 'Premium quality product available for delivery.'}</p>
      <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
        <div class="vendor-price" style="font-size: 20px;">$${vendor.price}</div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <div class="vendor-rating">⭐ ${vendor.rating.toFixed(1)}</div>
          <div class="vendor-status ${stockStatus}">${stockText}</div>
          ${vendor.verified ? '<div class="vendor-status verified">✓ Verified</div>' : ''}
        </div>
      </div>
      <button class="message-btn" style="width: 100%; margin-top: 20px;" onclick="contactVendor('${vendor.id}')">
        💬 Message Vendor
      </button>
    </div>
  `;
  
  modal.classList.add('active');
}

// Contact vendor function
function contactVendor(vendorId) {
  alert('Messaging feature coming soon! Contact info for vendor: ' + vendorId);
}

// Add user location marker to map
function addUserLocationMarker() {
  if (window.locationManager.userLocation && map) {
    const userMarker = new google.maps.Marker({
      position: window.locationManager.userLocation,
      map: map,
      icon: {
        url: `data:image/svg+xml,${encodeURIComponent(
          `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8" fill="#007bff" stroke="white" stroke-width="3"/>
          </svg>`
        )}`,
        scaledSize: new google.maps.Size(20, 20),
        anchor: new google.maps.Point(10, 10)
      },
      title: "Your location"
    });
  }
}

// Setup enhanced search functionality
function setupEnhancedSearch() {
  const searchInput = document.getElementById('search-input');
  const searchDropdown = document.getElementById('search-dropdown');
  const searchResults = document.getElementById('search-results');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const searchAreaBtn = document.getElementById('search-area-btn');
  const searchAreaContainer = document.getElementById('search-area-container');
  
  if (!searchInput || !searchDropdown || !searchResults) {
    console.warn('Search elements not found');
    return;
  }
  
  // Search input events
  searchInput.addEventListener('input', function(e) {
    const query = e.target.value.trim();
    
    if (query.length === 0) {
      hideSearchDropdown();
      clearSearchHighlights();
      showSearchClearBtn(false);
      return;
    }
    
    showSearchClearBtn(true);
    window.searchManager.debouncedSearch(query, 300);
  });
  
  // Focus events
  searchInput.addEventListener('focus', function() {
    const query = this.value.trim();
    if (query.length >= 2) {
      window.searchManager.debouncedSearch(query, 100);
    }
  });
  
  // Keyboard navigation
  searchInput.addEventListener('keydown', function(e) {
    const results = document.querySelectorAll('.search-result-item');
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        searchSelectedIndex = Math.min(searchSelectedIndex + 1, results.length - 1);
        updateSearchSelection(results);
        break;
      case 'ArrowUp':
        e.preventDefault();
        searchSelectedIndex = Math.max(searchSelectedIndex - 1, -1);
        updateSearchSelection(results);
        break;
      case 'Enter':
        e.preventDefault();
        if (searchSelectedIndex >= 0 && results[searchSelectedIndex]) {
          results[searchSelectedIndex].click();
        }
        break;
      case 'Escape':
        hideSearchDropdown();
        searchInput.blur();
        break;
    }
  });
  
  // Clear button
  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', function() {
      searchInput.value = '';
      hideSearchDropdown();
      clearSearchHighlights();
      showSearchClearBtn(false);
      window.searchManager.clearSearch();
      searchInput.focus();
    });
  }
  
  // Search area button
  if (searchAreaBtn) {
    searchAreaBtn.addEventListener('click', function() {
      searchCurrentMapArea();
    });
  }
  
  // Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
      hideSearchDropdown();
    }
  });
  
  // Listen for search results
  window.searchManager.onSearchResults((results, query) => {
    displaySearchResults(results, query);
  });
  
  // Map move events for search area button
  if (map) {
    map.addListener('bounds_changed', function() {
      if (isSearchActive) {
        showSearchAreaButton();
      }
    });
  }
}

// Display search results in dropdown
function displaySearchResults(results, query) {
  const searchDropdown = document.getElementById('search-dropdown');
  const searchResults = document.getElementById('search-results');
  
  if (!searchResults) return;
  
  if (results.length === 0) {
    searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
    showSearchDropdown();
    return;
  }
  
  const resultHtml = results.map((result, index) => {
    const icon = getSearchResultIcon(result.type);
    const subtitle = getSearchResultSubtitle(result);
    
    return `
      <div class="search-result-item" data-index="${index}" data-type="${result.type}">
        <div class="search-result-icon">${icon}</div>
        <div class="search-result-content">
          <div class="search-result-title">${highlightSearchTerm(result.display, query)}</div>
          ${subtitle ? `<div class="search-result-subtitle">${subtitle}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  searchResults.innerHTML = resultHtml;
  
  // Add click listeners
  searchResults.querySelectorAll('.search-result-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      selectSearchResult(results[index]);
    });
    
    item.addEventListener('mouseenter', () => {
      searchSelectedIndex = index;
      updateSearchSelection(searchResults.querySelectorAll('.search-result-item'));
    });
  });
  
  showSearchDropdown();
  searchSelectedIndex = -1;
}

// Get icon for search result type
function getSearchResultIcon(type) {
  switch(type) {
    case 'pack': return '📦';
    case 'city': return '📍';
    case 'product': return '🏷️';
    default: return '🔍';
  }
}

// Get subtitle for search result
function getSearchResultSubtitle(result) {
  switch(result.type) {
    case 'pack':
      if (result.data.city) {
        const cityName = result.data.city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `Pack in ${cityName}`;
      }
      return 'Pack';
    case 'city':
      return 'City';
    case 'product':
      return 'Product type';
    default:
      return '';
  }
}

// Highlight search term in result
function highlightSearchTerm(text, term) {
  if (!term) return text;
  const regex = new RegExp(`(${term})`, 'gi');
  return text.replace(regex, '<strong>$1</strong>');
}

// Select a search result
function selectSearchResult(result) {
  const searchInput = document.getElementById('search-input');
  searchInput.value = result.display;
  hideSearchDropdown();
  
  // Handle different result types
  switch(result.type) {
    case 'pack':
      highlightPackOnMap(result.data);
      break;
    case 'city':
      focusOnCity(result.data);
      break;
    case 'product':
      filterByProductType(result.data.type);
      break;
  }
  
  isSearchActive = true;
  showSearchAreaButton();
}

// Highlight specific pack on map
function highlightPackOnMap(packData) {
  clearSearchHighlights();
  
  // Find matching markers
  const matchingMarkers = markers.filter(marker => {
    return marker.vendorData && marker.vendorData.id === packData.id;
  });
  
  if (matchingMarkers.length > 0) {
    const marker = matchingMarkers[0];
    
    // Center map on marker
    map.setCenter(marker.getPosition());
    map.setZoom(15);
    
    // Highlight marker
    highlightedMarkers = matchingMarkers;
    
    // Show info window
    setTimeout(() => {
      showVendorModal(packData);
    }, 500);
  }
}

// Focus on city
function focusOnCity(cityData) {
  clearSearchHighlights();
  
  // Center map on city
  map.setCenter({ lat: cityData.lat, lng: cityData.lng });
  map.setZoom(12);
  
  // Filter packs in this city
  const cityPacks = filteredVendorData.filter(pack => {
    return pack.city === cityData.key;
  });
  
  highlightPacksOnMap(cityPacks);
}

// Filter by product type
function filterByProductType(productType) {
  clearSearchHighlights();
  
  // This would need to be implemented based on how products are categorized
  // For now, we'll highlight all markers
  highlightPacksOnMap(filteredVendorData);
}

// Highlight packs on map
function highlightPacksOnMap(packs) {
  clearSearchHighlights();
  
  packs.forEach(pack => {
    const matchingMarkers = markers.filter(marker => {
      return marker.vendorData && marker.vendorData.id === pack.id;
    });
    
    highlightedMarkers.push(...matchingMarkers);
  });
  
  // Adjust map bounds to show all highlighted markers
  if (highlightedMarkers.length > 0) {
    const bounds = new google.maps.LatLngBounds();
    highlightedMarkers.forEach(marker => {
      bounds.extend(marker.getPosition());
    });
    map.fitBounds(bounds);
  }
}

// Search current map area
function searchCurrentMapArea() {
  const bounds = map.getBounds();
  const visiblePacks = filteredVendorData.filter(pack => {
    const position = new google.maps.LatLng(pack.lat, pack.lng);
    return bounds.contains(position);
  });
  
  highlightPacksOnMap(visiblePacks);
  hideSearchAreaButton();
}

// Clear search highlights
function clearSearchHighlights() {
  highlightedMarkers = [];
  isSearchActive = false;
  hideSearchAreaButton();
}

// UI helper functions
function showSearchDropdown() {
  const dropdown = document.getElementById('search-dropdown');
  if (dropdown) dropdown.style.display = 'block';
}

function hideSearchDropdown() {
  const dropdown = document.getElementById('search-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  searchSelectedIndex = -1;
}

function showSearchClearBtn(show) {
  const btn = document.getElementById('search-clear-btn');
  if (btn) btn.style.display = show ? 'block' : 'none';
}

function showSearchAreaButton() {
  const container = document.getElementById('search-area-container');
  if (container) container.style.display = 'block';
}

function hideSearchAreaButton() {
  const container = document.getElementById('search-area-container');
  if (container) container.style.display = 'none';
}

function updateSearchSelection(items) {
  items.forEach((item, index) => {
    item.classList.toggle('highlighted', index === searchSelectedIndex);
  });
}

// Setup event listeners
function setupEventListeners() {
  setupEnhancedSearch();
  // Filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', function() {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      displayVendors();
      updateMap();
    });
  });
  
  // Search functionality
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const filteredVendors = filteredVendorData.filter(vendor => {
      const matchesSearch = vendor.title.toLowerCase().includes(searchTerm) ||
                           vendor.vendor.toLowerCase().includes(searchTerm) ||
                           vendor.city.toLowerCase().includes(searchTerm);
      const matchesFilter = currentFilter === 'all' || vendor.vendor === currentFilter;
      return matchesSearch && matchesFilter;
    });
    
    displayFilteredVendors(filteredVendors);
  });
  
  // Location button
  document.getElementById('location-btn').addEventListener('click', function() {
    if (window.locationManager.userLocation) {
      map.setCenter(window.locationManager.userLocation);
      map.setZoom(15);
      addUserLocationMarker();
    } else {
      // Try to detect location again
      window.locationManager.detectUserLocation().then(() => {
        if (window.locationManager.userLocation) {
          map.setCenter(window.locationManager.userLocation);
          map.setZoom(15);
          addUserLocationMarker();
          applyLocationFiltering();
        }
      });
    }
  });
  
  // Modal close
  document.getElementById('close-modal').addEventListener('click', function() {
    document.getElementById('vendor-modal').classList.remove('active');
  });
  
  // Close modal on background click
  document.getElementById('vendor-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('active');
    }
  });
}

// Display filtered vendors (for search)
function displayFilteredVendors(vendors) {
  const vendorCards = document.getElementById('vendor-cards');
  vendorCards.innerHTML = '';
  
  if (vendors.length === 0) {
    vendorCards.innerHTML = '<div class="loading">No vendors found</div>';
    return;
  }
  
  vendors.forEach(vendor => {
    const card = createVendorCard(vendor);
    vendorCards.appendChild(card);
  });
  
  // Update map markers for filtered results
  markers.forEach(marker => marker.setMap(null));
  markers = [];
  
  vendors.forEach(vendor => {
    const vendorStyles = getVendorStyles();
    const vendorStyle = vendorStyles[vendor.vendor] || vendorStyles.other;
    
    const marker = new google.maps.Marker({
      position: { lat: vendor.lat, lng: vendor.lng },
      map: map,
      icon: {
        url: `data:image/svg+xml,${encodeURIComponent(
          `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="${vendorStyle.color}" stroke="white" stroke-width="3"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${vendorStyle.icon}</text>
          </svg>`
        )}`,
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16)
      }
    });

    marker.addListener('click', () => showVendorModal(vendor));
    markers.push(marker);
  });
}

// Show error message
function showError(message) {
  const vendorCards = document.getElementById('vendor-cards');
  vendorCards.innerHTML = `<div class="loading" style="color: #dc3545;">${message}</div>`;
}


// Auto-refresh data every 30 seconds
setInterval(loadVendorData, 30000);

// Make initMap globally available for Google Maps callback
window.initMap = initMap;