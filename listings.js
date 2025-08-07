// Use existing Firebase initialization from firebase-config.js
const db = window.db || firebase.firestore();

// Global Variables
let vendorData = [];
let filteredVendorData = [];
let currentFilter = 'all';
let isLocationInitialized = false;

// Vendor styles will be loaded dynamically from VendorManager
let vendorStyles = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
  // Wait for dependencies to be ready
  await waitForDependencies();
  await initializeLocationAwareness();
  loadVendorData();
  setupEventListeners();
});

// Wait for required dependencies
async function waitForDependencies() {
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds max wait
  
  while (attempts < maxAttempts) {
    if (window.db && window.dynamicLocationManager && window.vendorManager) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  console.warn('Some dependencies not ready, proceeding anyway');
  
  // Load vendor styles from vendor manager
  if (window.vendorManager && window.vendorManager.isInitialized) {
    loadVendorStyles();
  }
}

// Load vendor styles from vendor manager
function loadVendorStyles() {
  if (!window.vendorManager) return;
  
  const vendors = window.vendorManager.getActiveVendors();
  vendorStyles = {};
  
  vendors.forEach(vendor => {
    vendorStyles[vendor.slug] = {
      color: vendor.color,
      icon: vendor.icon,
      name: vendor.name
    };
  });
  
  // Add default fallback
  vendorStyles['other'] = { color: '#95a5a6', icon: '?', name: 'Other' };
  
  console.log('Loaded vendor styles:', Object.keys(vendorStyles));
}

// Initialize location awareness
async function initializeLocationAwareness() {
  try {
    if (window.dynamicLocationManager && typeof window.dynamicLocationManager.initialize === 'function') {
      await window.dynamicLocationManager.initialize();
      updateLocationDisplay();
      
      // Listen for location changes
      if (window.dynamicLocationManager.onLocationChange) {
        window.dynamicLocationManager.onLocationChange((location, metro) => {
          updateLocationDisplay();
          if (vendorData.length > 0) {
            applyLocationFiltering();
          }
        });
      }
    }
    
    isLocationInitialized = true;
  } catch (error) {
    console.error('Location initialization error:', error);
    updateLocationDisplay('Location unavailable');
    isLocationInitialized = false;
  }
}

// Update location display in header
function updateLocationDisplay(customText = null) {
  const indicator = document.getElementById('location-indicator');
  if (indicator) {
    if (customText) {
      indicator.textContent = `• ${customText}`;
    } else {
      const locationText = window.dynamicLocationManager ? 
        window.dynamicLocationManager.getLocationDisplayText() : 
        'Location Detection';
      indicator.textContent = `• ${locationText}`;
    }
  }
}

// Apply location-based filtering to vendor data
function applyLocationFiltering() {
  if (!isLocationInitialized || vendorData.length === 0) {
    filteredVendorData = vendorData;
    displayListings();
    return;
  }
  
  // Get local vendors with smart filtering using dynamic location manager
  if (window.dynamicLocationManager && window.dynamicLocationManager.getLocalVendors) {
    filteredVendorData = window.dynamicLocationManager.getLocalVendors(vendorData, {
      useDistance: true,
      useMetro: true,
      minResults: 5
    });
  } else {
    filteredVendorData = vendorData;
  }
  
  displayListings();
}

// Load vendor data from Firebase
async function loadVendorData() {
  console.log('Loading vendor data...');
  try {
    if (!db) {
      console.error('Database not initialized');
      showError("Database connection failed");
      return;
    }
    
    const snapshot = await db.collection("posts").orderBy("created", "desc").get();
    vendorData = [];
    console.log('Firebase query completed, processing docs...');
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data && data.title && data.price && data.city && data.vendor) {
        // Get coordinates from dynamic location manager
        const coordinates = window.dynamicLocationManager ? 
          window.dynamicLocationManager.getLocationCoordinates(data.city) : 
          { lat: 42.3601, lng: -71.0589 }; // Default fallback
        
        // Add some random offset to avoid overlapping markers
        const randomOffset = 0.01;
        const lat = coordinates.lat + (Math.random() - 0.5) * randomOffset;
        const lng = coordinates.lng + (Math.random() - 0.5) * randomOffset;
        
        // Process vendor using vendor manager (removes hardcoded vendor names)
        const processedData = window.vendorManager ? 
          window.vendorManager.processPostVendor(data) : 
          { ...data, vendor: data.vendor, vendorDisplay: data.vendor };
        
        vendorData.push({
          id: doc.id,
          ...processedData,
          lat: lat,
          lng: lng,
          rating: Math.random() * 2 + 3, // Random rating between 3-5
          inStock: Math.random() > 0.3, // 70% chance of being in stock
          verified: Math.random() > 0.5 // 50% chance of being verified
        });
      }
    });
    
    console.log(`Loaded ${vendorData.length} vendor items`);
    
    // Apply location filtering once data is loaded
    if (isLocationInitialized) {
      applyLocationFiltering();
    } else {
      filteredVendorData = vendorData;
      displayListings();
    }
  } catch (error) {
    console.error("Error loading vendor data:", error);
    showError("Failed to load listings");
  }
}

// City coordinates now handled by dynamic location manager

// Display vendor listings
function displayListings() {
  console.log('Displaying listings...');
  const listingsGrid = document.getElementById('listings-grid');
  const listingsCount = document.getElementById('listings-count');
  
  if (!listingsGrid) {
    console.error('listings-grid element not found');
    return;
  }
  
<<<<<<< HEAD
  listingsGrid.innerHTML = '';
=======
  if (window.domUtils) {
    window.domUtils.setHTML(listingsGrid, '');
  } else {
    listingsGrid.innerHTML = '';
  }
>>>>>>> 605a9f9d3e0805a86b49156b380e7edc94f5f91c
  console.log(`Displaying ${filteredVendorData.length} items with filter: ${currentFilter}`);
  
  // Apply current filter to location-filtered data
  const filteredVendors = filteredVendorData.filter(vendor => {
    if (currentFilter === 'all') return true;
    return vendor.vendor === currentFilter;
  });
  
  // Update count with location context
  const count = filteredVendors.length;
  const totalCount = vendorData.length;
  const locationText = window.locationManager ? window.locationManager.getLocationDisplayText() : 'your area';
  
  if (filteredVendorData.length < totalCount) {
    listingsCount.textContent = `${count} of ${filteredVendorData.length} listings near ${locationText}`;
  } else {
    listingsCount.textContent = `${count} listing${count !== 1 ? 's' : ''} found`;
  }
  
  if (filteredVendors.length === 0) {
<<<<<<< HEAD
    listingsGrid.innerHTML = '<div class="loading-state">No listings found in your area</div>';
=======
    const noListingsHTML = '<div class="loading-state">No listings found in your area</div>';
    if (window.domUtils) {
      window.domUtils.setHTML(listingsGrid, noListingsHTML);
    } else {
      listingsGrid.innerHTML = noListingsHTML;
    }
>>>>>>> 605a9f9d3e0805a86b49156b380e7edc94f5f91c
    return;
  }
  
  filteredVendors.forEach(vendor => {
    const card = createVendorCard(vendor);
    listingsGrid.appendChild(card);
  });
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

  // Distance display
  const distanceText = vendor.distance ? `${vendor.distance} mi away` : '';
  
  card.innerHTML = `
    ${imageSection}
    <div class="vendor-card-header">
      <div class="vendor-avatar ${vendor.vendor}" style="background: ${vendorStyle.color}">
        ${vendorStyle.icon}
      </div>
      <div class="vendor-info">
        <h3>${vendor.vendorDisplay || vendor.vendor.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
        <div class="vendor-location">📍 ${vendor.city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} ${distanceText ? '• ' + distanceText : ''}</div>
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

// Setup event listeners
function setupEventListeners() {
  // Filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', function() {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      displayListings();
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
    
    displayFilteredListings(filteredVendors);
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

// Display filtered listings (for search)
function displayFilteredListings(vendors) {
  const listingsGrid = document.getElementById('listings-grid');
  const listingsCount = document.getElementById('listings-count');
<<<<<<< HEAD
  listingsGrid.innerHTML = '';
=======
  if (window.domUtils) {
    window.domUtils.setHTML(listingsGrid, '');
  } else {
    listingsGrid.innerHTML = '';
  }
>>>>>>> 605a9f9d3e0805a86b49156b380e7edc94f5f91c
  
  // Update count
  const count = vendors.length;
  listingsCount.textContent = `${count} listing${count !== 1 ? 's' : ''} found`;
  
  if (vendors.length === 0) {
<<<<<<< HEAD
    listingsGrid.innerHTML = '<div class="loading-state">No listings found</div>';
=======
    const noListingsHTML = '<div class="loading-state">No listings found</div>';
    if (window.domUtils) {
      window.domUtils.setHTML(listingsGrid, noListingsHTML);
    } else {
      listingsGrid.innerHTML = noListingsHTML;
    }
>>>>>>> 605a9f9d3e0805a86b49156b380e7edc94f5f91c
    return;
  }
  
  vendors.forEach(vendor => {
    const card = createVendorCard(vendor);
    listingsGrid.appendChild(card);
  });
}

// Show error message
function showError(message) {
  const listingsGrid = document.getElementById('listings-grid');
<<<<<<< HEAD
  listingsGrid.innerHTML = `<div class="loading-state" style="color: #dc3545;">${message}</div>`;
=======
  const errorHTML = `<div class="loading-state" style="color: #dc3545;">${message}</div>`;
  if (window.domUtils) {
    window.domUtils.setHTML(listingsGrid, errorHTML);
  } else {
    listingsGrid.innerHTML = errorHTML;
  }
>>>>>>> 605a9f9d3e0805a86b49156b380e7edc94f5f91c
}

// Listen for vendor system updates
document.addEventListener('vendorsLoaded', (event) => {
  console.log('Vendors loaded, updating styles and filters');
  loadVendorStyles();
  // Regenerate filter UI will be handled by vendor manager
});

document.addEventListener('vendorFilterChange', (event) => {
  const { filter } = event.detail;
  currentFilter = filter;
  displayListings();
});

// Auto-refresh data every 30 seconds
setInterval(loadVendorData, 30000);