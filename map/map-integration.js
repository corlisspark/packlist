// Map Integration System for PacksList
// Handles real-time pack updates, approval pipeline, and admin preview functionality

class MapIntegration {
  constructor() {
    this.map = null;
    this.markers = [];
    this.pendingMarkers = []; // For admin preview
    this.realTimeListeners = [];
    this.isAdminMode = false;
    this.statusFilters = {
      approved: true,
      pending: false,
      rejected: false
    };
    
    // Map update configuration
    this.updateConfig = {
      batchSize: 50,
      updateInterval: 5000, // 5 seconds
      maxRetries: 3,
      cacheTimeout: 30000 // 30 seconds
    };
    
    this.markerCache = new Map();
    this.lastUpdate = null;
  }

  // Initialize map integration
  async initialize(mapInstance) {
    if (!mapInstance) {
      console.error('Map instance required for map integration');
      return false;
    }
    
    this.map = mapInstance;
    this.isAdminMode = window.authManager?.isAdminUser || false;
    
    console.log('Initializing map integration...', { isAdminMode: this.isAdminMode });
    
    // Set up real-time listeners
    this.setupRealTimeListeners();
    
    // Set up admin features if user is admin
    if (this.isAdminMode) {
      this.setupAdminFeatures();
    }
    
    // Load initial data
    await this.loadMapData();
    
    // Set up periodic updates
    this.setupPeriodicUpdates();
    
    console.log('Map integration initialized successfully');
    return true;
  }

  // Set up real-time Firebase listeners
  setupRealTimeListeners() {
    console.log('Setting up real-time listeners...');
    
    // Listen for approved pack changes
    const approvedListener = firebase.firestore()
      .collection('posts')
      .where('status', '==', 'approved')
      .onSnapshot((snapshot) => {
        this.handleApprovedPacksUpdate(snapshot);
      }, (error) => {
        console.error('Error in approved packs listener:', error);
        this.retryListener('approved', error);
      });
    
    this.realTimeListeners.push(approvedListener);
    
    // Admin-only listeners
    if (this.isAdminMode) {
      // Listen for pending packs
      const pendingListener = firebase.firestore()
        .collection('posts')
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
          this.handlePendingPacksUpdate(snapshot);
        }, (error) => {
          console.error('Error in pending packs listener:', error);
          this.retryListener('pending', error);
        });
      
      this.realTimeListeners.push(pendingListener);
      
      // Listen for pack status changes
      const statusChangeListener = firebase.firestore()
        .collection('posts')
        .onSnapshot((snapshot) => {
          this.handlePackStatusChanges(snapshot);
        }, (error) => {
          console.error('Error in status change listener:', error);
          this.retryListener('status', error);
        });
      
      this.realTimeListeners.push(statusChangeListener);
    }
  }

  // Handle approved packs updates
  handleApprovedPacksUpdate(snapshot) {
    console.log('Approved packs update received');
    
    snapshot.docChanges().forEach((change) => {
      const pack = { id: change.doc.id, ...change.doc.data() };
      
      switch (change.type) {
        case 'added':
          this.addPackToMap(pack);
          this.showPackApprovedNotification(pack);
          break;
        case 'modified':
          this.updatePackOnMap(pack);
          break;
        case 'removed':
          this.removePackFromMap(pack.id);
          break;
      }
    });
    
    this.lastUpdate = Date.now();
  }

  // Handle pending packs updates (admin only)
  handlePendingPacksUpdate(snapshot) {
    if (!this.isAdminMode) return;
    
    console.log('Pending packs update received');
    
    snapshot.docChanges().forEach((change) => {
      const pack = { id: change.doc.id, ...change.doc.data() };
      
      switch (change.type) {
        case 'added':
          this.addPendingPackToMap(pack);
          break;
        case 'modified':
          this.updatePendingPackOnMap(pack);
          break;
        case 'removed':
          this.removePendingPackFromMap(pack.id);
          break;
      }
    });
  }

  // Handle pack status changes
  handlePackStatusChanges(snapshot) {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'modified') {
        const pack = { id: change.doc.id, ...change.doc.data() };
        const oldPack = change.doc.metadata.fromCache ? null : change.doc.data();
        
        // Check if status changed
        if (oldPack && oldPack.status !== pack.status) {
          this.handleStatusChange(pack, oldPack.status, pack.status);
        }
      }
    });
  }

  // Handle individual status changes
  handleStatusChange(pack, oldStatus, newStatus) {
    console.log(`Pack ${pack.id} status changed: ${oldStatus} → ${newStatus}`);
    
    // Remove from old status markers
    if (oldStatus === 'approved') {
      this.removePackFromMap(pack.id);
    } else if (oldStatus === 'pending' && this.isAdminMode) {
      this.removePendingPackFromMap(pack.id);
    }
    
    // Add to new status markers
    if (newStatus === 'approved') {
      this.addPackToMap(pack);
      this.triggerMapUpdate(pack.id);
    } else if (newStatus === 'pending' && this.isAdminMode) {
      this.addPendingPackToMap(pack);
    }
    
    // Notify user if it's their pack
    this.notifyPackOwner(pack, newStatus);
  }

  // Add approved pack to map
  addPackToMap(pack) {
    try {
      // Skip if already exists
      if (this.findMarkerById(pack.id)) return;
      
      // Create marker
      const marker = this.createPackMarker(pack, 'approved');
      if (marker) {
        this.markers.push(marker);
        this.markerCache.set(pack.id, { marker, pack, status: 'approved' });
        
        console.log(`Added approved pack to map: ${pack.title}`);
      }
    } catch (error) {
      console.error('Error adding pack to map:', error);
    }
  }

  // Add pending pack to map (admin preview)
  addPendingPackToMap(pack) {
    if (!this.isAdminMode) return;
    
    try {
      // Skip if already exists
      if (this.findPendingMarkerById(pack.id)) return;
      
      // Create marker with pending styling
      const marker = this.createPackMarker(pack, 'pending');
      if (marker) {
        this.pendingMarkers.push(marker);
        this.markerCache.set(`pending_${pack.id}`, { marker, pack, status: 'pending' });
        
        console.log(`Added pending pack to map: ${pack.title}`);
      }
    } catch (error) {
      console.error('Error adding pending pack to map:', error);
    }
  }

  // Create map marker for pack
  createPackMarker(pack, status) {
    if (!this.map || !pack.lat || !pack.lng) return null;
    
    try {
      // Get vendor styling
      const vendorStyles = this.getVendorStyles();
      const vendorStyle = vendorStyles[pack.vendor] || vendorStyles.other;
      
      // Adjust styling based on status
      let markerColor = vendorStyle.color;
      let markerOpacity = 1;
      let markerIcon = vendorStyle.icon;
      
      if (status === 'pending') {
        markerOpacity = 0.7;
        markerIcon = '?'; // Question mark for pending
      }
      
      // Create marker
      const marker = new google.maps.Marker({
        position: { lat: pack.lat, lng: pack.lng },
        map: this.map,
        icon: {
          url: `data:image/svg+xml,${encodeURIComponent(
            `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="${markerColor}" stroke="white" stroke-width="3" opacity="${markerOpacity}"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${markerIcon}</text>
              ${status === 'pending' ? '<text x="16" y="8" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="8">PENDING</text>' : ''}
            </svg>`
          )}`,
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        },
        title: `${pack.title} (${status})`,
        zIndex: status === 'pending' ? 1000 : 100
      });
      
      // Add click listener
      marker.addListener('click', () => {
        if (status === 'pending' && this.isAdminMode) {
          this.showAdminPackPreview(pack);
        } else {
          this.showPackModal(pack);
        }
      });
      
      // Store pack data with marker
      marker.packData = pack;
      marker.packStatus = status;
      
      return marker;
      
    } catch (error) {
      console.error('Error creating pack marker:', error);
      return null;
    }
  }

  // Update existing pack on map
  updatePackOnMap(pack) {
    const existingMarker = this.findMarkerById(pack.id);
    if (existingMarker) {
      // Update marker data
      existingMarker.packData = pack;
      existingMarker.setTitle(`${pack.title} (approved)`);
      
      // Update cache
      this.markerCache.set(pack.id, { 
        marker: existingMarker, 
        pack, 
        status: 'approved' 
      });
      
      console.log(`Updated pack on map: ${pack.title}`);
    }
  }

  // Update pending pack on map
  updatePendingPackOnMap(pack) {
    if (!this.isAdminMode) return;
    
    const existingMarker = this.findPendingMarkerById(pack.id);
    if (existingMarker) {
      existingMarker.packData = pack;
      existingMarker.setTitle(`${pack.title} (pending)`);
      
      this.markerCache.set(`pending_${pack.id}`, { 
        marker: existingMarker, 
        pack, 
        status: 'pending' 
      });
      
      console.log(`Updated pending pack on map: ${pack.title}`);
    }
  }

  // Remove pack from map
  removePackFromMap(packId) {
    const markerIndex = this.markers.findIndex(m => m.packData?.id === packId);
    if (markerIndex > -1) {
      const marker = this.markers[markerIndex];
      marker.setMap(null);
      this.markers.splice(markerIndex, 1);
      this.markerCache.delete(packId);
      
      console.log(`Removed pack from map: ${packId}`);
    }
  }

  // Remove pending pack from map
  removePendingPackFromMap(packId) {
    const markerIndex = this.pendingMarkers.findIndex(m => m.packData?.id === packId);
    if (markerIndex > -1) {
      const marker = this.pendingMarkers[markerIndex];
      marker.setMap(null);
      this.pendingMarkers.splice(markerIndex, 1);
      this.markerCache.delete(`pending_${packId}`);
      
      console.log(`Removed pending pack from map: ${packId}`);
    }
  }

  // Load initial map data
  async loadMapData() {
    try {
      console.log('Loading initial map data...');
      
      // Load approved packs
      const approvedSnapshot = await firebase.firestore()
        .collection('posts')
        .where('status', '==', 'approved')
        .limit(this.updateConfig.batchSize)
        .get();
      
      approvedSnapshot.forEach(doc => {
        const pack = { id: doc.id, ...doc.data() };
        this.addPackToMap(pack);
      });
      
      // Load pending packs for admin
      if (this.isAdminMode) {
        const pendingSnapshot = await firebase.firestore()
          .collection('posts')
          .where('status', '==', 'pending')
          .limit(this.updateConfig.batchSize)
          .get();
        
        pendingSnapshot.forEach(doc => {
          const pack = { id: doc.id, ...doc.data() };
          this.addPendingPackToMap(pack);
        });
      }
      
      console.log(`Loaded ${this.markers.length} approved packs and ${this.pendingMarkers.length} pending packs`);
      
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  }

  // Set up admin features
  setupAdminFeatures() {
    console.log('Setting up admin map features...');
    
    // Add admin controls to map
    this.addAdminMapControls();
    
    // Set up keyboard shortcuts
    this.setupAdminKeyboardShortcuts();
  }

  // Add admin map controls
  addAdminMapControls() {
    const controlDiv = document.createElement('div');
    controlDiv.style.cssText = `
      background: white;
      border: 2px solid #fff;
      border-radius: 3px;
      box-shadow: 0 2px 6px rgba(0,0,0,.3);
      cursor: pointer;
      margin: 10px;
      text-align: center;
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1000;
    `;
    
    const controlUI = document.createElement('div');
    controlUI.style.cssText = `
      color: rgb(25,25,25);
      font-family: Roboto,Arial,sans-serif;
      font-size: 13px;
      line-height: 20px;
      padding: 8px 12px;
    `;
    controlUI.innerHTML = this.statusFilters.pending ? 'Hide Pending' : 'Show Pending';
    controlDiv.appendChild(controlUI);
    
    // Add click handler
    controlUI.addEventListener('click', () => {
      this.togglePendingPacks();
      controlUI.innerHTML = this.statusFilters.pending ? 'Hide Pending' : 'Show Pending';
    });
    
    // Add to map
    this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);
  }

  // Toggle pending pack visibility
  togglePendingPacks() {
    this.statusFilters.pending = !this.statusFilters.pending;
    
    this.pendingMarkers.forEach(marker => {
      marker.setVisible(this.statusFilters.pending);
    });
    
    console.log(`Pending packs ${this.statusFilters.pending ? 'shown' : 'hidden'}`);
  }

  // Set up admin keyboard shortcuts
  setupAdminKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!this.isAdminMode) return;
      
      // Only trigger if no input is focused
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA') return;
      
      switch (e.key) {
        case 'p':
        case 'P':
          this.togglePendingPacks();
          break;
        case 'r':
        case 'R':
          this.refreshMapData();
          break;
      }
    });
  }

  // Show admin pack preview
  showAdminPackPreview(pack) {
    if (!this.isAdminMode) return;
    
    // Create or update admin preview modal
    let modal = document.getElementById('admin-pack-preview');
    if (!modal) {
      modal = this.createAdminPreviewModal();
    }
    
    // Update modal content
    const modalBody = modal.querySelector('.modal-body');
    modalBody.innerHTML = `
      <div class="pack-preview-header">
        <h3>${pack.title}</h3>
        <span class="status-badge pending">⏳ Pending Review</span>
      </div>
      <div class="pack-preview-details">
        <div class="detail-row">
          <label>Price:</label>
          <span>$${pack.price}</span>
        </div>
        <div class="detail-row">
          <label>Location:</label>
          <span>${this.formatLocation(pack.city)}</span>
        </div>
        <div class="detail-row">
          <label>Vendor:</label>
          <span>${pack.vendor}</span>
        </div>
        <div class="detail-row">
          <label>Description:</label>
          <span>${pack.description || 'No description provided'}</span>
        </div>
        <div class="detail-row">
          <label>Submitted:</label>
          <span>${pack.created ? new Date(pack.created.seconds * 1000).toLocaleString() : 'Unknown'}</span>
        </div>
      </div>
      <div class="pack-preview-actions">
        <button class="btn btn-primary" onclick="mapIntegration.approvePackFromPreview('${pack.id}')">
          ✅ Approve
        </button>
        <button class="btn btn-danger" onclick="mapIntegration.rejectPackFromPreview('${pack.id}')">
          ❌ Reject
        </button>
        <button class="btn btn-outline" onclick="mapIntegration.closeAdminPreview()">
          Cancel
        </button>
      </div>
    `;
    
    modal.classList.add('active');
  }

  // Create admin preview modal
  createAdminPreviewModal() {
    const modal = document.createElement('div');
    modal.id = 'admin-pack-preview';
    modal.className = 'admin-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="mapIntegration.closeAdminPreview()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>Pack Preview</h2>
          <button class="modal-close" onclick="mapIntegration.closeAdminPreview()">✕</button>
        </div>
        <div class="modal-body"></div>
      </div>
    `;
    
    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
      .admin-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: none;
        justify-content: center;
        align-items: center;
        background: rgba(0,0,0,0.5);
      }
      .admin-modal.active {
        display: flex;
      }
      .pack-preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      .pack-preview-details {
        margin-bottom: 20px;
      }
      .detail-row {
        display: flex;
        margin-bottom: 8px;
      }
      .detail-row label {
        font-weight: bold;
        width: 100px;
        flex-shrink: 0;
      }
      .pack-preview-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
    return modal;
  }

  // Approve pack from preview
  async approvePackFromPreview(packId) {
    if (window.adminManager) {
      await window.adminManager.approvePack(packId);
      this.closeAdminPreview();
    }
  }

  // Reject pack from preview
  async rejectPackFromPreview(packId) {
    if (window.adminManager) {
      await window.adminManager.rejectPack(packId);
      this.closeAdminPreview();
    }
  }

  // Close admin preview
  closeAdminPreview() {
    const modal = document.getElementById('admin-pack-preview');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // Trigger map update (called after pack approval)
  triggerMapUpdate(packId) {
    console.log(`Triggering map update for pack: ${packId}`);
    
    // Emit custom event for other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('packApproved', {
        detail: { packId, timestamp: Date.now() }
      }));
    }
    
    // Force map refresh
    this.refreshMapData();
  }

  // Refresh map data
  async refreshMapData() {
    console.log('Refreshing map data...');
    
    try {
      // Clear existing markers
      this.clearAllMarkers();
      
      // Reload data
      await this.loadMapData();
      
      console.log('Map data refreshed successfully');
      
    } catch (error) {
      console.error('Error refreshing map data:', error);
    }
  }

  // Set up periodic updates
  setupPeriodicUpdates() {
    setInterval(() => {
      if (Date.now() - this.lastUpdate > this.updateConfig.cacheTimeout) {
        this.refreshMapData();
      }
    }, this.updateConfig.updateInterval);
  }

  // Utility methods
  findMarkerById(packId) {
    return this.markers.find(marker => marker.packData?.id === packId);
  }

  findPendingMarkerById(packId) {
    return this.pendingMarkers.find(marker => marker.packData?.id === packId);
  }

  clearAllMarkers() {
    [...this.markers, ...this.pendingMarkers].forEach(marker => {
      marker.setMap(null);
    });
    this.markers = [];
    this.pendingMarkers = [];
    this.markerCache.clear();
  }

  getVendorStyles() {
    if (window.configManager?.isInitialized) {
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
    
    // Fallback styles
    return {
      'bozo-headstash': { color: '#8e44ad', icon: 'B' },
      'gumbo': { color: '#e74c3c', icon: 'G' },
      'deep-fried': { color: '#f39c12', icon: 'D' },
      'high-tolerance': { color: '#3498db', icon: 'H' },
      'other': { color: '#95a5a6', icon: 'O' }
    };
  }

  formatLocation(city) {
    if (!city) return 'Unknown Location';
    return city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  showPackModal(pack) {
    if (window.showVendorModal) {
      window.showVendorModal(pack);
    }
  }

  showPackApprovedNotification(pack) {
    if (window.authManager) {
      window.authManager.showAuthSuccess(`New pack approved: ${pack.title}`);
    }
  }

  notifyPackOwner(pack, newStatus) {
    // This would be handled by a separate notification system
    console.log(`Pack ${pack.id} status changed to ${newStatus}`);
  }

  retryListener(type, error) {
    console.warn(`Retrying ${type} listener due to error:`, error);
    // Implement retry logic here
  }

  // Cleanup method
  destroy() {
    // Remove all listeners
    this.realTimeListeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    
    // Clear markers
    this.clearAllMarkers();
    
    console.log('Map integration destroyed');
  }
}

// Global instance
window.mapIntegration = new MapIntegration();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MapIntegration;
}